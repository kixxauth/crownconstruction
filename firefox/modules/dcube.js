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

/*members "DCubeAuthenticationError:invalid user", 
    "DCubeRequestError:URL does not exist", "DCubeRequestError:bad JSON", 
    "DCubeRequestError:forbidden", "DCubeRequestError:no credentials", 
    "DCubeRequestError:not found", "DCubeServerError:bad authorization", 
    "DCubeServerError:missing authorization", 
    "DCubeServerError:missing head", "DCubeServerError:missing status", 
    "DCubeServerError:unexpected status", "JSONRequestError:bad response", 
    "JSONRequestError:no response", "JSONRequestError:not ok", action, 
    addStatement, appendQuery, authorization, body, cnonce, concat, connect, 
    connection, constructor, createUser, debug, dir, exception, fulfill, 
    head, id, import, length, message, method, name, passkey, post, promise, 
    push, putDatabase, putUser, query, request, require, response, results, 
    send, setDomain, setLogger, short_stack, statements, status, test, 
    timeout, username, utils, validateDatabaseName, validateUsername, 
    valueOf
*/

/*global
Components: false,
dump: false
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
  var module = {id: "dcube"};
}

var ASSERT = require("assert");
var ATOMIC = require("atomic");
var EVENTS = require("events");
var JR = require("jsonrequest");
var CHAP = require("chap");

var DOMAIN = (
  function () {
    var domain;

    return function domain_descriptor(val) {
             if (val) {
               domain = "http://"+ val;
             }
             else {
               ASSERT.ok(domain, "The DCube domain was not "+
                                 "set with DCube.setDomain().");
               return domain;
             }
           };
  }());

var DEBUG = 0;

function STACK(continuation) {
  ATOMIC.short_stack("dcube", continuation, []);
}

var USERS = {};

function DLOGGER(msg) {
  dump(msg +"\n");
}

function DLOG(msg) {
  if (DEBUG) {
    DLOGGER(msg);
  }
}

function server_Error(msg) {
  var self = new Error(msg);
  self.name = "DCubeServerError";
  self.constructor = server_Error;
  return self;
}

function request_Error(msg) {
  var self = new Error(msg);
  self.name = "DCubeRequestError";
  self.constructor = request_Error;
  return self;
}

function auth_Error(msg) {
  var self = new Error(msg);
  self.name = "DCubeAuthenticationError";
  self.constructor = auth_Error;
  return self;
}

/**
 * no response
 * user does not exist
 * not found
 * forbidden
 * client error
 * server error
 * unexpected error
 */
var ERROR_LOOKUP = {
  "JSONRequestError:not ok": "unexpected error",
  "JSONRequestError:bad response": "server error",
  "JSONRequestError:no response": "no response",
  "DCubeServerError:missing head": "server error",
  "DCubeServerError:missing status": "server error",
  "DCubeServerError:missing authorization": "server error",
  "DCubeServerError:bad authorization": "server error",
  "DCubeServerError:unexpected status": "unexpected error",
  "DCubeRequestError:bad JSON": "client error",
  "DCubeRequestError:URL does not exist": "client error",
  "DCubeRequestError:no credentials": "client error",
  "DCubeRequestError:not found": "not found",
  "DCubeRequestError:forbidden": "forbidden",
  "DCubeAuthenticationError:invalid user": "user does not exist",
  "DCubeUsernameValidationError:not a string": "username not a string",
  "DCubeUsernameValidationError:too short": "username too short",
  "DCubeUsernameValidationError:too long": "username too long",
  "DCubeUsernameValidationError:invalid characters":
    "username invalid characters",
  "DCubeDatabaseNameValidationError:not a string":
    "database name not a string",
  "DCubeDatabaseNameValidationError:too short": "database name too short",
  "DCubeDatabaseNameValidationError:too long": "database name too long",
  "DCubeDatabaseNameValidationError:invalid characters":
    "database name invalid characters",
  "DCubePasskeyValidationError:not a string": "passkey not a string",
  "DCubePasskeyValidationError:too short": "passkey too short",
  "DCubePasskeyValidationError:too long": "passkey too long",
};

function dcube_Exception(ex) {
  var self = new Error();
  self.message = ( (typeof ex === "object") ?
      (ERROR_LOOKUP[ex.name +":"+ ex.message] || ex.message) : ex );
  self.name = "DCubeException";
  self.constructor = dcube_Exception;
  return self;
}

function username_validation_Error(msg) {
  var self = new Error(msg);
  self.name = "DCubeUsernameValidationError";
  self.constructor = username_validation_Error;
  return self;
}

function database_validation_Error(msg) {
  var self = new Error(msg);
  self.name = "DCubeDatabaseNameValidationError";
  self.constructor = username_validation_Error;
  return self;
}

function passkey_validation_Error(msg) {
  var self = new Error(msg);
  self.name = "DCubePasskeyValidationError";
  self.constructor = username_validation_Error;
  return self;
}

function user_constructor(username) {
  var self = {}, passkey, cnonce, response;

  self.passkey = function user_passkey(pk) {
    if (pk) {
      passkey = pk;
      return self;
    }
    else {
      return passkey;
    }
  };

  self.cnonce = function user_cnonce(nextnonce) {
    if (nextnonce) {
      ASSERT.equal(typeof passkey, "string",
          "DCube.User.passkey() has not been set (cnonce()).");
      cnonce = CHAP.cnonce(passkey, nextnonce);
      return cnonce;
    }
    else {
      ASSERT.equal(typeof cnonce, "string",
          "DCube.User.cnonce() has not been set.");
      return cnonce;
    }
  };

  self.response = function user_response(nonce) {
    if (nonce) {
      ASSERT.equal(typeof passkey, "string",
          "DCube.User.passkey() has not been set. (cnonce())");
      response = CHAP.response(passkey, nonce);
      return response;
    }
    else {
      ASSERT.equal(typeof response, "string",
          "DCube.User.response() has not been set.");
      return response;
    }
  };

  self.constructor = user_constructor;
  return self;
}

/**
 * spec:
 *  - timeout = 10000
 *  - dir = "/"
 *  - name = ""
 *  - method "get"
 *  - [username]
 *  - [cnonce && response]
 *  - body
 *
 * throws:
 *  - JSONRequestError : bad timeout
 *  - JSONRequestError : bad url
 *
 *  callback exceptions:
 *  - JSONRequestError : not ok
 *  - JSONRequestError : bad response
 *  - JSONRequestError : no response
 *  - DCubeServerError: missing head
 *  - DCubeServerError: missing status
 *  - DCubeServerError: missing authorization
 *  - DCubeServerError: unexpected status
 *  - DCubeRequestError: bad JSON
 *  - DCubeRequestError: bad JSON
 *  - DCubeRequestError: URL does not exist
 *  - DCubeRequestError: no credentials
 *  - DCubeRequestError: not found
 *  - DCubeRequestError: forbidden 
 *  - DCubeAuthenticationError: invalid user
 */
function send(done, spec) {
  var timeout = spec.timeout || 10000,
      dir = spec.dir || "",
      name = spec.name || "",
      url,
      payload =
      {
        head:{
          method: spec.method || "get"
             }
      };

  try {
    url = DOMAIN() +"/"+ dir;
  } catch(e) {
    done(undefined, request_Error(e.message));
    return;
  }
  url = name ? url +"/"+ name : url;

  if (spec.username) {
    payload.head.authorization = [spec.username];
  }
  if (payload.head.authorization && spec.cnonce && spec.response) {
    payload.head.authorization = payload.head.authorization.
      concat([spec.cnonce, spec.response]);
  }

  if (spec.body) {
    payload.body = spec.body;
  }

  JR.post(url, payload,
      function (sn, value, ex) {
        if (value) {
          if (!value.head) {
            DLOG("response value: "+ value);
            done(undefined, server_Error("missing head"));
            return;
          }
          if (!value.head.message) {
            DLOG("response head: "+ value.head);
            done(undefined, server_Error("missing message"));
            return;
          }
          if (typeof value.head.status !== "number") {
            DLOG("response head: "+ value.head);
            done(undefined, server_Error("missing status"));
            return;
          }
          if (value.head.status === 400) {
            done(undefined, request_Error("bad JSON"));
            return;
          }
          if (value.head.status === 401) {
            if (value.head.message === "Authenticate.") {
              if (!value.head.authorization) {
                DLOG("response head.authorization: "+
                    value.head.authorization);
                done(undefined, server_Error("missing authorization"));
                return;
              }
              if (!value.head.authorization.length) {
                DLOG("response head.authorization: "+
                    value.head.authorization);
                done(undefined, request_Error("no credentials"));
                return;
              }
              done(value);
              return;
            }
            DLOG("response head.message: "+
                value.head.message);
            done(undefined, auth_Error("invalid user"));
            return;
          }
          if (value.head.status === 501) {
            done(undefined, request_Error("URL does not exist"));
            return;
          }
          if (value.head.status === 404) {
            done(undefined, request_Error("not found"));
            return;
          }
          if (value.head.status === 403) {
            done(undefined, request_Error("forbidden"));
            return;
          }
          if (value.head.status === 200 || value.head.status === 201) {
            done(value);
            return;
          }
          DLOG("Unexpected response status: "+ value.head.status);
          done(undefined, server_Error("unexpected status"));
          return;
        }
        done(undefined, ex);
      },
      timeout);
}

/**
 * @param {array} authorization Part of the DCube response header.
 * @returns an array [credentials, error]
 * If the response authentication validation succeeds, the credentials array
 * object is returned ([username, cnonce, response]).  If not, an error is
 * returned as the 1 index in the return array, and the 0 index of the return
 * array is left undefined. Possible errors are:
 *
 *  - DCubeServerError: bad authorization
 *  - DCubePasskeyValidationError: not a string
 *  - DCubePasskeyValidationError: too short
 *  - DCubePasskeyValidationError: too long
 */
function authenticated_response(authorization, passkey) {
  if (authorization.length !== 3) {
    DLOG("response head.authorization: "+ authorization);
    return [undefined, server_Error("bad authorization")];
  }
  if (!USERS[authorization[0]]) {
    USERS[authorization[0]] = user_constructor(authorization[0]);
  }
  if (!USERS[authorization[0]].passkey()) {
    try {
      passkey = exports.validatePasskey(passkey);
    } catch (passkeyErr) {
      return [undefined, passkeyErr];
    }
    USERS[authorization[0]].passkey(passkey);
  }

  return [
    authorization[0],
    USERS[authorization[0]].response(authorization[1]),
    USERS[authorization[0]].cnonce(authorization[2])];
}

function request_constructor(dbname, username) {
  var self = {}, queries = [], sent = 0;

  self.appendQuery = function request_append_query(query) {
    if (typeof query !== "object" || query.constructor !== exports.query) {
      throw new Error("query passed to request.appendQuery() "+
                      "must be a DCube.query object.");
    }
    queries.push(query.valueOf());
  };

  self.send = function request_send() {
    if (sent) {
      throw new Error("Request has already been sent.");
    }
    sent = 1;
    return EVENTS.promise(
        function send_init_promise(beacon) {
          STACK(
            function send_stack(done) {
              send(
                  function send_callback(rv, ex) {
                    var auth;
                    if (rv) {
                      auth = authenticated_response(rv.head.authorization);
                      if (auth[0]) {
                        beacon.fulfill(rv.body);
                      }
                      else {
                        beacon.exception(dcube_Exception(auth[1]));
                      }
                    }
                    else {
                      beacon.exception(dcube_Exception(ex));
                    }
                    done();
                  },
                  {
                    dir: "databases",
                    name: dbname,
                    method: "query",
                    username: username,
                    cnonce: USERS[username].cnonce(),
                    response: USERS[username].response(),
                    body: queries
                  });
            });
        });
  };

  self.constructor = request_constructor;
  return self;
}

function connection_constructor(dbname, username) {
  var self = {};

  self.request = function connection_request() {
    return request_constructor(dbname, username);
  };

  self.constructor = connection_constructor;
  return self;
}

function init_remote_user(finished, cc, dbname, username, query, passkey) {
  send(
      function (rv, ex) {
        var auth;
        if (rv) {
          auth = authenticated_response(rv.head.authorization, passkey);
          if (auth[0]) {
            cc(finished, dbname, username, query);
          }
          else {
            finished(undefined, dcube_Exception("user does not exist"));
          }
        }
        else {
          finished(undefined, dcube_Exception(ex));
        }
      },
      {username: username});
  return true;
}

function init_database(finished, dbname, username) {
  throw new Error("init_database() is not yet implemented.");
}

function init_database_with_query(finished, dbname, username, query) {
  send(
      function (rv, ex) {
        var auth;
        if (rv) {
          if (rv.head.status === 401) {
            finished(null, dcube_Exception("invalid passkey"));
            return;
          }

          auth = authenticated_response(rv.head.authorization);
          if (auth[0]) {
            finished({connection: connection_constructor(dbname, username),
                      results: rv.body});
          }
          else {
            finished(undefined, dcube_Exception(auth[1]));
          }
        }
        else {
          finished(undefined, dcube_Exception(ex));
        }
      },
      {
        dir: "databases",
        name: dbname,
        method: "query",
        username: username,
        cnonce: USERS[username].cnonce(),
        response: USERS[username].response(),
        body: query.valueOf()
      });
  return true;
}

function put_database(finished, dbname, username, db) {
  send(
      function (rv, ex) {
        var auth;

        if (rv) {
          if (rv.head.status === 401) {
            finished(null, dcube_Exception("invalid passkey"));
            return;
          }

          auth = authenticated_response(rv.head.authorization);
          if (auth[0]) {
            finished(rv.body);
          }
          else {
            finished(undefined, dcube_Exception(auth[1]));
          }
        }
        else {
          finished(undefined, dcube_Exception(ex));
        }
      },
      {
        dir: "databases",
        name: dbname,
        method: "put",
        username: username,
        cnonce: USERS[username].cnonce(),
        response: USERS[username].response(),
        body: db 
      });
}

function put_user(finished, target_user, username, user) {
  send(
      function (rv, ex) {
        var auth;

        if (rv) {
          if (rv.head.status === 401) {
            finished(null, dcube_Exception("invalid passkey"));
            return;
          }

          auth = authenticated_response(rv.head.authorization);
          if (auth[0]) {
            finished(rv.body);
          }
          else {
            finished(undefined, dcube_Exception(auth[1]));
          }
        }
        else {
          finished(undefined, dcube_Exception(ex));
        }
      },
      {
        dir: "users",
        name: target_user,
        method: "put",
        username: username,
        cnonce: USERS[username].cnonce(),
        response: USERS[username].response(),
        body: user
      });
}

/**
 * Set the root domain of the DCube server.
 * @param {string} domain A URL (without the "http://").
 */
exports.setDomain = DOMAIN;

/**
 * Set the logger function that will be called with messages to log.
 * @param {function} logger The function to pass logging strings to.
 */
exports.setLogger = function pub_set_logger(logger) {
  DLOGGER = logger;
};

/**
 * Set the debugging switch.
 * @param {mixed} toggle Any truthy or falsy value.
 */
exports.debug = function pub_set_debug(toggle) {
  DEBUG = !!toggle;
  JR.debug(DEBUG);
};

/**
 * Construct a query object.
 * @param {string} action One of get, put, delete, or query.
 */
exports.query = function pub_query_constructor(action) {
  var self = {}, spec = {action: action, statements: []};

  /**
   * Add a statement to this query.
   */
  self.appendStatement = function query_append_statement(a, b, c) {
    spec.statements.push([a, b, c]);
    return self;
  };

  self.valueOf = function query_value_of() {
    return spec;
  };

  self.constructor = exports.query;
  return self;
};

/**
 */
exports.validateUsername = function pub_validate_username(name) {
  if (typeof name !== "string") {
    throw username_validation_Error("not a string");
  }
  if (name.length < 1) {
    throw username_validation_Error("too short");
  }
  if (name.length > 144) {
    throw username_validation_Error("too long");
  }
  if (/\W/.test(name)) {
    throw username_validation_Error("invalid characters");
  }
  return name;
};

/**
 */
exports.validatePasskey = function pub_validate_passkey(passkey) {
  if (typeof passkey !== "string") {
    throw passkey_validation_Error("not a string");
  }
  if (passkey.length < 1) {
    throw passkey_validation_Error("too short");
  }
  if (passkey.length > 144) {
    throw passkey_validation_Error("too long");
  }
  return passkey;
};

/**
 */
exports.validateDatabaseName = function pub_validate_dbname(name) {
  if (typeof name !== "string") {
    throw database_validation_Error("not a string");
  }
  if (name.length < 1) {
    throw database_validation_Error("too short");
  }
  if (name.length > 144) {
    throw database_validation_Error("too long");
  }
  if (/\W/.test(name)) {
    throw database_validation_Error("invalid characters");
  }
  return name;
};

/**
 * throws:
 *  - DCubeUsernameValidationError: not a string
 *  - DCubeUsernameValidationError: too short
 *  - DCubeUsernameValidationError: too long
 *  - DCubeUsernameValidationError: invalid characters
 *  - DCubeDatabaseNameValidationError: not a string
 *  - DCubeDatabaseNameValidationError: too short
 *  - DCubeDatabaseNameValidationError: too long
 *  - DCubeDatabaseNameValidationError: invalid characters
 */
exports.connect = function pub_connect(dbname, username, query, passkey) {
  DLOG("DCube.connect()");
  if (!query) {
    throw new Error("DCube.connect() without a query "+
                    "is not yet implemented.");
  }
  username = exports.validateUsername(username);
  dbname = exports.validateDatabaseName(dbname);
  DLOG("DCube.connect() username: "+ username +" dbname: "+ dbname);
  return EVENTS.promise(
      function init_connect_promise(beacon) {
        DLOG("Init DCube.connect() promise object.");

        STACK(
          function stack_connect_promise(done) {
            DLOG("Execute DCube.connect() inside the stack.");

            function finished(cxn, ex) {
              if (cxn) {
                beacon.fulfill(cxn);
              } else {
                beacon.exception(ex);
              }
              done();
            }

            if (USERS[username]) {
              if (USERS[username].passkey()) {
                init_database_with_query(finished, dbname, username, query);
              }
              else {
                try {
                  passkey = exports.validatePasskey(passkey);
                } catch (e) {
                  finished(null, dcube_Exception(e));
                  return;
                }
                init_remote_user(
                  finished, init_database_with_query, dbname, username, query, passkey);
              }
            }
            else {
              try {
                passkey = exports.validatePasskey(passkey);
              } catch (e) {
                finished(null, dcube_Exception(e));
                return;
              }
              init_remote_user(
                finished, init_database_with_query, dbname, username, query, passkey);
            }
          });
      });
};

/**
 * throws:
 *  - DCubeUsernameValidationError: not a string
 *  - DCubeUsernameValidationError: too short
 *  - DCubeUsernameValidationError: too long
 *  - DCubeUsernameValidationError: invalid characters
 */
exports.createUser = function pub_create_user(username) {
  username = exports.validateUsername(username);
  return EVENTS.promise(
      function create_user_promise(beacon) {

        STACK(
          function stack_create_user_promise(done) {
            send(
              function(rv, ex) {
                if (rv) {
                  beacon.exception(dcube_Exception("user exists"));
                  done();
                }
                else if (ex.name === "DCubeRequestError" &&
                         ex.message === "not found") {
                  send(
                    function (rv, ex) {
                      if (rv) {
                        if (rv.head.status !== 201) {
                          beacon.exception(dcube_Exception("user exists"));
                          done();
                        }
                        else {
                          beacon.fulfill(username);
                          done();
                        }
                      }
                      else {
                        beacon.exception(dcube_Exception(ex));
                        done();
                      }
                    },
                    {dir: "users", name: username, method: "put"});
                }
                else {
                  beacon.exception(dcube_Exception(ex));
                  done();
                }
              },
              {dir: "users", name: username});
          });
      });
};

/**
 * throws:
 *  - DCubeUsernameValidationError: not a string
 *  - DCubeUsernameValidationError: too short
 *  - DCubeUsernameValidationError: too long
 *  - DCubeUsernameValidationError: invalid characters
 *  - DCubeDatabaseNameValidationError: not a string
 *  - DCubeDatabaseNameValidationError: too short
 *  - DCubeDatabaseNameValidationError: too long
 *  - DCubeDatabaseNameValidationError: invalid characters
 */
exports.putDatabase = function pub_put_database(dbname, db, username, passkey) {
  username = exports.validateUsername(username);
  dbname = exports.validateDatabaseName(dbname);
  return EVENTS.promise(
      function put_database_promise(beacon) {

        STACK(
          function stack_put_database_promise(done) {

            function finished(cxn, ex) {
              if (cxn) {
                beacon.fulfill(cxn);
              } else {
                beacon.exception(ex);
              }
              done();
              // cxn and ex are undefined
            }

            if (USERS[username]) {
              if (USERS[username].passkey()) {
                put_database(finished, dbname, username, db);
              }
              else {
                try {
                  passkey = exports.validatePasskey(passkey);
                } catch (e) {
                  finished(null, dcube_Exception(e));
                  return;
                }
                init_remote_user(
                  finished, put_database, dbname, username, db, passkey);
             }
            }
            else {
              try {
                passkey = exports.validatePasskey(passkey);
              } catch (e) {
                finished(null, dcube_Exception(e));
                return;
              }
              init_remote_user(
                finished, put_database, dbname, username, db, passkey);
            }
          });
      });
};

/**
 * throws:
 *  - DCubeUsernameValidationError: not a string
 *  - DCubeUsernameValidationError: too short
 *  - DCubeUsernameValidationError: too long
 *  - DCubeUsernameValidationError: invalid characters
 */
exports.putUser = function put_user(targetUsername, user, username, passkey) {
  username = exports.validateUsername(username);
  targetUsername = exports.validateUsername(username);
  return EVENTS.promise(
      function put_user_promise(beacon) {

        STACK(
          function stack_put_user_promise(done) {

            function finished(cxn, ex) {
              if (cxn) {
                beacon.fulfill(cxn);
              } else {
                beacon.exception(ex);
              }
              done();
            }

            if (USERS[username]) {
              if (USERS[username].passkey()) {
                put_user(finished, dbname, username, user);
              }
              else {
                try {
                  passkey = exports.validatePasskey(passkey);
                } catch (e) {
                  finished(null, dcube_Exception(e));
                  return;
                }
                init_remote_user(
                  finished, put_user, dbname, username, user, passkey);
              }
            }
            else {
              try {
                passkey = exports.validatePasskey(passkey);
              } catch (e) {
                finished(null, dcube_Exception(e));
                return;
              }
              init_remote_user(
                finished, put_user, dbname, username, user, passkey);
            }
          });
      });
};

