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

/*members "@mozilla.org\/timer;1", Accept, "Content-Type", 
    JSONRequestError, TYPE_ONE_SHOT, body, cancel, classes, constructor, 
    create, createInstance, debug, get, headers, id, import, 
    initWithCallback, interfaces, name, notify, nsITimer, ok, parse, post, 
    require, send, setLogger, status, stringify, then, utils
*/

/*global
Components: false,
dump: false,
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
        "resource://crownconstruction/modules/boot.js", null).require,
      exports = {},
      module = {id: "jsonrequest"};
}

var HTTP = require("http").create({headers: {
                                   "Accept": "application/jsonrequest",
                                   "Content-Type": "application/jsonrequest"}}),
    ASSERT = require("assert").ok;

var LOG = function dump_logger(msg) { dump(msg +"\n"); };
var DEBUG = false;

var serial_number_gen = (function create_sn_gen() {
    var keeper = 0;
    return function create_serial_number() {
             keeper += 1;
             return keeper;
           };
}());

var setTimeout = setTimeout || (
    function create_setTimeout() {
      var nsITimer = Components.classes["@mozilla.org/timer;1"].
                       createInstance(Components.interfaces.nsITimer);

      return function set_timeout(c, t) {
               var nsITimerCallback = {notify: c};
               nsITimer.initWithCallback(nsITimerCallback, t,
                 Components.interfaces.nsITimer.TYPE_ONE_SHOT);
             };
    }());

function JSONRequestError(msg) {
  var self = new Error(msg);
  self.name = "JSONRequestError";
  self.constructor = JSONRequestError;
  return self;
}

exports.JSONRequestError = JSONRequestError;

exports.post = function post(url, send, done, timeout) {
  var sn, promise, data, timed_out = 0, fulfilled = 0;

  // input check
  if (typeof done !== "function") {
    throw JSONRequestError("bad function");
  }
  // input check
  timeout = timeout || 10000;
  if (typeof timeout !== "number" || timeout < 0) {
    throw JSONRequestError("bad timeout");
  }

  try {
    data = JSON.stringify(send);
  } catch(JSONex) {
    throw JSONRequestError("bad data");
  }

  try {
    promise = HTTP.send("POST", url, data);
  } catch(HTTPex) {
    throw JSONRequestError("bad url");
  }

  sn = serial_number_gen();
  promise.then(
      function jsonrequest_post_fulfill(response) {
        var rdata;

        if (DEBUG) {
          LOG("\n -- JSONRequest response --");
          LOG("HTTP "+ response.status);
          LOG(response.headers);
          LOG(response.body);
        }

        if (timed_out) {
          return;
        }

        ASSERT(!fulfilled,
               "jsonrequest_post_fulfill() was called after the "+
               "promise reached a resolved state.");
        fulfilled = 1;

        if (+response.status !== 200) {
          done(sn, undefined, JSONRequestError("not ok"));
          return;
        }

        try {
          rdata = JSON.parse(response.body);
        } catch (resJSONex) {
          done(sn, undefined, JSONRequestError("bad response"));
          return;
        }

        done(sn, rdata, undefined);
      },
      function jsonrequest_post_exception(ex) {
        if (DEBUG) {
          LOG("\n -- JSONRequest exception --");
          LOG(ex);
        }

        if (timed_out) {
          return;
        }
        ASSERT(!fulfilled,
               "jsonrequest_post_exception() was called after the "+
               "promise reached a resolved state.");
        fulfilled = 1;

        done(sn, undefined, JSONRequestError("no response"));
      });

  setTimeout(function jsonrequest_post_timeout(timer) {
        if (fulfilled) {
          return;
        }
        timed_out = 1;
        fulfilled = 1;
        done(sn, undefined, JSONRequestError("no response"));
      }, timeout);

  // Return a serial number as long as everything went ok.
  return sn;
};

exports.get = function get(url, done, timeout) {
  throw new Error("JSONRequest.get() is not yet implemented.");
};

exports.cancel = function cancel() {
  throw new Error("JSONRequest.cancel() is not yet implemented.");
};

exports.setLogger = function set_logger(logger) {
  LOG = logger;
};

exports.debug = function set_debug(toggle) {
  DEBUG = !!toggle;
};

