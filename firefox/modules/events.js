/*
Licensed under The MIT License
==============================

Copyright (c) 2009 - 2010 Fireworks Technology Projects Inc.
[www.fireworksproject.com](http://www.fireworksproject.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */


/*jslint
onevar: true,
undef: true,
nomen: true,
eqeqeq: true,
plusplus: true,
bitwise: true,
strict: true,
immed: true */

/*members "@mozilla.org\/thread-manager;1", DISPATCH_NORMAL, apply, 
    baseEvent, call, classes, constructor, dispatch, eventConstructor, 
    getDefaulting, getPropagation, getService, id, import, interfaces, 
    length, listen, mainThread, notify, nsIThread, nsIThreadManager, ok, 
    promise, prototype, push, require, run, send, slice, then, toString, 
    utils, watch
*/

/*global
Components: false,
setTimeout: false
*/

"use strict";

// For Mozilla JavaScript modules system.
var EXPORTED_SYMBOLS = ["exports"];

// If we are in the Mozilla module system we need to add some boilerplate to be
// CommonJS complient. This is obviously an ugly hack to allow integration with
// legacy code that uses the Mozilla module system.
if (Components) {
  var require = Components.utils.import(
        "resource://crownconstruction/modules/boot.js", null).require;
  var exports = {};
  var module = {id: "events"};
}

var ASSERT = require("assert");

var queue = (function create_queue() {
  var thread_manager = Components.classes["@mozilla.org/thread-manager;1"].
                     getService(Components.interfaces.nsIThreadManager),
      mode = Components.interfaces.nsIThread.DISPATCH_NORMAL;

  return function global_queue(continuation, event, args) {
          thread_manager.mainThread.dispatch({
                         run: function enqueue() {
                             continuation.apply(event, args);
                           }
                         }, mode);
        };
}());

/**
 * The base event prototype.
 */
exports.baseEvent = function event_constructor() {
  var self = {};

  self.toString = function to_string() {
    return '{"constructor": "baseEvent"}';
  };

  self.constructor = exports.baseEvent;
  return self;
};

function signal_constructor(spec) {
  spec = spec || {};
  var self = {},
      q = [],
      event_constructor = spec.eventConstructor || exports.baseEvent;

  self.listen = function signal_listen(observer) {
    q.push(observer);
  };

  self.send = function signal_send() {
    var len = q.length, i,
        event = ((this.constructor === event_constructor) && this ||
                 (typeof this.getPropagation === "function" &&
                  typeof this.getDefaulting === "function") && this ||
                 event_constructor(this));

    for (i = 0; i < len; i += 1) {
      q[i].apply(event, Array.prototype.slice.call(arguments));
    }
  };

  self.constructor = signal_constructor;
  return self;
}

function beacon_constructor(spec, id) {
  var self = {}, signals = {}, len = spec.length, i;
  id = id || "unidentified";

  for (i = 0; i < len; i += 1) {
    signals[spec[i]] = signal_constructor();
  }

  self.notify = function beacon_watch(name) {
    if (!signals[name]) {
      throw new Error("There is no signal known by '"+ name +
                      "' on beacon '"+ id +"'.");
    }
    signals[name].send.apply(
        exports.baseEvent(), Array.prototype.slice.call(arguments, 1));
  };

  self.watch = function beacon_watch(name, observer) {
    if (!signals[name]) {
      throw new Error("There is no signal known by '"+ name +
                      "' on beacon '"+ id +"'.");
    }
    if (typeof observer !== "function") {
      throw new Error("The observer passed to beacon.listen() for signal '"+
                      name +"' must be a function.");
    }
    signals[name].listen(observer);
  };

  self.constructor = beacon_constructor;
  return self;
}

exports.promise = function promise_constructor(init, id) {
  if (typeof init !== "function") {
    throw new Error(
        "init routine passed to promise() constructor must be a function.");
  }

  id = id || "unidentified";

  var self = {},
      initialized = 1,
      inprogress = 2,
      fulfilled = 3,
      exception = 4,
      beacon = beacon_constructor(["fulfill", "exception", "progress"], id),
      event,
      values,
      state = 0;

  beacon.watch("fulfill", function promise_fulfill() {
        ASSERT.ok(state >= initialized, "The promise '"+ id +"' was notified "+
          "of fulfillment before reaching the initialized state.");
        ASSERT.ok(state <= fulfilled, "The promise '"+ id +"' was notified "+
          "of fulfillment after already reaching the fulfilled state.");

        state = fulfilled;

        // The beacon will call apply() on this function, binding the
        // event object to "this".
        event = this;
        
        values = Array.prototype.slice.call(arguments);
      });

  beacon.watch("exception", function promise_exception() {
        ASSERT.ok(state >= initialized, "The promise '"+ id +"' was notified "+
          "of an exception before reaching the initialized state.");
        ASSERT.ok(state <= fulfilled, "The promise '"+ id +"' was notified "+
          "of an exception after already reaching the fulfilled state.");

        state = exception;

        // The beacon will call apply() on this function, binding the
        // event object to "this".
        event = this;
        
        values = Array.prototype.slice.call(arguments);
      });

  beacon.watch("progress", function promise_progress() {
        ASSERT.ok(state >= initialized, "The promise '"+ id +"' was notified "+
          "of progress before reaching the initialized state.");
        ASSERT.ok(state <= fulfilled, "The promise '"+ id +"' was notified "+
          "of an progress after already reaching the fulfilled state.");

        state = inprogress;

        // The beacon will call apply() on this function, binding the
        // event object to "this".
        event = this;
        
        values = Array.prototype.slice.call(arguments);
      });

  /**
   * Each callback continuation function passed to promise.then() will be
   * called with the arguments applied by the event initializer.  Also,
   * promise.then() returns a reference to the promise instance so that
   * promise.then() can be called in a chain like promise.then().then().then();
   * or imperitively like promise.then(); promise.then(); promise.then();. One
   * additional feature is that the internally created event object is bound to
   * "this" within each of the callback functions passed to promise.then(). The
   * last characteristic to keep in mind is that reference values like objects
   * and arrays passed to the callbacks registered with promise.then() my have
   * been mutated by a previous callback in the chain and cannot necessarily be
   * trusted.
   */
  self.then = function promise_then(fulfill, except, progress) {
    if (typeof fulfill === "function") {
      if (state === fulfilled) {
        fulfill.apply(event, values);
      } else {
        beacon.watch("fulfill", fulfill);
      }
    }
    if (typeof except === "function") {
      if (state === exception) {
        except.apply(event, values);
      } else {
        beacon.watch("exception", except);
      }
    }
    if (typeof progress === "function") {
      if (state === inprogress) {
        progress.apply(event, values);
      }
      beacon.watch("progress", progress);
    }
    return self;
  };

  self.constructor = exports.promise;
  queue(function promise_init() {
          state = initialized;
          init(beacon);
        });
  return self;
};

