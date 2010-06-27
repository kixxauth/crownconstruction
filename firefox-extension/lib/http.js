/*jslint
onevar: true,
undef: true,
nomen: true,
eqeqeq: true,
plusplus: true,
bitwise: true,
regexp: true,
immed: true,
strict: true,
laxbreak: true
*/

/*global
Components: false
*/

"use strict";

dump(' ... http.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , events = require('events')

  , RequestError = require('errors')
                     .ErrorConstructor('RequestError', 'http')
  ;


// Make an asynchronous HTTP request.
// ----------------------------------
//
// ### Params
//   * `options` required {object} Request options.
//     * `options.url` required {string} The HTTP url for the request.
//     * `options.method` optional {string} The HTTP request method.
//         Defaults to 'GET'.
//     * `options.headers` optional {object} A dictionary of request headers.
//     * `options.body` optional {string} HTTP request body.
//         Defaults to null.
//
//   * `callback` required {function} The callback function which will be passed
//        1 or 2 arguments. If the first argument is null, an error occured and
//        the second argumant will be the error object. If the first argument
//        is not null, it will be a response object of the form
//        {status:, headers:, body:}.
exports.request = function make_http_request(options, callback) {
  var xhr = Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
              .createInstance(Ci.nsIXMLHttpRequest)

    , method = options.method || 'GET'

    , h
    ;

  xhr.onreadystatechange = function on_ready_state_change(ev) {
    if (ev.target.readyState !== 4) {
      return;
    }
    if (!xhr.responseText && ev.target.status === 0) {
      callback(
          null,
          RequestError('XMLHttpRequest HTTP status is 0.'));
      return;
    }
    var res = {
        body: xhr.responseText
      , status: ev.target.status
      , headers: {}
      };

    try {
      res.headers = xhr.getAllResponseHeaders();
    } catch(e) { /* bury it */}
    callback(res);
  };

  try {
    xhr.open(method, options.url, true);
  } catch (e) {
    throw RequestError('Problem calling XMLHttpRequest.open('+
      method +', '+ options.url +', true); '+ e.message);
  }

  options.headers = options.headers || {};
  for (h in options.headers) {
    if (options.headers.hasOwnProperty(h)) {
      xhr.setRequestHeader(h, options.headers[h]);
    }
  }

  try {
    xhr.send(options.body || null);
  } catch(sendErr) {
    throw RequestError(
        'Problem calling XMLHttpRequest.send(); '+ sendErr.message);
  }
};

function load(cb) {
  events.enqueue(function () {
    cb('http', exports);
  }, 0);
}

