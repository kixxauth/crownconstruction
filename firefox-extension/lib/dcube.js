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

dump(' ... dcube.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , util = require('util')
  , has = util.has
  , isArray = util.isArray
  , events = require('events')
  , session = require('dcube-session')
  , logging = require('logging')
  , Promise = events.Promise

  , log = logging.get('DCube')

  , domain = 'http://localhost'

  , set_domain = function (val) {
      if (val && typeof val === 'string') {
        domain = val.replace(/\/+$/, '');
      }
      log.info('Set domain to "'+ domain +'".');
    }

  , blocking

  , DCubeError = require('errors')
                   .ErrorConstructor('DCubeError', 'dcube')

    // Cache of open user sessions.
  , open_users = {}
  ;

function InsideQuery(query) {
  if (!(this instanceof InsideQuery)) {
    return new InsideQuery(query);
  }
  this.query = query;
  this.stmts = [];
}

InsideQuery.prototype = {};

InsideQuery.prototype.eq = function (a, b) {
  log.trace('Query object query.eq() method called ('+ [a, b] +')');
  if (typeof a !== 'string' && typeof a !== 'number') {
    throw 'A property name in a query must be a string or number.';
  }
  if (typeof b !== 'string' && typeof b !== 'number') {
    throw 'A property value in a query must be a string or number.';
  }
  this.stmts.push([a,'=',b]);
  return this;
};

InsideQuery.prototype.gt = function (a, b) {
  log.trace('Query object query.gt() method called ('+ [a, b] +')');
  if (typeof a !== 'string' && typeof a !== 'number') {
    throw 'A property name in a query must be a string or number.';
  }
  if (typeof b !== 'string' && typeof b !== 'number') {
    throw 'A property value in a query must be a string or number.';
  }
  this.push([a,'>',b]);
  return this;
};

InsideQuery.prototype.lt = function (a, b) {
  log.trace('Query object query.lt() method called ('+ [a, b] +')');
  if (typeof a !== 'string' && typeof a !== 'number') {
    throw 'A property name in a query must be a string or number.';
  }
  if (typeof b !== 'string' && typeof b !== 'number') {
    throw 'A property value in a query must be a string or number.';
  }
  this.stmts.push([a,'<',b]);
  return this;
};

InsideQuery.prototype.range = function (a, b) {
  log.trace('Query object query.range() method called ('+ [a, b] +')');
  if (typeof a !== 'string' && typeof a !== 'number') {
    throw 'A property name in a query must be a string or number.';
  }
  if (typeof b !== 'string' && typeof b !== 'number') {
    throw 'A property value in a query must be a string or number.';
  }
  this.stmts.push([a,'<=>',b]);
  return this;
};

InsideQuery.prototype.append = function () {
  this.query.q.push({action: 'query', statements: this.stmts});
  return this.query;
};

function Query() {
  if (!(this instanceof Query)) {
    return new Query();
  }
}

Query.prototype = {};
Query.prototype.q = [];

Query.prototype.get = function (key) {
  log.trace('Query object .get() method called on '+ key);
  this.q.push({action: 'get', statements: [['key', '=', key]]});
  return this;
};

Query.prototype.put = function (key, entity, indexes) {
  log.trace('Query object .put() method called on '+ key);
  if (typeof key !== 'string') {
    throw '`key` parameter must be a string.';
  }

  entity = JSON.stringify(entity);
  indexes = util.confirmObject(indexes);

	var stmts = [['key', '=', key], ['entity', '=', entity]]
    , idx, index, isarr, i, len
    , index_check = /\W+/
    ;

	for (idx in indexes) {
    if (has(indexes, idx)) {
      if (!idx || typeof idx !== 'string' || index_check.test(idx)) {
        throw 'Index names must only contain word characters.';
      }

      index = indexes[idx];
      isarr = isArray(index);

      if (!isarr && typeof index !== 'string' && typeof index !== 'number') {
        throw 'Indexes must be strings, numbers, or arrays.';
      }
      if (isarr) {
        len = index.length;
        for (i = 0; i < len; i += 1) {
          if (typeof index[i] !== 'string' && typeof index[i] !== 'number') {
            throw 'Index items must be strings or numbers.';
          }
        }
      }
			stmts.push([idx, '=', index]);
    }
  }
  this.q.push({action: 'put', statements: stmts});
  return this;
};

Query.prototype.remove = function (key) {
  log.trace('Query object .remove() method called on '+ key);
  if (typeof key !== 'string') {
    throw '`key` parameter must be a string.';
  }
	this.q.push({action: 'delete', statements: [['key', '=', key]]});
  return this;
};

Query.prototype.query = InsideQuery;

Query.prototype.resolve = function () {
  log.trace('Query object .resolve() method called.');
  return this.q;
};

exports.Query = Query;

exports.userExists = function (username) {
  log.trace('userExists() function called.');
	return Promise(function (fulfill, except, progress) {
    var err;
		try {
			session.request({
					timeout: 7000
				, url: domain +'/users/'+ username
				},
				function (response) {
          var nonce, nextnonce;

					if (response.head.status === 200 ||
							response.head.status === 401) {
            nonce = response.head.authorization[1];
            nextnonce = response.head.authorization[2];
						fulfill(nonce, nextnonce);
					}
					else if (response.head.status === 404) {
						fulfill(false);
					}
					else {
            err = ".userExists(); Received response status: "+
							response.head.status;
						log.debug(logging.formatError(err));
						except(DCubeError(new Error(err)));
					}
				},
				function (exception) {
          err = ".userExists(); "+ exception;
					log.debug(logging.formatError(err));
					except(DCubeError(new Error(err)));
				});
		} catch (e) {
			log.debug(logging.formatError(e));
			except(DCubeError(new Error('.userExists(); '+ e)));
		}
	});
};

function session_request(transaction, spec, cb) {
  spec.timeout = 7000;
  try {
    transaction(spec, cb, function (ex) {
      log.debug(logging.formatError(ex));
      transaction.except(DCubeError(new Error('Request error.')));
      transaction();
      log.trace('session_request() closed transaction.');
    });
  } catch (e) {
    log.debug(logging.formatError(e));
    transaction.except(DCubeError(new Error('Request error.')));
    transaction();
    log.trace('session_request() closed transaction in catch block.');
  }
}

function ChallengedUser(user) {
  user.get = ChallengedUser.get;
  user.update = ChallengedUser.update;
  user.query = ChallengedUser.query;
  user.remove = ChallengedUser.remove;
  user.createDatabase = ChallengedUser.createDatabase;
  user.removeDatabase = ChallengedUser.removeDatabase;
  user.updateDatabase = ChallengedUser.updateDatabase;
  user.getDatabase = ChallengedUser.getDatabase;
  log.trace('ChallengedUser created.');
}

ChallengedUser.request = function(transaction, spec, cb) {
  log.trace('ChallengedUser.request() called.');
  session_request(transaction, spec, function (status, response) {
    transaction();
    log.trace('ChallengedUser.request() closed transaction.');
    if (status === 401) {
      log.trace('Authentication denied in ChallengedUser.request().');
      transaction.except('Authentication denied.');
      return;
    }
    cb(status, response);
  });
};

ChallengedUser.get = function (transaction, passkey, target) {
  log.trace('ChallengedUser.get() called.');
  ChallengedUser.request(
      transaction
    , {url: domain +'/users/'+ target, passkey: passkey}
    , function (status, response) {
        log.trace('ChallengedUser.get() response status: '+ status +'.');
        transaction.fulfill(response);
      }
    );
};

ChallengedUser.update = function (transaction, passkey, target, user) {
  log.trace('ChallengedUser.update() called.');
  ChallengedUser.request(
      transaction
    , {
        url: domain +'/users/'+ target
      , passkey: passkey
      , method: 'put'
      , body: user
      }

    , function (status, response) {
        log.trace('ChallengedUser.update() response status: '+ status +'.');
        transaction.fulfill(response);
      }
    );
};

ChallengedUser.query = function (transaction, passkey, dbname, query) {
  log.trace('ChallengedUser.query() called.');
  var spec = {
      url: domain +'/databases/'+ dbname
    , passkey: passkey
    , method: 'query'
    };

  if (query.constructor === Query) {
    spec.body = query.resolve();
  }
  else if (isArray(query)) {
    spec.body = query;
  }
  else {
    spec.body = [];
  }

  ChallengedUser.request(transaction, spec, function (status, response) {
    log.trace('ChallengedUser.query() response status: '+ status +'.');
    if (status === 404) {
      transaction.except('Database could not be found.');
      return;
    }
    if (status === 403) {
      transaction.except('Database is restricted.');
      return;
    }
    transaction.fulfill(response);
  });
};

ChallengedUser.remove = function (transaction, passkey) {
  log.trace('ChallengedUser.remove() called.');
  ChallengedUser.request(
      transaction
    , {
        url: domain +'/users/'+ this.username
      , passkey: passkey
      , method: 'delete'
      }

    , function (status, response) {
        log.trace('ChallengedUser.remove() response status: '+ status +'.');
        transaction.fulfill();
      }
    );
};

ChallengedUser.createDatabase = function (transaction, passkey, dbname) {
  log.trace('ChallengedUser.createDatabase() called.');
  var spec = {
      url: domain +'/databases/'+ dbname
    , passkey: passkey
    , method: 'put'
    };

  ChallengedUser.request(transaction, spec, function (status, response) {
    log.trace('ChallengedUser.createDatabase() response status: '+
      status +'.');
    if (status === 400) {
      transaction.except('Database already exists.');
      return;
    }
    if (status === 403) {
      transaction.except('User is restricted.');
      return;
    }
    transaction.fulfill(response);
  });
};

ChallengedUser.removeDatabase = function (transaction, passkey, dbname) {
  log.trace('ChallengedUser.removeDatabase() called.');
  ChallengedUser.request(
      transaction
    , {
        url: domain +'/databases/'+ dbname
      , passkey: passkey
      , method: 'delete'
      }

    , function (status, response) {
        log.trace('ChallengedUser.removeDatabase() response status: '+
          status +'.');
        if (status === 404) {
          transaction.except('Database not found.');
          return;
        }
        if (status === 403) {
          transaction.except('User is restricted.');
          return;
        }
        transaction.fulfill();
      }
    );
};

ChallengedUser.updateDatabase = function (transaction, passkey, dbname, db) {
  log.trace('ChallengedUser.updateDatabase() called.');
  ChallengedUser.request(
      transaction
    , {
        url: domain +'/databases/'+ dbname
      , passkey: passkey
      , method: 'put'
      , body: db
      }

    , function (status, response) {
        log.trace('ChallengedUser.updateDatabase() response status: '+
          status +'.');
        if (status === 400) {
          transaction.except('Invalid database update.');
          return;
        }
        if (status === 403) {
          transaction.except('User is restricted.');
          return;
        }
        transaction.fulfill(response);
      }
    );
};

ChallengedUser.getDatabase = function (transaction, passkey, dbname) {
  log.trace('ChallengedUser.getDatabase() called.');
  ChallengedUser.request(
      transaction
    , {url: domain +'/databases/'+ dbname, passkey: passkey}
    , function (status, response) {
        log.trace('ChallengedUser.getDatabase() response status: '+
          status +'.');
        transaction.fulfill(response);
      }
    );
};

function ping_user_method(name) {
  return function () {
    log.trace('InitUser.'+ name +'() called.');
    var self = this
      , args = Array.prototype.slice.call(arguments)
      , transaction = args[0]
      ;

    session_request(
        transaction
      , {url: domain +'/users/'+ this.username}
      , function (status, response) {
          log.trace('ping_user_method() response status: '+ status +'.');
          if (response) {
            ChallengedUser(self);
            self[name].apply(self, args);
            return;
          }
          transaction.except('User does not exist.');
          transaction();
          log.trace('ping_user_method('+ name +') closed transaction.');
        }
      );
  };
}

function InitUser(username) {
  if (!(this instanceof InitUser)) {
    return new InitUser(username);
  }
  this.username = username;
}

InitUser.prototype = {};
InitUser.prototype.username = '';

// `transaction` {function} Transaction function object.
// `target` {string} Username to get.
InitUser.prototype.get = ping_user_method('get');

// `transaction` {function} Transaction function object.
// `target` {string} Username to update.
// `user` {object} User object containing updates.
InitUser.prototype.update = ping_user_method('update');

// `transaction` {function} Transaction function object.
// `dbname` {string} Database name to query.
// `query` {Query} Optional query object.
InitUser.prototype.query = ping_user_method('query');

// `transaction` {function} Transaction function object.
InitUser.prototype.remove = ping_user_method('remove');

// `transaction` {function} Transaction function object.
// `dbname` {string} The name of the database to create.
InitUser.prototype.createDatabase = ping_user_method('createDatabase');

// `transaction` {function} Transaction function object.
// `dbname` {string} The name of the database to remove.
InitUser.prototype.removeDatabase = ping_user_method('removeDatabase');

// `transaction` {function} Transaction function object.
// `dbname` {string} The name of the database to remove.
// `db` {object} The database object containing the updates.
InitUser.prototype.updateDatabase = ping_user_method('updateDatabase');

// `transaction` {function} Transaction function object.
// `dbname` {string} The name of the database to get.
InitUser.prototype.getDatabase = ping_user_method('getDatabase');

function User(username) {
  var user = InitUser(username);
  return function (op) {
    log.trace('Requesting operation "'+ op +
        '" for username "'+ username +'".');
    if (typeof user[op] !== 'function') {
      throw '"'+ op +'" is an invalid operation.';
    }

    var args = Array.prototype.slice.call(arguments, 1);

    return Promise(function (f, e, p) {
      session.Transaction(username, function (txn) {
        log.trace('Got session.Transaction for username "'+ username +'".');
        txn.fulfill = f;
        txn.except = e;
        txn.progress = p;
        args = [txn].concat(args);
        user[op].apply(user, args);
      });
    });
  };
}

blocking = {
    stack: []
  , locked: false

  , done: function () {
      events.enqueue(function () {
        blocking.locked = false;
        blocking.next();
      }, 0);
    }

  , next: function (cc, args, binding) {
      var cont;

      if (typeof cc === 'function') {
        args = args || [];
        args.unshift(blocking.done);
        blocking.stack.push({cc: cc, args: args, binding: binding});
      }

      if (blocking.stack.length && !blocking.locked) {
        blocking.locked = true;
        cont = blocking.stack.shift();
        cont.cc.apply(cont.binding, cont.args);
      }
    }
};

exports.User = function (username, callback) {
  blocking.next(function (done) {
    if (open_users[username]) {
      done();
      callback(open_users[username]);
      return;
    }

    log.trace('Creating new user for "'+ username +'".');
    if (!username || typeof username !== 'string') {
      throw new Error('Username string required for a user object.');
    }

    open_users[username] = User(username);
    done();
    callback(open_users[username]);
  });
};

function load(cb) {
  require.ensure(['platform', 'logging', 'dcube-session'], function (require) {
    var platform = require('platform');

    try {
      platform.pref('dcube_domain', function (pref) {
        set_domain(pref.value());
        pref.addListener(function () {
          set_domain(this.value());
        });

        cb('dcube', exports);
      }, 'http://localhost');
    }
    catch (e) {
      events.trigger('error', e);
      events.trigger('error',
                     Error('Unable to read DCube preferences.'));
      cb('dcube', exports);
    }
  });
}

