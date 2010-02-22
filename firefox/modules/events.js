/*jslint
onevar: true,
undef: true,
nomen: true,
eqeqeq: true,
plusplus: true,
bitwise: true,
strict: true,
immed: true */

/*members apply, baseEvent, broadcast, call, cancelDefault, constructor, 
    dismiss, emit, emitter, event, getDefaulting, getPropagation, import, 
    indexOf, length, observe, promise, prototype, push, require, setSignal, 
    signal, slice, splice, state, stopPropagation, then, toString, tower, 
    tuneIn, tuneOut, utils, values
*/

/*global
Components: false
*/

"use strict";

var EXPORTED_SYMBOLS = ["exports"];

if (typeof Components !== "undefined") {
  var require = Components.utils.import(
        "resource://crownconstruction/modules/boot.js", null).require;
  var exports = {};
}

/**
 * The base event prototype.
 */
exports.baseEvent = function event_constructor() {
  var self = {},
      propagation = true,
      defaulting = true;

  self.stopPropagation = function stop_propagation() {
    propagation = false;
  };

  self.cancelDefault = function cancel_default() {
    defaulting = false;
  };

  self.getPropagation = function get_propagation() {
    return propagation;
  };

  self.getDefaulting = function get_defaulting() {
    return defaulting;
  };

  self.toString = function to_string() {
    return '{"constructor": "baseEvent", "propagation": '+
           propagation +', "defaulting": '+ defaulting +'}';
  };

  self.constructor = exports.baseEvent;
  return self;
};

/**
 * A signal can be sent from point to point or it can be relayed out to a
 * network of towers that are tuned into it.
 */
exports.signal = function signal_constructor(action, eventConstructor) {
  var self = {},
      q = [];

  eventConstructor = eventConstructor || exports.baseEvent;

  /**
   * A tower calls this method to listen for this signal and possibly relay it
   * to more towers.
   */
  self.tuneIn = function tune_in(observer) {
    var s = exports.signal(observer);
    q.push(s.emitter());
    return s;
  };

  /**
   * A tower calls this methed to ignore this signal if it has previously been
   * tuned into it.
   */
  self.tuneOut = function tune_out(observer) {
    var i = q.indexOf(observer);
    if (i >= 0) {
      q.splice(i, 1);
    }
  };

  /**
   * A tower calls this method to broadcast this signal.
   */
  self.emit = function emit() {
    var i, len = q.length, event;

    if (this.constructor === eventConstructor) {
      event = this;
    } else {
      event = eventConstructor();
    }

    for (i = 0; i < len; i += 1) {
      if (!event.getPropagation()) {
        break;
      }
      q[i].apply(event, arguments);
    }

    if (typeof action === "function" && event.getDefaulting()) {
      return action.apply(event, arguments);
    }
  };

  /**
   * Create a function that emits this signal when it is called.
   */
  self.emitter = function create_emitter() {
    return function emitter() {
      return self.emit.apply(this, arguments);
    };
  };

  self.constructor = exports.signal;
  return self;
};

/**
 * Construct a tower instance that observes and broadcasts signals.
 */
exports.tower = function tower_constructor(signal_names) {
  var self = {},
      signals = {}, i;

  for (i = 0; i < signal_names.length; i += 1) {
    signals[signal_names[i]] = exports.signal();
  }

  /**
   * Create a named signal for this tower to broadcast or observe.
   *
   * @param {string} name The name string that identified the signal.
   *
   * @param {object|function} signal If signal is an instance of signal() it
   * will be used as signal on this tower for the given name. If not, it must
   * be a function that will become the default action on a newly created
   * signal using the given eventConstructor if it is provided. The default
   * action fuction of a signal is called with the event object bound to
   * <code>this</code>.
   *
   * @param {function} [eventConstructor] Only required if the signal argument
   * is not an instance of signal(). It is the constructor used for the event
   * that will ride on the newly created signal.
   */
  self.setSignal = function set_signal(name, signal, eventConstructor) {
    if (signal.constructor !== exports.signal) {
      signal = exports.signal(signal, eventConstructor);
    }
    signals[name] = signal;
    return signal;
  };

  /**
   * Set an observer on this tower tuned into the named signal.
   *
   * Observers set using this method will be called before the default action
   * of the signal.
   *
   * @param {string} name The name of the signal to observe on this tower.
   * @param {function} observer The function that will become the default
   * action of a newly created signal.
   *
   * @returns {signal} The newly created signal.
   */
  self.observe = function observe(name, observer) {
    return signals[name].tuneIn(observer);
  };

  /**
   * Remove an observer from this tower that is tuned into the named signal.
   *
   * If the observer does not exist on the named signal, this method has no
   * effect.  However, if the named signal does not exist, it will raise a
   * TypeError.
   *
   * @param {string} name The name of the signal.
   * @param {function} observer The function to remove.
   */
  self.dismiss = function dismiss(name, observer) {
    signals[name].tuneOut(observer);
  };

  /**
   * Broadcast a signal by the given name.
   *
   * @param {string} name The name of the signal to broadcast on this tower.
   */
  self.broadcast = function broadcast(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    return signals[name].emit.apply(signals[name], args);
  };

  self.constructor = exports.tower;
  return self;
};

function initialized_promise_constructor(spec) {
  var self = {},
      tower = spec.tower,
      event = spec.event,
      values = spec.values,
      inprogress = 2,
      fulfilled = 3,
      exception = 4,
      state = spec.state;

  self.then = function then(fulfill, except, progress) {
    var new_promise;

    if (typeof fulfill === "function") {
      if (state === fulfilled) {
        fulfill.apply(event, values);
      } else {
        tower.observe("fulfill", fulfill);
      }
    }
    if (typeof except === "function") {
      if (state === exception) {
        except.apply(event, values);
      } else {
        tower.observe("exception", except);
      }
    }
    if (typeof progress === "function") {
      if (state === inprogress) {
        progress.apply(event, values);
      }
      tower.observe("progress", progress);
    }
    new_promise = initialized_promise_constructor({tower: tower,
                                                   state: state,
                                                   event: event,
                                                   values: values});
    tower.broadcast("register");
    return new_promise;
  };

  self.constructor = exports.promise;
  return self;
}

exports.promise = function promise_constructor(init, id) {
  var self = {},
      tower = exports.tower(["progress", "exception", "fulfill", "register"]),
      event, values,
      initialized = 1,
      inprogress = 2,
      fulfilled = 3,
      exception = 4,
      state = 0;

  id = ((typeof id === "undefined") ? "unidentified" : id);

  tower.observe("progress", function progress_default() {
        if (state >= fulfilled) {
          throw new Error("Promise '"+ id +
            "' has already reached a fulfilled or exception state.");
        }
        event = this;
        values = Array.prototype.slice.call(arguments, 0);
        state = inprogress;
      });

  tower.observe("fulfill", function exception_default() {
        if (state >= fulfilled) {
          throw new Error("Promise '"+ id +
            "' has already reached a fulfilled or exception state.");
        }
        event = this;
        values = Array.prototype.slice.call(arguments, 0);
        state = exception;
      });

  tower.observe("fulfill", function fulfill_default() {
        if (state >= fulfilled) {
          throw new Error("Promise '"+ id +
            "' has already reached a fulfilled or exception state.");
        }
        event = this;
        values = Array.prototype.slice.call(arguments, 0);
        state = fulfilled;
      });

  init(tower);

  self.then = function then(fulfill, except, progress) {
    var new_promise;

    if (typeof fulfill === "function") {
      if (state === fulfilled) {
        fulfill.apply(event, values);
      } else {
        tower.observe("fulfill", fulfill);
      }
    }
    if (typeof except === "function") {
      if (state === exception) {
        except.apply(event, values);
      } else {
        tower.observe("exception", except);
      }
    }
    if (typeof progress === "function") {
      if (state === inprogress) {
        progress.apply(event, values);
      }
      tower.observe("progress", progress);
    }
    new_promise = initialized_promise_constructor({tower: tower,
                                                   state: state,
                                                   event: event,
                                                   values: values});
    tower.broadcast("register");
    return new_promise;
  };

  state = initialized;
  self.constructor = exports.promise;
  return self;
};

