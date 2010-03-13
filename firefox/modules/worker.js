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
Components: false,
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
  var module = {id: "worker"};
}

var CONF = require("configs");
var ASSERT = require("assert");
var LOGGING = require("logging");
var EVENTS = require("events");
var DDD = require("dcube");

DDD.setDomain(CONF.get("data-url"));

var LOGGER = LOGGING.getLogger("CrownERM.worker"),
    DBNAME = CONF.get("dbname"),
    CXN;

/**
 */
exports.init = (function () {
  var login, init, load,
      promise, beacon, state = 0,
      initialize = 1,
      authenticating = 10,
      authenticated = 20,
      loading = 30,
      loaded = 40,
      exception = 90,
      done = 100,

      events = {
        "1": "login",
        "9": "login-error",
        "10": "loading",
        "11": "bad-credentials",
        "20": "loading",
        "30": "loading",
        "40": "loading"
      };

  login = function login(username, passkey, dbname) {
    try {
      username = DDD.validateUsername(username);
    } catch (usernameEx) {
      switch (usernameEx.message) {
      case "too short":
        beacon.progress(events[9], "username too short", login);
        break;
      case "too long":
        beacon.progress(events[9], "username too long", login);
        break;
      case "invalid characters":
        beacon.progress(events[9], "username has bad characters", login);
        break;
      default:
        LOGGER.warn("Unexpected DCube username validation error '"+
          usernameEx.message +"'");
        state = exception;
        beacon.exception(new Error("unknown username exception"));
      }
      return;
    }

    try {
      passkey = DDD.validatePasskey(passkey);
    } catch (passkeyEx) {
      switch (passkeyEx.message) {
      case "too short":
        beacon.progress(events[9], "passkey too short", login);
        break;
      case "too long":
        beacon.progress(events[9], "passkey too long", login);
        break;
      default:
        LOGGER.warn("Unexpected DCube passkey validation error '"+
          passkeyEx.message +"'");
        state = exception;
        beacon.exception(new Error("unknown passkey exception"));
      }
      return;
    }

    state = authenticating;
    dbname = dbname || DBNAME;
    load(dbname, username, passkey);
  };

  load = function load(dbname, username, passkey) {
    var query = DDD.query("query").appendStatement("class", "=", "job");
    DDD.connect(dbname, username, [query], passkey).then(

        function connect_fulfilled(rv) {
          state = authenticated;
          CXN = rv.connection;
          state = loading;
          beacon.progress(events[state]);
          // TODO: Do something with rv.results here; set a global cache.
          state = loaded;
          beacon.fulfill();
          state = done;
        },

        function connect_exception(ex) {
          switch (ex.name +":"+ ex.message) {
          case "DCubeException:user does not exist":
            beacon.progress(events[11], "user does not exist", login);
            break;
          case "DCubeException:invalid passkey":
            beacon.progress(events[11], "invalid passkey", login);
            break;
          case "DCubeException:not found":
            LOGGER.warn("Invalid database.");
            state = exception;
            beacon.exception(new Error("invalid database"));
            break;
          default:
            LOGGER.warn("Unexpected DCube connection error "+ ex);
            state = exception;
            beacon.exception(new Error("unknown DCube exception"));
          }
        });

  };

  init = function init(b) {
    try {
      ASSERT.equal(beacon, undefined,
          "worker.init() beacon must not be assigned.");
      ASSERT.equal(CXN, undefined,
          "worker.init() LOGIN must not be assigned.");
      ASSERT.equal(state, 0,
          "worker.init() state must be 0.");
    } catch (assertion) {
      LOGGER.error(assertion);
      state = exception;
      b.exception(assertion);
      return;
    }

    state = initialize;
    beacon = b;
    beacon.progress(events[state], login);
  };

  return function pub_init() {
      if(state === exception) {
        promise = undefined;
        beacon = undefined;
        CXN = undefined;
        state = 0;
      }
      if(!promise) {
        promise = EVENTS.promise(init);
      }
      return promise;
    };
}());

/**
 */
exports.debug = function pub_debug(debug) {
  if (debug) {
    LOGGING.debug(1);
    DDD.debug(1);
  }
  else {
    LOGGING.debug(0);
    DDD.debug(0);
  }
};

/**
 */
exports.databaseSandbox = function pub_database(toggle) {
  if (toggle) {
    DBNAME = CONF.get("sandbox-dbname");
  }
  else {
    DBNAME = CONF.get("dbname");
  }
};
