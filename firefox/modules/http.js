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
    async, body, broadcast, call, classes, constructor, create, 
    createInstance, data, encode, getAllResponseHeaders, hasOwnProperty, 
    headers, http, import, interfaces, join, length, method, 
    nsIXMLHttpRequest, observe, onreadystatechange, open, promise, 
    prototype, push, readyState, replace, require, responseText, send, 
    setRequestHeader, target, toString, url, utils
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
    set.url = opt.url || spec.url || "";
    set.data = opt.data || spec.data || null;
    set.headers = update_headers(headers, opt.headers) || headers;
    return set;
  }

  spec = update(spec);

  function xhr_send(xhr, data) {
    try {
      xhr.send(data);
    } catch(sendErr) {
      throw new Error("Problem calling XMLHttpRequest.send("+ data +
                      ") in http.send().");
    }
  }

  self.send = function http_send(opt) {
    var xhr = constructor(), conf, promise,
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

    if (async) {
      promise = EVENTS.promise(function init_http_promise(notifier) {
          notifier.observe("register",
              function promise_registered() {
                try {
                  xhr_send(data);
                } catch(e) {
                  notifier.broadcast("exception", e);
                }
              });
          xhr.onreadystatechange = function on_ready_state_change(ev) {
            if (ev.target.readyState === 0) {
              notifier.broadcast("exception",
                  new Error("XMLHttpRequest emitted a ready state of 0."));
            }
            if (ev.target.readyState === 4) {
              notifier.broadcast("fulfill",
                  {body: xhr.responseText,
                   headers: xhr.getAllResponseHeaders()});
            }
          };
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
    xhr_send(data);
    return {body: xhr.responseText,
            headers: xhr.getAllResponseHeaders()};
  };

  self.constructor = exports.http;
  return self;
};

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

