/*

License
-------

All source code in this directory is licensed under the MIT license unless
otherwise noted in the source file itself.

See MIT-LICENSE in this directory for details.

*/

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

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , events = require('events')
  , setTimeout = events.enqueue
  , HTTPRequest = require('http').request

  , JSONRequestError = require('errors')
                     .ErrorConstructor('JSONRequestError', 'jsonrequest')

  , log = require('logging').get('JSONRequest')

  , DEBUG = false
  ;

/**
 * Make a JSONRequest HTTP POST operation.
 * http://www.json.org/JSONRequest.html
 *
 * @param {string} url The HTTP URL string.
 * @param {object} send The data to JSON encode as the HTTP request body.
 * @param {function} done The callback function will be pased the request id
 * number, the response if it succeeds, and a JSONRequest error if it fails.
 * @param {number} timeout The number of ms to wait.
 */
exports.post = function do_jsonrequest(url, send, done, timeout) {
  var data = JSON.stringify(send)
    , timedout = false
    , timer = setTimeout(function () {
        timedout = true;
        done(null, JSONRequestError("no response"));
      }, (timeout || 10000))
    ;

  if (DEBUG) {
    dump("\n -- JSONRequest.post() to "+ url +" --\n");
    dump("\tRequest body:\n");
    dump(data);
    dump("\n ...\n");
  }

  function xhr_callback(response, ex) {
    var rdata, sn = 1;
    if (timedout) {
      return;
    }
    timer.cancel();
    if (response) {

      if (DEBUG) {
        dump("\n -- JSONRequest response --\n");
        dump("HTTP "+ response.status +"\n");
        dump(response.headers +"\n");
        dump(response.body);
        dump("\n ...\n");
      }

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
      return;
    }
    if (DEBUG) {
      dump("\n -- JSONRequest/HTTP exception --\n");
      dump(ex);
      dump("\n ...\n");
    }
    done(sn, undefined, JSONRequestError("no response"));
  }

  try {
    HTTPRequest(
          {
            url: url
          , method: 'POST'
          , body: data
          , headers:
            {
              'Accept': 'application/jsonrequest'
            , 'Content-Type': 'application/jsonrequest'
            }
          }
        , xhr_callback);
  } catch(HTTPex) {
    throw JSONRequestError("bad url");
  }
};

function load(cb) {
  require.ensure(['platform'], function (require) {
    var platform = require('platform');

    function prefs_ready(debug_pref) {
      DEBUG = !!debug_pref.value();
      debug_pref.addListener(function () {
        DEBUG = !!debug_pref.value();
      });
    }

    try {
      platform.pref('debug', prefs_ready, false);
    }
    catch (e) {
      log.debug(e);
      log.warn(new Error('Unable to get JSONRequest preferences.'));
    }

    cb('jsonrequest', exports);
  });
}

