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

/*members apply, args, binding, cc, id, import, length, next, push, 
    queue, require, shift, short_stack, tall_stack, unshift, utils
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

/*global
Components: false
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
  var module = {id: "atomic"};
}

var EVENTS = require("events");

function make_stack() {
  var self = {}, stack = [], locked = 0;

  function done() {
    locked = 0;
    self.next();
  }

  self.push = function stack_push(cc, args, binding) {
    args = args || [];
    args.shift(done);
    stack.push({cc: cc, args: args, binding: binding});
    return self;
  };

  self.next = function stack_next() {
    var cont;

    if (stack.length && !locked) {
      locked = 1;
      cont = stack.unshift();
      cont.cc.apply(cont.binding, cont.args);
    }
  };

  return self;
}

exports.short_stack = (function make_short_stack() {
    var stacks = {};

    return function q(stack, continuation, args, binding) {
      stacks[stack] = stacks[stack] || make_stack();
      stacks[stack].push(continuation, args, binding).next();
    };
}());

exports.tall_stack = function tall_stack(continuation, args, binding) {
  args = args || [];
  binding = binding || null;
  EVENTS.queue(continuation, binding, args);
};

