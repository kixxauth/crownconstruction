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

dump(' ... memcache.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , events = require('events')
  , logging = require('logging')
  , log = logging.get('Memcache')
  , blockers = {}
  , cache = {}
  ;

function Blocker() {
  if (!(this instanceof Blocker)) {
    return new Blocker();
  }
  this.stack = [];
  this.locked = false;
}

Blocker.prototype = {};

Blocker.prototype.done = function () {
  var self = this;
  events.enqueue(function () {
    self.locked = false;
    self.next();
  }, 0);
};

Blocker.prototype.next = function (cc, args, binding) {
  var cont, self = this;

  if (typeof cc === 'function') {
    args = args || [];
    args.unshift(function () { self.done(); });
    this.stack.push({cc: cc, args: args, binding: binding});
  }

  if (this.locked) {
    log.warn('Namespace is locked.');
  }

  if (this.stack.length && !this.locked) {
    this.locked = true;
    cont = this.stack.shift();
    cont.cc.apply(cont.binding, cont.args);
  }
};

function Cache(namespace, close) {
  var self = {}, closed = false;

  self.close = function () {
    if (!closed) {
      log.trace('Closing transaction for '+ namespace);
      closed = true;
      close();
    }
  };

  self.get = function (key) {
    log.trace(namespace +'.get()');
    if (closed) {
      throw 'Cache transaction has been closed.';
    }
    log.trace('cache: '+ cache[namespace]);
    log.trace('item: '+ (cache[namespace] || {})[key]);
    return ((cache[namespace] || {})[key] || {}).val;
  };

  self.put = function (key, val, expires) {
    log.trace(namespace +'.put()');
    if (closed) {
      throw 'Cache transaction has been closed.';
    }
    cache[namespace] = cache[namespace] || {};

    if ((cache[namespace][key] || {}).timer) {
      log.trace('cancel timer');
      cache[namespace][key].timer.cancel();
    }
    else {
      log.trace('no timer');
    }

    cache[namespace][key] = {val: val};
    if (typeof expires === 'number') {
      log.trace('setting timer for '+ expires);
      cache[namespace][key].timer = events.enqueue(function () {
        log.trace('time expired for '+ namespace +':'+ key +'\n');
        delete cache[namespace][key];
      }, expires);
    }
  };

  return self;
}

exports.cache = function (namespace, callback) {
  if (!blockers[namespace]) {
    blockers[namespace] = Blocker();
  }
  blockers[namespace].next(function (done) {
    callback(Cache(namespace, done));
  });
};


function load(cb) {
  events.enqueue(function () {
    cb('memcache', exports);
  }, 0);
}

