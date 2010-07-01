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

  if (this.stack.length && !this.locked) {
    this.locked = true;
    cont = this.stack.shift();
    cont.cc.apply(cont.binding, cont.args);
  }
};

function Cache(namespace, close) {
  var self = {};

  self.close = function () {
    close();
  };

  self.get = function (key) {
    return (cache[namespace] || {})[key];
  };

  self.put = function (key, val, expires) {
    if (!cache[namespace]) {
      cache[namespace] = {};
    }
    cache[namespace][key] = val;
    if (typeof expires === 'number') {
      events.enqueue(function () {
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

