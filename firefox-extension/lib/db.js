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

dump(' ... db.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , util = require('util')
  , events = require('events')
  , logging = require('logging')
  , dcube = require('dcube')
  , modeler = require('modeler')

  , Promise = events.Promise
  , has = util.has
  , confirmArray = util.confirmArray
  , confirmObject = util.confirmObject
  , isArray = util.isArray
  , isObject = util.isObject

  , DBError = require('errors')
                .ErrorConstructor('DBError', 'db')
  , log = logging.get('DB')
  , user_sessions = {}
  , open_connections = {}
  , entity_util
  , blocking
  ;

function connection_id(username, dbname) {
  return username +'-'+ dbname;
}

function repr_connections() {
  var rv = '', id;
  for (id in open_connections) {
    if(has(open_connections, id)) {
      rv += (id +', ');
    }
  }
  return rv.slice(0, rv.length -2);
}

function ChangeSet(connection_id) {
  if (!(this instanceof ChangeSet)) {
    return new ChangeSet(connection_id);
  }
  this.connection = connection_id;
  this.originals = {};
  this.updates = {};
  this.set = {};
  this.length = 0;
}

ChangeSet.prototype = {};

ChangeSet.prototype.originals = {};
ChangeSet.prototype.set = {};
ChangeSet.prototype.staging = {};
ChangeSet.prototype.length = 0;

// A JSON string is expected as the value.
ChangeSet.prototype.register = function (k, v, idx) {
  this.originals[k] = [v, idx];
};

// A JSON string is expected as the value.
ChangeSet.prototype.update = function (k, v, idx) {
  var first;

  // This equality check between JSON strings works only because the modeling
  // system keeps the JSON representation of entities consistent.
  if (this.originals[k][0] !== v) {
    first = !this.set[k];
    this.set[k] = [v, idx];
    if (first && (this.length += 1) === 1) {
      events.trigger('db.state',
          {id: this.connection, state: 'clean'}, true);
    }
  }
  else if (this.set[k]) {
    delete this.set[k];
    if ((this.length -= 1) === 0) {
      events.trigger('db.state',
          {id: this.connection, state: 'clean'}, true);
    }
  }
};

ChangeSet.prototype.stage = function () {
  var k;
  for (k in this.set) {
    if (has(this.set, k)) {
      this.staging[k] = this.originals[k];
      this.originals[k] = this.set[k];
    }
  }
  this.set = {};
  this.length = 0;
  events.trigger('db.committing', {id: this.connection});
};

ChangeSet.prototype.revert = function (k) {
  // This equality check between JSON strings works only because the modeling
  // system keeps the JSON representation of entities consistent.
  var set = this.originals[k]
    , changed = (this.set[k] && set[0] !== this.set[k][0]);

  this.originals[k] = this.staging[k];

  // The entity was changed back to its original state while the commit was
  // going over the network.
  if (changed && this.originals[k][0] === this.set[k][0]) {
    delete this.set[k];
    this.length -= 1;
    return;
  }

  // The entity was not changed during network transmission of the commit, but
  // it needs to go back to a 'mutated' state.
  if (!changed) {
    this.set[k] = set;
    this.length += 1;
  }
};

ChangeSet.prototype.commit = function (k) {
  this.staging = {};
  if (this.length === 0) {
    events.trigger('db.committed'
        , {id: this.connection, state: 'clean'}, true);
    return;
  }
  events.trigger('db.committed'
      , {id: this.connection, state: 'mutated'}, true);
};

function Query(connection) {
  var self = {}
    , query = dcube.Query()
    , callbacks = []
    , sent = false
    , $F = function () {}
    ;

  self.start = function () {
    if (sent) {
      throw 'This query has already been committed.';
    }
    var q = query.query(query)
      , override_append = q.append
      ;

    q.append = function (fn) {
      callbacks.push((typeof fn === 'function') ? fn : $F);
      override_append.call(q);
      return self;
    };
    return q;
  };

  self.send = function () {
    if (sent) {
      throw 'This query has already been committed.';
    }
    events.enqueue(function () {
      connection.request(query.resolve(), callbacks);
    }, 0);
    sent = true;
  };

  return self;
}

entity_util = {
  update_array: function (a, b) {
    a = confirmArray(a);
    var i = 0, len = b.length;
    for (; i < len; i += 1) {
      a[i] = this.update(a[i], b[i]);
    }
    return a;
  },

  update_object: function (a, b) {
    a = confirmObject(a);
    var p;
    for (p in b) {
      if (has(b, p)) {
        a[p] = this.update(a[p], b[p]);
      }
    }
    return a;
  },

  update: function (a, b) {
    if (isArray(b)) {
      return this.update_array(a, b);
    }
    if (isObject(b)) {
      return this.update_object(a, b);
    }
    return (a = b);
  }
};

// Entity function object constructor.
// 
// ### Params
//   * `spec` {object}
//     * `spec.key` {string} Key of the entity.
//     * `spec.data` {object} The entity representation as a JS object.
//     * `spec.indexes` {object} The JS object representation of the index
//         entries this entity is indexed under.
//     * `spec.mapper` {function} A function that mutates data structures to
//         meet the schema of this entity.
//   * `connections` {InitConnection object}
function Entity(spec, connection) {
  var key = spec.key
    , stringified = JSON.stringify(spec.data)
    , data = JSON.parse(stringified)
    , indexes = JSON.parse(JSON.stringify(spec.indexes))
    , mapper = spec.mapper
    , rv
    ;

  log.trace('Creating Entity for '+ key);
  connection.changeset.register(key, stringified);

  return function (method) {
    switch (method) {

    case 'key':
      return key;

    case 'entity':
      // Return a cheap copy.
      return JSON.parse(JSON.stringify(data));

    case 'indexes':
      // Return a cheap copy.
      return JSON.parse(JSON.stringify(indexes));

    case 'update':
      mapper(entity_util.update(data, arguments[1]), indexes);
      rv = JSON.stringify(data);
      connection.changeset.update(key, rv, JSON.stringify(indexes));
      break;

    case 'delete':
      data = indexes = null;
      connection.changeset.update(key, null);
      break;

    default:
      throw new Error('"'+ method +'" is an invalid entity operation.');
    }
  };
}

// Create a private connection object.
//
// #### Params
// * `opt` {object}
//   * `opt.id` {string} Connection ID.
//   * `opt.dbname` {string} Name of database.
//   * `opt.session` {function} The DCube user session function object.
//   * `opt.models` {object} Dict of entity modeling constructor functions.
//       One for each model kind.
function InitConnection(opt) {
  if (!(this instanceof InitConnection)) {
    return new InitConnection(opt);
  }
  log.trace('InitConnection() -> '+ opt.id);
  this.id = opt.id;
  this.dbname = opt.dbname;
  this.passkey = opt.passkey;
  this.session = opt.session;
  this.models = opt.models;
  this.changeset = ChangeSet(opt.id);
}

InitConnection.prototype = {};

InitConnection.prototype.multi_model = function (items) {
  var rv = [], i = 0, len = items.length, item;

  for (; i < len; i += 1) {
    item = items[i];
    rv.push(this.model(items.kind, items.key, items.entity, items.index));
  }
  return rv;
};

InitConnection.prototype.model = function (kind, key, ent, index) {
  if (!has(this.models, kind)) {
    throw DBError(new Error('InitConnection.model("'+
            kind +'") is not a valid kind name.'));
  }
  return Entity(this.models[kind](key, ent, index), this);
};

InitConnection.prototype.remote_result = function (callbacks) {
  var self = this;
  return function (result, i) {
    var n, p, item, multi_rv, indexes
      , cb = callbacks[i]
      ;

    if (result.status === 400) {
      log.error('Got a 400 query response status.');
      events.enqueue(function () {
        cb(false, DBError('invalid query'));
      }, 0);
      return;
    }
    if (result.status === 404) {
      events.enqueue(function () { cb(null); }, 0);
      return;
    }

    switch (result.action) {
    case 'get':
      events.enqueue(function () {
        cb(self.model(
            result.indexes.kind
          , result.key
          , result.entity
          , result.indexes
          )
        );
      }, 0);
      break;

    case 'put':
      events.enqueue(function () { cb(true); }, 0);
      break;

    case 'delete':
      events.enqueue(function () { cb(true); }, 0);
      break;

    case 'query':
      multi_rv = [];
      indexes = {};
      for (n = 0; n < result.results.length; n += 1) {
        item = result.results[n];
        for (p in item) {
          if (has(item, p) && p !== 'key' && p !== 'entity') {
            indexes[p] = item[p];
          }
        }
        multi_rv.push(self.model(
            indexes.kind
          , item.key
          , item.entity
          , indexes
          )
        );
      }
      events.enqueue(function () { cb(multi_rv); }, 0);
      break;
    }
  };
};

// All requests come through here.
// ! Do not call this method from the UI thread.
InitConnection.prototype.request = function (queries, callbacks) {
  var promise = this.session('query', this.passkey, this.dbname, queries)
    , self = this
    ;

  log.trace('Making connection request for '+ this.id);
  promise(
    function (results) {
      log.trace('Got connection response for '+ self.id);
      results.forEach(self.remote_result(callbacks));
    }
  , function (err) {
      log.trace('Got connection response for '+ self.id);
      log.debug('Request error.');
      log.debug(logging.formatError(err));
      callbacks.forEach(function (cb) { cb(false, DBError('request error')); });
    }
  );
};

InitConnection.prototype.get = function (keys) {
  return Promise(function (fulfill, except, progress) {
    keys = isArray(keys) ? keys : [keys];
    var i = 0, len = keys.length
      , queries = []
      , callbacks = []
      , results = []
      , exception
      ;

    log.trace('Making "get" request for '+ this.id);

    function combiner(ent, err) {
      if (!ent) {
        len -= 1;
        log.debug(logging.formatError(err));
        if (err && err.message === 'request error') {
          if (!exception) {
            exception = err;
          }
          return;
        }
        log.error('Unexpected error on get.');
        return;
      }

      results.push(ent);
      if (results.length === len) {
        if (!exception) {
          fulfill(results);
        }
        else {
          except(exception);
        }
      }
    }

    for (; i < len; i += 1) {
      queries.push({action: 'get', statements: [['key', '=', keys[i]]]});
      callbacks.push(combiner);
    }

    this.request(queries, callbacks);
  });
};

InitConnection.prototype.query = function () {
  return Query(this);
};

InitConnection.prototype.commit = function (report) {
  var self = this;
  return Promise(function (fulfill, except, progress) {
    var set = self.changeset.set, k
      , keys = []
      , query = dcube.Query()
      , callbacks = []
      , exception
      , results = 0
      ;

    log.trace('Committing '+ self.id);

    function combiner(committed, err) {
      results += 1;

      if (!committed) {
        log.debug(logging.formatError(err));
        self.changeset.revert(keys[results -1]);
        if (err && err.message === 'request error') {
          if (!exception) {
            exception = err;
          }
          return;
        }
        log.error('Unexpected error on commit.');
        return;
      }

      if (results === keys.length) {
        self.changeset.commit();
        if (!exception) {
          fulfill(results);
        }
        else {
          except(exception);
        }
      }
    }

    log.debug('change set -> '+ util.prettify(set));

    for (k in set) {
      if (has(set, k)) {
        keys.push(k);
        query.put(k, set[k][0], JSON.parse(set[k][1]));
        callbacks.push(combiner);
      }
    }

    if (!report) {
      self.changeset.stage();
      self.request(query.resolve(), callbacks);
    }
    else {
      fulfill(query.resolve());
    }
  });
};

function Connection(spec) {
  log.trace('Connection() -> '+ spec.id);
  var dbname = spec.dbname
    , username = spec.username
    , id = spec.id
    , models = modeler.register(username, spec.models)
    , opt = {
        dbname: dbname
      , models: models
      , passkey: spec.passkey
      , session: spec.session
      , id: id
    }
    , cxn = InitConnection(opt)
    ;

  return function (op) {
    log.trace('Requesting connection operation "'+
        op +'"for db "'+ dbname +'".');

    switch (op) {

    case 'username':
      return username;

    case 'dbname':
      return dbname;

    case 'id':
      return id;

    // !Note: If the user creates a new entity, but does not make any changes
    // to the default values, it will not be saved on commit.
    case 'create':
      // arguments[1]: kind
      return cxn.model(arguments[1]);

    case 'get':
      // arguments[1]: key
      // arguments[2]: callback
      return cxn.get(arguments[1], arguments[2]);

    case 'query':
      return cxn.query();

    case 'commit':
      // arguments[1]: report flag
      return cxn.commit(arguments[1]);

    default:
      throw '"'+ op +'" is an invalid connection operation.';
    }
  };
}

blocking = {
    stack: []
  , locked: false

  , done: function () {
      events.enqueue(function () {
        blocking.locked = false;
        blocking.next();
      }, 0);
    }

  , next: function (cc, args, binding) {
      var cont;

      if (typeof cc === 'function') {
        args = args || [];
        args.unshift(blocking.done);
        blocking.stack.push({cc: cc, args: args, binding: binding});
      }

      if (blocking.stack.length && !blocking.locked) {
        blocking.locked = true;
        cont = blocking.stack.shift();
        cont.cc.apply(cont.binding, cont.args);
      }
    }
};

exports.connections = function (callback) {
  blocking.next(function (done) {
    var id, rv = [], cxn;
    for (id in open_connections) {
      if (has(open_connections, id)) {
        cxn = open_connections[id];
        rv.push({
            id: cxn('id')
          , username: cxn('username')
          , dbname: cxn('dbname')
          }
        );
      }
    }
    done();
    callback(rv);
  });
};

exports.getConnection = function (dbname, username, callback) {
  blocking.next(function (done) {
    done();
    if (typeof username === 'function') {
      callback = username;
      callback(open_connections[dbname] || null);
    }
    else {
      callback(open_connections[connection_id(username, dbname)] || null);
    }
  });
};

exports.Query = dcube.Query;

// Open a connection to a database with the given username and passkey.
//
// #### Params
//   * `dbname` {string} The name of the database to connect to.
//   * `models` {object} Dictionary object of
//     data models to use for this connection.
//   * `username` {string} The username of the user to connect.
//   * `passkey` {string} The passkey of the user.
//   * `query` {object} A DCube.Query object or array.
//
// #### Returns a `Promise` function object.
//   * The value passed to fulfill callbacks will be a `Connection` object.
//   * Possible exception messages passed to the exception callbacks include:
//     * 'Request error.' HTTP request error.
//     * 'User does not exist.' The named user could not be found.
//     * 'Authentication denied.' Invalid passkey.
//     * 'Database could not be found.' The db does not exist.
//     * 'Database is restricted.' The user does not have access to the db.
exports.connect = function (dbname, models, username, passkey, query) {
  log.trace('DB.connect('+
        [dbname, 'models', username, 'passkey', 'query'] +')');

  return Promise(function (fulfill, except, progress) {
    blocking.next(function (done) {
      var id = connection_id(username, dbname)
        , spec = {
              dbname: dbname
            , models: models
            , username: username
            , passkey: passkey
            , id: id
          }
        ;

      if (query.constructor === exports.Query) {
        query = query.resolve();
      }
      else if (isArray(query)) {
        query = query;
      }
      else {
        query = [];
      }

      function has_session(session) {
        spec.session = session;
        session('query', passkey, dbname, query)(
          function (results) {
            log.debug('Connection query results -> '+ util.prettify(results));
            user_sessions[username] = session;
            open_connections[id] = Connection(spec);
            log.debug('Update open_connections -> '+ repr_connections());
            done();
            fulfill(open_connections[id]);
          }
        , function (ex) {
            log.debug('Connection error -- '+ ex);
            done();
            except(ex);
          }
        );
      }

      log.debug('open_connections -> '+ repr_connections());

      if (!has(open_connections, id)) {
        log.trace('Creating new connection function.');
        if (!has(user_sessions, username)) {
          log.trace('Creating a new user session.');
          dcube.User(username, has_session);
        }
        else {
          log.trace('Using existing user session.');
          has_session(user_sessions[username]);
        }
        return;
      }
      log.trace('Returning existing connection function.');
      done();
      fulfill(open_connections[id]);
    });
  });
};

function load(cb) {
  require.ensure(['logging', 'dcube'], function (require) {
    cb('db', exports);
  });
}

