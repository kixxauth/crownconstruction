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

/*members get_item, id, import, parse, require, set_item, stringify, 
    utils
*/

/*global
Components: false,
JSON: false
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
  var module = {id: "cache"};
}

var CACHE = {};
exports.set_item = function set_item(key, value) {
  CACHE[key] = value;
  return value;
};

exports.get_item = function get_item(key) {
  return ((!CACHE[key] || typeof CACHE[key] !== "object") ?
               CACHE[key] :
               JSON.parse(JSON.stringify(CACHE[key])));
};

