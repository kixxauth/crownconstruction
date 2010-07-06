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

/*global
Components: false
*/

"use strict";

// For Mozilla JavaScript modules system.
var EXPORTED_SYMBOLS = ["exports"], PROMISE, ENQ;

// If we are in the Mozilla module system we need to add some boilerplate to be
// CommonJS complient. This is obviously an ugly hack to allow integration with
// legacy code that uses the Mozilla module system.
if (Components) {
  var require = Components.utils.import(
        "resource://crownconstruction/modules/boot.js", null).require;
  var exports = {};
  var module = {id: "promise"};
}

ENQ = require("queue").enqueue;


PROMISE = (function () {

	function construct_pub_promise(spec) {
		return function (fulfilled, exception, progress) {
			if (typeof fulfilled === "function") {
				if (spec.fulfilled_val) {
					ENQ(function () {
						fulfilled.apply(null, spec.fulfilled_val);
					});
				}
				else {
					spec.observers.fulfilled.push(fulfilled);
				}
			}
			if (typeof exception === "function") {
				if (spec.exception_val) {
					ENQ(function () {
						exception.apply(null, spec.exception_val);
					});
				}
				else {
					spec.observers.exception.push(exception);
				}
			}
			if (typeof progress === "function") {
				spec.observers.progress.push(progress);
			}
			return construct_pub_promise(spec);
		};
	}

	return function promise_constructor(init) {
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

		function make_queued(fn, args) {
			return function () {
				fn.apply(null, args);
			};
		}

		function broadcast(type, args) {
			if (spec.fulfilled_val || spec.exception_val) {
				return;
			}

			var i = 0, val,
					observers = spec.observers[type],
					len = observers.length;

			if (type === "progress") {
				for (; i < len; i += 1) {
					observers[i].apply(null, args);
				}
				return;
			}

			if (type === "fulfilled") {
				val = spec.fulfilled_val = Array.prototype.slice.call(args);
			}
			else {
				val = spec.exception_val = Array.prototype.slice.call(args);
			}

			for (; i < len; i += 1) {
				ENQ(make_queued(observers[i], val));
			}
		}

		function broadcast_fulfill() {
			broadcast("fulfilled", arguments);
		}

		function broadcast_exception() {
			broadcast("exception", arguments);
		}

		function broadcast_progress() {
			broadcast("progress", arguments);
		}

		ENQ(function init_promise() {
			init(broadcast_fulfill,
					broadcast_exception, broadcast_progress);
		});

		return construct_pub_promise(spec);
	};
}());

exports.promise = PROMISE;

