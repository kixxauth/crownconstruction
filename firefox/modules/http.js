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

/*members "@mozilla.org\/xmlextras\/xmlhttprequest;1", XHRConstructor, 
    async, body, call, classes, constructor, create, createInstance, data, 
    encode, getAllResponseHeaders, hasOwnProperty, headers, http, import, 
    interfaces, join, length, method, notify, nsIXMLHttpRequest, 
    onreadystatechange, open, promise, prototype, push, readyState, replace, 
    require, responseText, send, setRequestHeader, status, target, toString, 
    url, utils
*/

/*global
Components: false,
XMLHttpRequest: true,
exports: true,
*/

"use strict";

var EXPORTED_SYMBOLS = ["exports"];

if (typeof Components !== "undefined") {
  var require = Components.utils.import(
        "resource://crownconstruction/modules/boot.js", null).require;
  var exports = {};
}

var EVENTS = require("events");

/**
 * Create an http instance wrapping XMLHttpRequest.
 */
exports.create = function http_constructor(spec) {
  spec = spec || {};
  var self = {},
      constructor = (spec.XHRConstructor ||
                     function XHR_constructor() {
                       if (typeof XMLHttpRequest === "function") {
                         return new XMLHttpRequest();
                       }
                       return Components.classes[
                                  "@mozilla.org/xmlextras/xmlhttprequest;1"].
                                  createInstance(
                                    Components.interfaces.nsIXMLHttpRequest);
                     }),
      async = ((typeof spec.async === "undefined") ? true : !!spec.async),
      headers = [];

  function update_headers(headers, new_headers) {
    var h, i;

    if (typeof new_headers === "object") {
      for (h in new_headers) {
        if (Object.prototype.hasOwnProperty.call(headers, h)) {
          for (i = 0; i < headers.length; i += 1) {
            if (headers[i][0] === h) {
              headers[i][1] = new_headers[h];
            } else {
              headers.push([h, new_headers[h]]);
            }
          }
        }
      }
    }
  }

  function update(opt) {
    var set = {};
    set.method = opt.method || spec.method || "GET";
    set.url = opt.url || spec.url;
    set.data = opt.data || spec.data || null;
    set.headers = update_headers(headers, opt.headers) || headers;
    return set;
  }

  spec = update(spec);

  self.send = function http_send(opt) {
    var xhr = constructor(), conf, promise, res,
        method, url, data, request_headers, i;

    if (arguments.length === 1) {
      conf = update(opt);
      method = conf.method;
      url = conf.url;
      data = conf.data;
      request_headers = conf.headers;
    }
    else if (arguments.length === 0) {
      method = spec.method;
      url = spec.url;
      data = spec.data;
      request_headers = headers;
    }
    else {
      method = arguments[0];
      url = arguments[1];
      data = arguments[2] || spec.data;
      request_headers = update_headers(headers, arguments[3]) || headers;
    }

    if (!url) {
      throw new Error("A URL string must be provided to send().");
    }

    if (async) {
      promise = EVENTS.promise(function init_http_promise(notifier) {
          xhr.onreadystatechange = function on_ready_state_change(ev) {
            if (ev.target.readyState === 0) {
              notifier.notify("exception",
                  new Error("XMLHttpRequest emitted a ready state of 0."));
            }

            if (ev.target.readyState === 4) {
              res = {body: xhr.responseText,
                     status: xhr.status,
                     headers: {}};
              try {
                res.headers = xhr.getAllResponseHeaders();
              } catch(e) { /* bury it */}
              notifier.notify("fulfill", res);
            }
          };

          try {
            xhr.send(data);
          } catch(sendErr) {
            notifier.notify("exception",
                            new Error("Problem calling XMLHttpRequest.send("+
                            data +") in http.send().\nmethod: "+ method +
                            "\nURL:"+ url));
          }
        });
    }

    try {
      xhr.open(method, url, async);
    } catch(openErr) {
      throw new Error("Problem calling XMLHttpRequest.open("+ method +
                      ", "+ url +", "+ async +") in http.send().");
    }

    for (i = 0; i < request_headers.length; i += 1) {
      xhr.setRequestHeader(request_headers[i][0], request_headers[i][1]);
    }

    if (async){
      return promise;
    }
    try {
      xhr.send(data);
    } catch(sendErr) {
      throw new Error("Problem calling XMLHttpRequest.send("+
                      data +") in http.send().\nmethod: "+ method +
                      "\nURL:"+ url);
    }

    res = {body: xhr.responseText,
           status: xhr.status,
           headers: {}};
    try {
      res.headers = xhr.getAllResponseHeaders();
    } catch(e) { /* bury it */}
    return res;
  };

  self.constructor = exports.http;
  return self;
};

/**
 * URL encode an object.
 */
exports.encode = function encode(data) {
  var postData = [], value, property;

  for(property in data) {
    if (Object.prototype.hasOwnProperty.call(data, property)) {
      value = ((typeof data[property] === "undefined") && "undefined" ||
              (data[property] === null) && "null" ||
              data[property].toString());

      postData.push(encodeURIComponent(property).replace(/%20/g, "+") +
                         "=" + encodeURIComponent(value).replace(/%20/g, "+"));
    }
  }
  return postData.join("&");
};

