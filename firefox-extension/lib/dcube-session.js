/*jslint
onevar: true,
undef: true,
nomen: true,
eqeqeq: true,
plusplus: true,
bitwise: true,
regexp: true,
immed: true,
strict: true,
laxbreak: true
*/

/*global
Components: false
*/

"use strict";

dump(' ... dcube-session.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , util = require('util')
  , events = require('events')
  , JSONRequest = require('jsonrequest')
  , logging = require('logging')
  , crypto = require('hashlib')

  , log = logging.get('DCube_Session')

  , DCubeSessionError = require('errors')
                          .ErrorConstructor(
                              'DCubeSessionError', 'dcube-session')

  , Session, ChallengedSession

    // Cache of open user sesssions.
  , open_sessions = {}
  ;

function normalize_response(response) {
  response = util.confirmObject(response);
  response.head = util.confirmObject(response.head);

  return {
    head: {
      authorization: response.head.authorization || [],
      status: response.head.status || 0
    },
    body: ((response.body && typeof response.body === 'object') ?
      response.body : null)
  };
}

/**
 * spec:
 *  - timeout = 10000
 *  - url = "" 
 *  - method "get"
 *  - [username]
 *  - [cnonce && response]
 *  - body
 *
 * throws:
 *  - RequestError: bad url
 *
 * callback exceptions:
 *  - RequestError: bad response
 *  - RequestError: not ok
 *  - RequestError: no response 
 */
exports.request = function (spec, callback, errback) {
  spec = spec || {};

  var timeout = spec.timeout || 10000
    , payload = {
        head:{
          method: spec.method || 'get'
        }
    }
    ;

  if (spec.username) {
    payload.head.authorization = [spec.username];
  }
  if (payload.head.authorization && spec.cnonce && spec.response) {
    payload.head.authorization = payload
                                   .head
                                   .authorization
                                   .concat([spec.cnonce, spec.response]);
  }

  if (spec.body) {
    payload.body = spec.body;
  }

  try {
    JSONRequest.post(spec.url, payload, function (id, response, ex) {
      if (response) {
        log.trace('Got JSONRequest response.');
        callback(normalize_response(response));
        return;
      }
      log.debug(logging.formatError(ex));
      log.debug('URL: '+ spec.url +', username: '+ spec.username);
      errback(DCubeSessionError(new Error('request failed')));
    }, timeout);
  } catch (e) {
    log.debug(logging.formatError(e));
    log.debug('URL: '+ spec.url +', username: '+ spec.username);
    errback(DCubeSessionError(new Error('invalid request')));
  }
};

var SHA1 = function (target) {
	var uc = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
			createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
		hasher = Components.classes["@mozilla.org/security/hash;1"].
			 createInstance(Components.interfaces.nsICryptoHash),
		data, hash;

	uc.charset = "UTF-8";
	data = uc.convertToByteArray(target, {});
	hasher.init(hasher.SHA1);
	hasher.update(data, data.length);
	hash = hasher.finish(false);

	function toHexString(charCode) {
		return ("0" + charCode.toString(16)).slice(-2);
	}

	// Should not be using JavaScript array comprehensions.
	//return [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");

	return Array.prototype
		.map.call(hash, function (x){ return x.charCodeAt(0); })
		.map(toHexString)
		.join("");
};

Session = function(username) {
  if (!(this instanceof Session)) {
    return new Session(username);
  }
  this.username = username;
};

Session.prototype = {};
Session.prototype.username = '';
Session.prototype.nonce = '';
Session.prototype.nextnonce = '';

Session.prototype.stack = [];
Session.prototype.blocked = false;

Session.prototype.cnonce = function (passkey) {
  return crypto.sha1(crypto.sha1(passkey +''+ this.nextnonce));
};

Session.prototype.response = function (passkey) {
  return crypto.sha1(passkey +''+ this.nonce);
};

Session.prototype.request = function (spec, callback, errback, done) {
  var self = this;

  spec.username = this.username;
  if (this.nonce && this.nextnonce) {
    spec.cnonce = this.cnonce(spec.passkey);
    spec.response = this.response(spec.passkey);
  }

  dump('--->>> ! Request using passkey: '+ spec.passkey +'\n');
  dump('--->>> ! Request nonce: '+ this.nonce +'\n');
  dump('--->>> ! Request nextnonce: '+ this.nextnonce +'\n');

  exports.request(spec, function (response) {
    var nonce = response.head.authorization[1]
      , nextnonce = response.head.authorization[2]
      ;

    log.debug('Got response for "'+ self.username +'" user session.');
    log.debug(logging.inspect('response', response));

    if (nonce && nextnonce) {
      self.nonce = nonce;
      self.nextnonce = nextnonce;
    }

    done();
    events.enqueue(function () {
      callback(response.head.status, response.body);
    }, 0);
  },
  function (ex) {
    done();
    events.enqueue(function () {
      errback(ex);
    }, 0);
  });
  log.debug('Made request with "'+ this.username +'" user session.');
};

Session.prototype.transaction = function () {
  var self = this
    , committed = false
    , stack = [], blocked = false
    , done, next
    ;

  next = function(spec, callback, errback) {
    var req;
    if (stack.length && !blocked) {
      blocked = true;
      req = stack.shift();
      events.enqueue(function () {
        self.request(req[0], req[1], req[2], done);
      }, 0);
    }
  };

  done = function() {
    blocked = false;
    next();
  };

  return function (spec, callback, errback) {
    if (committed) {
      log.debug('This session transaction for "'+
          self.username +'" is already committed.');
      throw 'This session transaction already committed.';
    }

    if (spec && typeof spec === 'object') {
      if (!blocked) {
        events.enqueue(function () {
          self.request(spec, callback, errback, done);
        }, 0);
        return;
      }
      stack.push([spec, callback, errback]);
      log.trace('Pushed request stack for user "'+
                self.username +'". length: '+ stack.length);
      return;
    }
    committed = true;
    log.trace('Made commit on "'+ self.username +'" user session.');
    self.done();
    return;
  };
};

Session.prototype.next = function (fn) {
  if (typeof fn === 'function') {
    this.stack.push(fn);
    log.trace('Pushed session stack for user "'+
              this.username +'". length: '+ this.stack.length);
  }
  if (this.stack.length && !this.blocked) {
    this.blocked = true;
    this.stack.shift()(this.transaction());
  }
};

Session.prototype.done = function () {
  log.trace('Finished session transaction for user "'+
            this.username +'". length: '+ this.stack.length);
  var self = this;
  events.enqueue(function () {
    self.blocked = false;
    self.next();
  }, 0);
};

// Open a new user session transaction for making HTTP DCube request to an
// authenticated DCube server.
//
// Returns a new session transaction function to the given callback function
// which accepts the following parameters:
//   * `spec` {object} Request options object.
//     * `spec.timeout` {integer} Request time limit in milliseconds.
//     * `spec.url` {string} The URL for the request.
//     * `spec.method` {string} DCube method 'get', 'put', or 'delete'
//     * `spec.body` {object} The body of the DCube request.
//   * `callback` {function} If the request succeeds the callback function will
//     be invoked with two parameters: The response status {integer} and
//     response body {object}.
//   * `errback` {function} If the request fails the errback function will be
//     invoked with one parameter: The request error.
exports.Transaction = function Transaction(username, callback) {
  if (!open_sessions[username]) {
    log.trace('Creating new user session for "'+ username +'".');
    if (!username || typeof username !== 'string') {
      throw 'Username string required for a user session.';
    }
    open_sessions[username] = Session(username);
  }
  open_sessions[username].next(callback);
};

function load(cb) {
  require.ensure(['logging', 'jsonrequest'], function (require) {
    cb('dcube-session', exports);
  });
}

