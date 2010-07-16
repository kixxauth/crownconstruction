/*

License
-------

All source code in this directory is licensed under the MIT license unless
otherwise noted in the source file itself.

See MIT-LICENSE in this directory for details.

*/

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

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , util = require('util')
  , isArray = util.isArray

  , logging = require('logging')

  , observer_service = Cc["@mozilla.org/observer-service;1"]
                         .getService(Ci.nsIObserverService)

    // Dict of global event oberver functions.
  , registry = {}

    // Persisted events.
  , persisted = {}
  ;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

function construct_pub_promise(spec) {
  return function (fulfilled, exception, progress) {
    if (typeof fulfilled === 'function') {
      if (spec.fulfilled_val) {
        exports.enqueue(function () {
          fulfilled.apply(null, spec.fulfilled_val);
        }, 0);
      }
      else {
        spec.observers.fulfilled.push(fulfilled);
      }
    }
    if (typeof exception === 'function') {
      if (spec.exception_val) {
        exports.enqueue(function () {
          exception.apply(null, spec.exception_val);
        }, 0);
      }
      else {
        spec.observers.exception.push(exception);
      }
    }
    if (typeof progress === 'function') {
      spec.observers.progress.push(progress);
    }
    return construct_pub_promise(spec);
  };
}

exports.Promise = function (init) {
  var spec = {
        resolved: false,
        fulfilled_val: null,
        exception_val: null,
        observers: {
          fulfilled: [],
          exception: [],
          progress: []
        }
      };

  function broadcast(type, args) {
    if (spec.fulfilled_val || spec.exception_val) {
      return;
    }

    var i
      , val
      , observers = spec.observers[type]
      , len = observers.length
      ;

    if (type === 'progress') {
      for (i = 0; i < len; i += 1) {
        observers[i].apply(null, Array.prototype.slice.call(args));
      }
      return;
    }

    if (type === 'fulfilled') {
      val = spec.fulfilled_val = Array.prototype.slice.call(args);
    }
    else {
      val = spec.exception_val = Array.prototype.slice.call(args);
    }

    function queue_observer(fn, val) {
      exports.enqueue(function () {
        fn.apply(null, val);
      }, 0);
    }

    for (i = 0; i < len; i += 1) {
      queue_observer(observers[i], val);
    }
  }

  function broadcast_fulfill() {
    broadcast('fulfilled', arguments);
  }

  function broadcast_exception() {
    broadcast('exception', arguments);
  }

  function broadcast_progress() {
    broadcast('progress', arguments);
  }

  exports.enqueue(function () {
    init(broadcast_fulfill,
        broadcast_exception, broadcast_progress);
  }, 0);

  return construct_pub_promise(spec);
};

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

// Utility to implement an event broadcaster.
//
// This is a constructor function that creates and returns an event broadcaster
// function object.
//
// ### Broadcaster function object API.
//
//   - Call broadcaster.add() to add an event listener function.
//     #### Params
//       * `hash` {any type} A value that will be the key for the handler for
//         the internal handler registry dict. It's useful to use the handler
//         function itself for this purpose.
//       * `fn` {function} An event handler callback function.
//
//   - Call broadcaster.remote() to remove an event listener function.
//     #### Params
//       * `hash` {any type} The same value that was used as the hash
//         in `broadcaster.add()`. 
//
//   - Call broadcaster() to dispatch the event. The registered handler
//     functions will be invoked in the next available event loop.
//     #### Params
//       * [`vals`] {any type} If `vals` is an array it will be passed to
//         handler functions as an arguments list.
//       * [`binding`] {any type} If `binding` is given, it will be bound to
//         `this` inside each handler function.
exports.Broadcaster = function() {
  var registry = {};

  function broadcaster(vals, binding) {
    vals = util.isArray(vals) ? vals : [vals];

    exports.enqueue(function () {
      var i;
      for (i in registry) {
        if (typeof registry[i] === 'function') {
          registry[i].apply(binding || null, vals);
        }
      }
    }, 0);
  }

  broadcaster.add = function (hash, fn) {
    registry[hash] = fn;
  };

  broadcaster.remove = function (hash) {
    delete registry[hash];
  };

  return broadcaster;
};

// Add a global event listener function.
//
// If the event has already been broadcast as a persistent event type, the
// handler registered with this function will be invoked in the next available
// event loop with the persisted event.
//
// #### Params
//   * `name` {string} The name of the event to observe.
//   * `fn` {function} The event handler callback function.
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

// Remove a global event listener function.
//
// #### Params
//   * `name` {string} The name of the event to ignore.
//   * `fn` {function} The same event handler callback function originally
//     given to `.addListener()`.
exports.removeListener = function(name, fn) {
  observer_service.removeObserver(registry[name][fn], name);
};


// Add a global event listener function and remove it as soon as the event
// is broadcast.
//
// If the event has already been broadcast as a persistent event type, the
// handler registered with this function will be invoked in the next available
// event loop with the persisted event.
//
// #### Params
//   * `name` {string} The name of the event to observe.
//   * `fn` {function} The event handler callback function.
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

// Trigger a global event.
//
// #### Params
//   * `name` {string} The name of the event to trigger.
//   * `data` {any type} A data type to pass to the event handlers.
//   * `persist` {boolean} If this flag is set to `true` the event becomes a
//     persisted event, meaning the event data will be cached until the event
//     is triggered again.
exports.trigger = function(name, data, persist) {
  var subject = (typeof data === 'undefined' || data === null) ?
                null : Subject(data);

  if (persist) {
    persisted[name] = data;
  }
  observer_service.notifyObservers(subject, name, null);
};

// Set a function on the event loop queue.
//
// #### Params
//   * `fn` {function} The function to execute.
//   * `time` {number} Time delay in milliseconds.
//
// #### Returns
//   An `nsITimer` interface with the `nsITimer.cancel()` method available.
exports.enqueue = function setTimeout(fn, time) {
	var timer = Cc["@mozilla.org/timer;1"]
			          .createInstance(Ci.nsITimer);
 
  timer.initWithCallback(
      {notify: fn},
      time,
      Ci.nsITimer.TYPE_ONE_SHOT);
  return timer;
};

// Register a handler to be triggered only after a given set of multiple events
// have also been triggered.
//
// # Params
//   * `callback` {function} The callback function to invoke when all other
//     registered handlers have triggered.
//
// # Returns
//   A handler constructor function that returns event handler functions to
//   pass in as event handlers to event dispatchers. The handler constructor
//   takes the following parameters:
//     * `keys` {array} A list of strings that will name the parameters passed
//       to the returned handler when it is invoked and enter them into a dict
//       hash object passed into the callback function originally given to
//       `.Aggregate()`.
exports.Aggregate = function (callback) {
  var registry = [];

  function try_return() {
    var i = 0
      , len = registry.length
      , args = []
      , params = []
      ;

    for (; i < len; i += 1) {
      if (registry[i][0]) {
        params.push(registry[i][1]);
      }
      else {
        args.push(registry[i][1]);
      }
      if (registry[i] === false) {
        return;
      }
    }
    if (args.length) {
      callback(args);
    }
    else {
      callback.apply(null, params);
    }
  }

  return function (keys) {
    var index = registry.push(false) -1;

    return function () {
      var args = [false, false], i, arg;

      if (isArray(keys)) {
        arg = {};
        for (i = 0; i < keys.length; i += 1) {
          arg[keys[i]] = arguments[i];
        }
        args = [false, arg];
      }
      else {
        args = [true, arguments[0]];
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

