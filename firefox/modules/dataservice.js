
function walk_tree(node, visitor) {
  var nodes = [node], r;
  while (nodes.length) {
    r = visitor(nodes.shift());
    if (r) {
      nodes = nodes.concat(r);
    }
  }
}

function leaf_mutator(sep) {
  return function (path, mutable, value) {
    var parts = path.split(sep),
        len = parts.length,
        i, name;

    for (i = 0; i < len; i += 1) {
      name = parts[i];
      if (!mutable.hasOwnProperty(name)) {
        mutable[name] = {};
      }
      mutable = mutable[name];
    }
    mutable = value;
  }
}

function build_request(nodes, req) {
  var query, node, index,
      n, i, len = nodes.length;

  for (i = 0; i < len; i += 1) {
    node = nodes[i];
    query = DDD.query(put);
    
    for (n = 0; n < node.indexes.length; n += 1) {
      index = node.indexes[i];
      query.appendStatement(index.index, "=", index.value);
    }

    query.appendStatement("key", "=", node.key);
    query.appendStatement("entity", "=", node.entity);
    req.appendQuery(query);
  }

  return req;
}




var BOOTED = false, DOMAIN, DEBUG = false, LOG;

// will get passed:
//  - not ok
//  - bad response
function handle_response_exception_debug(beacon, exception) {
}

function handle_response_debug(beacon, value) {
}

function handle_response_exception(beacon, exception) {
}

function handle_response(beacon, value) {
}

/**
 * @param {object} spec The options specification.
 * @param {number} [spec.timeout = 10000] The request time out in milliseconds.
 * @param {string} [spec.dir = ""] The path directory appended onto the domain.
 * @param {string} [spec.name = ""] The name of the target user or db.
 * @param {string} [spec.method = "get"] The DCube method get|put|query|delete.
 * @param {string} [spec.username] Username for an authenticated request.
 * @param {string} [spec.cnonce] Cnonce for an authenticated request.
 * @param {string} [spec.response] Response for an authenticated request.
 * @param {object|array} [spec.body] The request body.
 *
 * If a cnonce or response is present, they both must be present.
 * A username may be present without a cnonce or response.
 *
 * exceptions passed to exception handler:
 *  - Error: internal
 */
function dcube_send(spec) {
  spec = spec || {};
  var timeout = spec.timeout || 10000,
      dir = spec.dir || "",
      name = spec.name || "",
      url = DOMAIN +"/"+ dir,
      payload = {head: {method: spec.method || "get"}};

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

  return EVENTS.promise(function (beacon) {
      try {
        JR.post(url, payload,
          function (serial_number, value, exception) {
            if (DEBUG) {
              if (exception) {
                handle_response_exception_debug(beacon, exception);
                return;
              }
              handle_response_debug(beacon, value);
              return;
            }
            if (exception) {
              handle_response_exception(beacon, exception);
              return;
            }
            handle_response(beacon, value);
          });
      });
    } catch(e) {
      LOG.error(e);
      beacon.exception(new Error("internal"));
    }
}

/**
 * throws:
 *  - AssertionError: DCube domain config is not a string.
 *  - AssertionError: DCube domain is not configured
 */
function init() {
  LOG.debug("DCube service init.");
  DOMAIN = CONFIGS.get("data-url");
  ASSERT.equal(typeof(DOMAIN), "string",
      "DCube domain config is not a string.");
  ASSERT.notEqual(DOMAIN, CONFIGS.INVALID_CONFIG,
      "DCube domain is not configured.");

  JR.setLogger(
      function (msg) {
        LOG.debug("JSONRequest:\n"+ msg +"\n");
      });
}

/**
 * Boot this module from the bootstrapper.
 * @param {object} [spec] The options specification object.
 */
exports.boot = function pub_boot(spec) {
  if (BOOTED) {
    return;
  }
  BOOTED = true;

  spec = spec || {};

  LOG = spec.LOG || {
          fatal: function Logger_fatal(string) {
            dump("dataservice fatal: "+ string +"\n");
          },
          error: function Logger_error(string) {
            dump("dataservice error: "+ string +"\n");
          },
          warn: function Logger_warn(string) {
            dump("dataservice warn: "+ string +"\n");
          },
          info: function Logger_info(string) {
            dump("dataservice info: "+ string +"\n");
          },
          config: function Logger_config(string) {
            dump("dataservice config: "+ string +"\n");
          },
          debug: function Logger_debug(string) {
            dump("dataservice debug: "+ string +"\n");
          },
          trace: function Logger_trace(string) {
            dump("dataservice trace: "+ string +"\n");
          }
        };
};

/**
 * Set the debugging switch.
 * @param {mixed} toggle Any truthy or falsy value.
 */
exports.debug = function pub_set_debug(toggle) {
  DEBUG = !!toggle;
  JR.debug(DEBUG);
};

exports.dQuery = (function () {
  function self() {
  }

  function initialized_open(spec) {
    LOG.debug("DCube service connect.");

    dcube_send();
  };

  /**
   * throws:
   *  - AssertionError: DCube domain config is not a string.
   *  - AssertionError: DCube domain is not configured
   */
  self.open = function dq_open(spec) {
    init();
    self.open = initialized_open;
    self.open(spec);
  };

  return self;
}());
