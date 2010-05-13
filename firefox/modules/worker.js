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
regexp: true,
newcap: true,
immed: true,
strict: true,
maxlen: 80
*/

/*global
Components: false,
*/

"use strict";

// For Mozilla JavaScript modules system.
var EXPORTED_SYMBOLS = ["exports"];

function require (id) {
  var m = Components.utils.import(
      "resource://crownconstruction/modules/"+ id +".js", null);
  return ((typeof m.exports === "object") ? m.exports : m);
}

var exports = {};

// Create a worker dispatcher.
exports.create = function constructor(handlers) {
  var len = handlers.length;

  // The actual dispatcher function.
  return function(request, callback) {
    var i = 0, match;

    // Define a function to send back the response after
    // a handler has handled it.
    function call_handler(response) {
      callback({
        id: request.id,
        resource: request.resource,
        status: response.status || 'ok',
        body: response.body
      });
    }

    // Check all the handlers for a match.
    // The request will be dispatched to the first match.
    for (; i < len; i += 1) {
      try {
        match = handlers[i][0].exec(request.resource);
      } catch (e) {
        continue;
      }

      if (match) {
        match[0] = call_handler;
        try {
          handlers[i][1][request.method].apply({body: request.body}, match);
        } catch (ex) {
          callback({
            id: request.id,
            resource: request.resource,
            status: 'exception',
            body: (ex +'')
          });
        }
        return;
      }
    }

    // If no match was found, send back a 'not found' response.
    callback({
      id: request.id,
      resource: request.resource,
      status: 'not found',
      body: null
    });
  };
};

