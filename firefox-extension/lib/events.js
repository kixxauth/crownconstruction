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
Components: false,
XPCOMUtils: false
*/

"use strict";

dump('loading events.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , util = require('util')

  , observer_service = Cc["@mozilla.org/observer-service;1"]
                         .getService(Ci.nsIObserverService)
  , registry = {}

  , persisted = {}
  ;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

function Observer(topic, callback) {
  if (!(this instanceof Observer)) {
    return new Observer(topic, callback);
  }
  this.topic = topic;
  this.callback = callback;
}

Observer.prototype = {

  QueryInterface: XPCOMUtils.generateQI(
                      [Ci.nsIObserver, Ci.nsISupportsWeakReference]),

  observe: function(subject, topic, data) {
    this.callback(subject.wrappedJSObject);
  }
};

function Subject(object) {
  if (!(this instanceof Subject)) {
    return new Subject(object);
  }
  this.wrappedJSObject = object;
}

Subject.prototype = {
  QueryInterface: XPCOMUtils.generateQI([]),
  getHelperForLanguage: function() {},
  getInterfaces: function() {}
};

exports.Broadcaster = function() {
  var registry = {};

  function broadcaster(vals, binding) {
    var i;

    vals = util.isArray(vals) ? vals : [vals];

    for (i in registry) {
      if (util.has(registry, i)) {
        registry[i].apply(binding || null, vals);
      }
    }
  }

  broadcaster.add = function (hash, fn) {
    registry[hash] = fn;
  };

  broadcaster.remove = function (hash, fn) {
    delete registry[hash];
  };

  return broadcaster;
};

exports.addListener = function(name, fn) {
  var observer = Observer(name, fn);
  if (!registry[name]) {
    registry[name] = {};
  }
  registry[name][fn] = observer;
  observer_service.addObserver(observer, name, true);

  if (persisted[name]) {
    exports.enqueue(function () {
      fn(persisted[name]);
    }, 0);
  }
};

exports.removeListener = function(name, fn) {
  observer_service.removeObserver(registry[name][fn], name);
};

exports.observeOnce = function (name, fn) {
  if (persisted[name]) {
    exports.enqueue(function () {
      fn(persisted[name]);
    }, 0);
    return;
  }

  var observer;

  function proxy(data) {
    observer_service.removeObserver(registry[name][proxy], name);
    fn(data);
  }

  observer = Observer(name, proxy);
  if (!registry[name]) {
    registry[name] = {};
  }
  registry[name][proxy] = observer;
  observer_service.addObserver(observer, name, true);
};

exports.trigger = function(name, data, persist) {
  var subject = (typeof data === 'undefined' || data === null) ?
                null : Subject(data);

  if (persist) {
    persisted[name] = data;
  }
  observer_service.notifyObservers(subject, name, null);
};

exports.enqueue = function setTimeout(callback, time) {
	var timer = Cc["@mozilla.org/timer;1"]
			          .createInstance(Ci.nsITimer);
 
  timer.initWithCallback(
      {notify: callback},
      time,
      Ci.nsITimer.TYPE_ONE_SHOT);
  return timer;
};

exports.Aggregate = function (callback) {
  var registry = [];

  function try_return() {
    var i = 0, len = registry.length;

    for (; i < len; i += 1) {
      if (registry[i] === false) {
        return;
      }
    }
    callback(registry);
  }

  return function (keys) {
    var index = registry.push(false) -1;

    return function () {
      var args = {}, i;
      if (keys) {
        for (i = 0; i < keys.length; i += 1) {
          args[keys[i]] = arguments[i];
        }
      }
      registry[index] = args;
      try_return();
    };
  };
};

function load(cb) {
  exports.enqueue(function () {
    cb('events', exports);
  }, 0);
}

dump('loaded events.js\n');

