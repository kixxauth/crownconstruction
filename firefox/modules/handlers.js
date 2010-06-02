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
Components: false
*/

"use strict";

function require (id) {
  var m = Components.utils.import(
      "resource://crownconstruction/modules/"+ id +".js", null);
  return ((typeof m.exports === "object") ? m.exports : m);
}

// Handy utility.
function isin(x, y) {
  return Object.prototype.hasOwnProperty.call(x, y);
}

// For Mozilla JavaScript modules system.
var EXPORTED_SYMBOLS = ['exports']
  , log = require('logging').getLogger("DCubeServer")
  , DCUBE = require('dcube')
  , CONNECTIONS
  , db
  , connections
  , commits
  , observers
  , items
  , connection_uid_gen
  , exports = {}
  ;

// Initialize the data models in DCube.
(function () {
  var m
    , models = require('models')
    ;

  for (m in models) {
    if (isin(models, m)) {
      DCUBE.db.model(m, models[m]);
    }
  }
}());

// Factory function to create unique identifier generation functions.
function make_uid_gen(prefix) {
  var counter = 0;
  prefix = prefix || '';
  prefix = prefix +'';

  return function () {
    return (prefix + (counter += 1));
  };
}

// Create the uid generation function for connection id's.
connection_uid_gen = make_uid_gen('connection');

function make_cache(db, mutation_observer) {
  var self = {}
    , cache = {}
    , mutations = {}
    , has_changes = false
    ;

  function mutated() {
    var key;
    for (key in mutations) {
      if (isin(mutations, key) && mutations[key]) {
        return true;
      }
    }
    return false;
  }

  function broadcast_mutation(key, data, original) {
    var broadcast = false
      , is_mutated = false
      ;

    if (typeof data !== 'string') {
      data = JSON.stringify(data);
    }

    if (data !== original) {
      mutations[key] = true;
      cache[key].refs += 1;
      if (!has_changes) {
        broadcast = true;
      }
      has_changes = true;
    }
    else {
      mutations[key] = false;
      self.release(key);
      is_mutated = mutated();
      if (is_mutated !== has_changes) {
        broadcast = true;
      }
    }

    if (broadcast) {
      mutation_observer(has_changes);
    }
  }

  function map_to_dict(x, dict, result, parts) {
    var p;
    for (p in x) {
      if (isin(x, p)) {

        parts[p] = parts.slice();
        parts[p].push(p);

        if (isNaN(+p)) {
          result[p] = [];
        }
        else {
          result[p] = {};
        }

        if (typeof x[p] === 'object') {
          arguments.callee(x[p], dict, result[p], parts[p]);
        }
        else {
          result[p] = {};
          result[p].path = parts[p].join('.');
          result[p].value = x[p];

          parts[p].pop();
          dict[parts[p].join('.')] = x;
        }
      }
    }
  }

  function handle_fetch(callback) {
    return function(entity) {
      if (!entity) {
        callback(null);
        return;
      }
      var key = entity('key');

      entity.data = entity('entity');
      entity.original = JSON.stringify(entity.data);
      entity.pointer = {};
      entity.view = {};
      entity.refs = 0;
      map_to_dict(entity.data, entity.pointer, entity.view, [key]);

      cache[key] = entity;
      callback(key);
    };
  }

  function fetch(keys, callback, errback) {
    var i = 0, len = keys.legth,
      handler = handle_fetch(callback);

    for (; i < len; i += 1) {
      db.get(keys[i], handler);
    }
    db.go(errback);
  }

  self.get = function (keys, callback, errback) {
    var i = 0
      , len = keys.legth
      , key
      , entity
      , tofetch = []
      , rv = []
      , count = 0
      ;

    function combine(entity) {
      entity.refs += 1;
      rv.push(entity.view);
      count += 1;
      if (count === len) {
        callback(rv);
      }
    }

    for (; i < len; i += 1) {
      key = keys[i];
      entity = cache[key];
      if (entity) {
        // Rebuild the view in case the entity has been mutated since the view
        // was last built.
        map_to_dict(entity.data, entity.pointer, entity.view, [key]);
        combine(entity);
      }
      else {
        tofetch.push(key);
      }
    }

    fetch(tofetch, function (key) {
      combine(cache[key]);
    }, errback);
  };

  self.query = function(query, callback, errback) {
    var q = db.query()
      , i = 0
      ;

    for (; i < query.length; i += 1) {
      q[query[i][0]](query[i][1], query[i][2]);
    }

    q.append(function (results) {
      var rv = [], n = 0, len = results.length;

      for (; n < len; n += 1) {
        rv.push(results[n]('entity'));
      }
      callback(rv);
    });

    q.go(errback);
  };

  self.release = function (key) {
    cache[key].refs -= 1;
    if (cache[key].refs < 1) {
      delete mutations[key];
      delete cache[key];
    }
  };

  self.refresh = function (key, callback, errback) {
    fetch([key], function (k) {
      callback(cache[k].view);
    }, errback);
  };

  self.update = function (key, fullpath, value) {
    var path = fullpath.split('.')
      , field = path.pop()
      , entity = cache[key]
      ;

    path = path.join('.');
    entity.pointer[path][field] = value;
    broadcast_mutation(key, entity.data, entity.original);
  };

  self.append = function (fullpath, value) {
    var path = fullpath.split('.')
      , i = 0
      , len = path.legth
      , key = path.shift()
      , entity = cache[key]
      , pointer = entity.data
      ;

    for (; i < len; i += 1) {
      pointer = pointer[path[i]];
    }
    pointer.push(value);
    map_to_dict(entity.data, entity.pointer, entity.view, [key]);
    broadcast_mutation(key, entity.data, entity.original);
    return entity.view;
  };

  self.commit = function (callback, errback) {
    var key
      , len = 0
      , count = 0
      , entity
      , stash
      ;

    function handler(entity) {
      var k = entity('key');
      count += 1;
      entity = cache[k];
      entity.original = stash[k];
      broadcast_mutation(k, entity.data, entity.original);
      if (count === len) {
        callback();
      }
    }

    for (key in mutations) {
      if (isin(mutations, key)) {
        len += 1;
        entity = cache[key];
        entity('update', entity.data);
        stash[key] = JSON.stringify(entity.data);
        db.put(entity, handler);
      }
    }

    db.go(function (ex) {
      callback();
      errback(ex);
    });
  };

  return self;
}

function make_connection(dbname, username, passkey, callback, errback) {
  var observers = [];

  function mutation_observer(mutated) {
    var i = 0
      , len = observers.length
      ;

    for (; i < len; i += 1) {
      observers[i](mutated);
    }
  }

  DCUBE.db(dbname, username, passkey)(
    function (x) {
      var self = {}
        , cache = make_cache(x, mutation_observer)
        ;

      self.id = connection_uid_gen();
      self.username = username;
      self.dbname = dbname;
      self.get = cache.get;
      self.update = cache.update;
      self.commit = cache.commit;

      self.query = function (query, callback, errback) {
        var q
          , qs = []
          , parts
          ;

        for (q in query) {
          if (isin(query, q)) {
            parts = q.split(' ');
            qs.push([parts[1], parts[0], query[q]]);
          }
        }

        cache.query(qs, callback, errback);
      };

      self.observe = function (callback) {
        observers.push(callback);
      };

      callback(self);
    }, errback);
}

CONNECTIONS = (function () {
  var self, cache = {};

  self = function (cid) {
    return cache[cid];
  };

  self.push = function (connection) {
    return (cache[connection.id] = connection);
  };

  self.get = function (dbname, username) {
    var uid, cxn;
    for (uid in cache) {
      if (isin(cache, uid)) {
        cxn = cache[uid];
        if (cxn.dbname === dbname && cxn.username === username) {
          return cxn;
        }
      }
    }
    return null;
  };

  self.each = function (fn) {
    var uid;
    for (uid in cache) {
      if (isin(cache, uid)) {
        fn(cache[uid]);
      }
    }
  };

  return self;
}());

db = (function () {
  var self = {};

  self.put = function (callback, type) {
    if (type === 'debug') {
      DCUBE.debug(this.body);
      callback({status: 'ok', body: this.body});
    }
    else if (type === 'domain') {
      DCUBE.domain(this.body);
      callback({status: 'ok', body: this.body});
    }
    else {
      callback({status: 'ok', body: false});
    }
  };

  return self;
}());

connections = (function () {
  var self = {};

  self.put = function (callback) {
    var body = this.body
      , username = body.username
      , dbname = body.dbname
      , connection
      ;

    if (!!(connection = CONNECTIONS.get(dbname, username))) {
      callback({status: 'ok', body: connection.id});
      return;
    }

    make_connection(dbname, username, body.passkey,
      function (cxn) {
        callback({status: 'ok', body: CONNECTIONS.push(cxn).id});
      },
      function (ex) {
        callback({status: 'exception', body: ex +''});
      });
  };

  self.get = function (callback) {
    var rv = [];

    CONNECTIONS.each(function (cxn) {
      rv.push({id: cxn.id, dbname: cxn.dbname, username: cxn.username});
    });

    callback({status: 'ok', body: rv});
  };

  self.query = function (callback, cid) {
    CONNECTIONS(cid).query(this.body.query,
      function (results) {
        callback({status: 'ok', body: results});
      },
      function (ex) {
        callback({status: 'exception', body: ex +''});
      });
  };

  return self;
}());

commits = (function () {
  var self = {};

  self.put = function (callback, cid) {
    CONNECTIONS(cid).commit(function () {
      callback({status: 'ok', body: null});
    },
    function (ex) {
      callback({status: 'exception', body: ex +''});
    });
  };

  return self;
}());

observers = (function () {
  var self = {};

  self.put = function (callback, cid) {
    CONNECTIONS(cid).observe(function (x) {
      callback({status: 'ok', body: x});
    });
  };

  return self;
}());

items = (function (dbname, username) {
  var self = {};

  self.get = function (callback, cid, key) {
    var keys = key ? [key] : this.body.keys;

    CONNECTIONS(cid).get(keys,
      function (views) {
        callback({
          status: 'ok',
          body: views.length === 1 ? views[0] : views
        });
      },
      function (ex) {
        callback({status: 'exception', body: ex +''});
      });
  };

  self.post = function (callback, cid, key) {
    CONNECTIONS(cid).update(key, this.body.path, this.body.value);
    callback({status: 'ok', body: null});
  };

  return self;
}());

exports.mapping = [
    [/db\/connections\/(\w+)\/commits\//, commits]
  , [/db\/connections\/(\w+)\/observers\//, observers]
  , [/db\/connections\/(\w+)\/items\/(\w*)/, items]

  // get all connections, put a new connection, or query a connection by id
  , [/db\/connections\/(\w*)/, connections]

  // '/db/debug' to set the debug mode (truthy or falsy body value).
  // '/db/domain' to set the domain name for DCube to use.
  , [/db\/(\w+)/, db]
];

