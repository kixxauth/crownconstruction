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
var EXPORTED_SYMBOLS = ["exports"],
		CACHE, PROMISE;

// If we are in the Mozilla module system we need to add some boilerplate to be
// CommonJS complient. This is obviously an ugly hack to allow integration with
// legacy code that uses the Mozilla module system.
if (Components) {
	function require(id) {
		var m = Components.utils.import(
				"resource://crownconstruction/modules/"+ id +".js", null);
		return ((typeof m.exports === "object") ? m.exports : m);
	}
  var exports = {};
  var module = {id: "cache"};
}

PROMISE = require("promise").promise;

CACHE = (function () {
	var memo = {}, self = {}, stacks = {}, done, next;

	function cache_Exception(message) {
		var self = new Error(message || "unkown");
		self.name = "CacheError";
		self.constructor = arguments.callee;
		return self;
	}

	done = function (key) {
		stacks[key].blocked = false;
		next(key);
	};

	next = function (key) {
		if (stacks[key].stack.length && !stacks[key].blocked) {
			stacks[key].blocked = true;
			stacks[key].stack.shift()();
		}
	};

	self.atomic = function cache_atomic(key) {

		var txn = function (method, val) {
			switch (method) {
			case "get":
				if (!memo.hasOwnProperty(key)) {
					memo[key] = null;
				}
				return memo[key];

			case "set":
				return (memo[key] = val);

			case "update":
				var p;
				memo[key] = memo[key] || {};
				for (p in val) {
					if (val.hasOwnProperty(p)) {
						memo[key][p] = val[p];
					}
				}
				return memo[key];

			case "commit":
				done(key);
				txn = function () {
					throw cache_Exception("transaction committed");
				};
				break;
			}
		};

		function transaction(method, val) {
			return txn(method, val);
		}

		return PROMISE(function (fulfill) {
			stacks[key] = stacks[key] || {blocked: false, stack: []};
			stacks[key].stack.push(function () {
				fulfill.call(null, transaction);
			});
			next(key);
		});
	};

	return self;
}());

exports = CACHE;

