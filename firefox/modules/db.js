let EXPORTED_SYMBOLS = ["db"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://crownconstruction/modules/lib.js");
Cu.import("resource://crownconstruction/modules/toolkit.js");
Cu.import("resource://crownconstruction/modules/log.js");
Cu.import("resource://crownconstruction/modules/configs.js");
Cu.import("resource://crownconstruction/modules/model.js");

const DATASTORE_FILE = "crownconstruction_data.sqlite";

const TRANSACTION_RECORD_SCHEMA =
  "CREATE TABLE transaction_record(" +
  " uid STRING," +
  " datetime STRING," +
  " seq STRING," +
  " message STRING," +
  " user STRING," +
  " state INT," +
  " serialized TEXT,"+
  " PRIMARY KEY (uid))";



/** Entity */
function Entity(key, props)
{
  this.key = function Ent_key() {
    return key;
  };
  this.persistedProperties = props;
}

/** Key */
function Key()
{
  let parts = arguments.length == 1 ? arguments[0].split(" ") : arguments;
  this.realm = parts[0];
  assert((typeof(this.realm) == "string"), "invalid key.realm "+ this.realm);
  assert((typeof(parts[1]) == "string"), "invalid kind "+ parts[1]);
  this.class = model.getClassForKind(parts[1]);
  assert((typeof(this.class) == "string"), "invalid key.class "+ this.class);
  this.kind = parts[1];
  assert((typeof(this.kind) == "string"), "invalid key.kind "+ this.kind);
  this.uri = parts[2];
  assert((typeof(this.uri) == "string"), "invalid key.uri "+ this.uri);
}

/**
 * @constructor
 * Create a Transaction object.
 */
function Transaction(user, message, content)
{
  this.uid = getUUID();
  this.seq = new Date().getTime();
  this.datetime = getUTCDateTime();
  this.message = message;
  this.user = user;
  this.content = content;
}

let db = {};
db.connection = null;
db.logger = null;
db.cache = {};
db.updates = [];
db.Entity = Entity;
db.Key = Key;
db.Transaction = Transaction;

db.CACHE_LOCKED_ERROR = "locked";

let _burning = false;

db.launch = function DB_launch()
{
  if(_burning)
    return;

  db.logger = log.getLogger("db");
  db.connection = db.getConnection();

  _burning = true;
};

let _cache_locked = false;

db.cacheLocked = function DB_catchLocked() {
  return _cache_locked;
};

db.lockCache = function DB_lockCache() {
  _cache_locked = true;
};

db.releaseCache = function DB_releaseCache() {
  _cache_locked = false;
};

/** create an new entity instance by class */
db.createNew = function DB_createNewEntity(kind)
{
  let props = model.hasKind(kind);
  assert(props, "A model for kind '"+ kind +"' could not be found.");
  if(!props) {
    throw new TypeError("A model for kind '"+ kind
        +"' could not be found.");
  }

  let key = new Key(configs.get("realm"), kind, getUUID());
  let ent = new Entity(key, {});
  db.cache[key.uri] = ent;
  return key;
};

db.getKey = function DB_get(uri)
{
  assert(db.cache[uri],
      "expected to find entity " + uri +" in the cache");
  if(!db.cache[uri]) {
    throw new Error("Entity '"+ uri +"' does not exist in the cache.");
  }
  
  return db.cache[uri].key();
};

db.get = function DB_getattrs(key)
{
  assert(db.cache[key.uri],
      "expected to find entity " + key.uri +" in the cache");
  if(!db.cache[key.uri]) {
    throw new Error("Entity '"+ key.uri +"' does not exist in the cache.");
  }

  let rv = {key: db.cache[key.uri].key};

  let props = model.getProperties(key.kind);
  for(let p in props)
    rv[p] = db.cache[key.uri][p] || null;

  return rv;
}

db.setattr = function DB_setattr(key, property, value)
{
  if(db.cacheLocked()) {
    throw new Error(db.CACHE_LOCKED_ERROR);
  }

  assert(db.cache[key.uri],
      "expected to find entity " + key.uri +" in the cache");
  if(!db.cache[key.uri]) {
    throw new Error("Entity '"+ key.uri +"' does not exist in the cache.");
  }

  if(!model.hasProperty(key.kind, property))
  {
    assert(false, 
        "kind "+ key.kind +" does not have property "+ property);
    throw new Error("kind '"+ key.kind +"' does not have property '"+
        property +"'");
  }
  
  let range = model.getRange(key.kind, property);

  value = value || null;
  let val = null;

  //if(value)
   // tk.dump("constructorName", value.constructor.name);

  if(model.getCardinal(key.kind, property) == 1) {
    try {
      val = db.validatePrimitive(range, value);
    } catch(e) {
      throw new TypeError("Value '"+ value +"' for "+ key.kind
        +"."+ property +" "+ e.message);
    }
  }
  else
  {
    try {
      val = db.validateList(range, value);
    } catch(e) {
      throw new TypeError("Value '"+ value +"' for "+ key.kind
        +"."+ property +" "+ e.message);
    }
  }

  db.cache[key.uri][property] = val;
  if(db.updates.indexOf(db.cache[key.uri]) == -1)
    db.updates.push(db.cache[key.uri]);
};

db.validatePrimitive = function DB_validPrimitive(range, value)
{
  //if(value)
   // tk.dump("valueConstructor", value.constructor.name);

  if(range == "literal" && value == null || typeof(value) == "string")
    return value || null;

  if(range != "literal" && value == null || value.constructor == Key)
    return value.uri || null;

  if(range == "literal") {
    throw TypeError("must be a string or null");
  }
  throw TypeError("must be a Key or null");
};

db.validateList = function DB_validList(range, value)
{
  //if(value)
   // tk.dump("valueConstructor", value.constructor.name);
  //tk.dump("isArray", tk.isarray(value));

  if(value != null && !tk.isarray(value)) {
    throw TypeError("must be a list or null");
  }
  if(!value)
    return null;

  let rv = [];
  let iter = Iterator(value);
  for(let [i, val] in iter)
  {
    try {
      rv.push(db.validatePrimitive(range, val));
    } catch(e) {
      throw new TypeError("item "+ e.message);
    }
  }
  return rv;
};

db.set = function DB_setattrs(key, values)
{
  if(db.cacheLocked()) {
    throw new Error(db.CACHE_LOCKED_ERROR);
  }

  assert(db.cache[key.uri],
      "expected to find entity " + key.uri +" in the cache");
  if(!db.cache[key.uri]) {
    throw new Error("Entity '"+ key.uri +"' does not exist in the cache.");
  }
  if(typeof values != "object") {
    throw new Error("values passed to db.set() must be a dictionary");
  }

  for(let prop in values)
    db.setattr(key, prop, values[prop]); 
};

db.getattr = function DB_getattr(key, property)
{
  assert(db.cache[key.uri],
      "expected to find entity " + key.uri +" in the cache");
  if(!db.cache[key.uri]) {
    throw new Error("Entity '"+ key.uri +"' does not exist in the cache.");
  }

  if(!model.hasProperty(key.kind, property)) {
    throw new Error("Kind '"+ key.kind +"' does not have property '"+
        property +"'");
  }

  return db.cache[key.uri][property] || null;
};

db.all = function DB_all(kind)
{
  let schema = db.buildSchema(kind);
  let sql = db.buildSQL(kind, schema.columns, schema.joins);
  let stmt = db.createStatement(sql);
  
  while(stmt.executeStep())
    db.updateQueryResults(schema.columns, stmt.row, results);
};

db.updateQueryResults = function DB_updateQueryResults(cols, row, results)
{
};

db.buildSchema = function DB_buildSchema(kind)
{
  let props = model.getProperties(kind);
  assert(props, "A model for kind '"+ kind +"' could not be found.");
  if(!props) {
    throw new TypeError("A model for kind '"+ kind
        +"' could not be found.");
  }

  let cols = [{table: kind, column: "uri"}];
  let joins = [];

  for(let p in props)
  {
    // a 1 to 1 relationship
    if(model.getCardinal(kind, p) == 1)
      cols.push({table: kind, column: p});

    // a 1 to many relationship or many to many relationship
    else {
      cols.push({table: kind +"_"+ p, column: p});
      joins.push({root: kind, table: kind +"_"+ p});
    }
  }

  return {columns: cols, joins: joins};
};

db.schema = function DB_schema()
{
  let tables = {};

  for(let kind in model.kinds)
  {
    tables[kind] = ["uri"];
    let props = model.getProperties(kind);
    for(let p in props)
    {
      if(model.getCardinal(kind, p) == 1)
        tables[kind].push(p);
      else
        tables[kind+"_"+p] = [kind, p];
    }
  }

  return tables;
};

/**
 * construct an SQL select statement
 * @param {string} The root table name selecting from
 * @param {array} an array of objects repr columns to select in the form
 *   table: the table name
 *   column: the col name
 * @param {array} an array of objects repr joins in the form
 *   root: the table name of the root entity
 *   table: the name of the join table
 */
db.buildSQL = function DB_buildSQL(table, selectProperties, joins)
{
  let sql = "SELECT ";

  function creatcol(col) {
    let rv = col.table +"."+ col.column +" as "+
        col.table +"_"+ col.column;
    return rv;
  }

  let cols = [cretecol(c) for each(c in selectProperties)];
  sql += cols.join(",") +" FROM "+ table;

  if(!joins.length)
    return sql;

  sql += "\n";

  function createjoin(join) {
    let rv = "INNER JOIN "+ join.table +" on "+
        join.root +".uri="+ join.table +"."+ join.root;
    return rv;
  }

  let js = [createjoin(j) for each(j in joins)];

  return sql + js.join("\n");
};

db.TRANSACTION_STATE =
{
  /** transaction has never been attempted locally or remotely */
  init: 0,

  /** transaction has not been committed locally or remotely and
   * was aborted locally */
  localIncomplete: 1,

  /** transaction has been committed locally, but not remotely */
  localNew: 2,

  /** transaction has been commited remotely, but not yet locally */
  remoteNew: 3,

  /** transaction has been committed remotely,
   * but caused an error locally */
  localError: 4,

  /** transaction is committed locally and remotely, but not confirmed */
  remoteConfirm: 5,

  /** transaction is completed locally and remotely and confirmed */
  complete: 7
};

db.executeStatement = function DB_executeStatement(stmt, sql)
{
  try {
    stmt.execute();
  } catch(e if e.result == Components.results.NS_ERROR_FAILURE) {
    assert(false, "datastore SQL error: "+ db.connection.lastErrorString
        +" in "+ sql);
    throw new Error("datastore SQL error: "+ db.connection.lastErrorString
        +" in "+ sql);
  }
};

db.indexof = function DB_indexOf(uri, kind)
{
  assert(typeof uri == "string",
      "expecting uri "+ uri +" to be a string.");

  let sql = "SELECT rowid FROM "+ kind
    +" WHERE uri=:uri";
  let stmt = db.connection.createStatement(sql);
  stmt.params.uri = uri;

  try {
    while(stmt.executeStep())
      return stmt.row.rowid;
  } catch(e if e.result == Components.results.NS_ERROR_FAILURE) {
    assert(false, "datastore SQL error: "+ db.connection.lastErrorString
        +" in "+ sql);
    throw new Error("datastore SQL error: "+ db.connection.lastErrorString
        +" in "+ sql);
  }
  return 0;
};

/** @returns {object}
 *   table: the name of the table
 *   keycol: the name of the key col in the table
 *   valuecol: the name of the value col in the table
 */
db.getFKMeta = function DB_getFKMeta(kind, propname)
{
  let rv =
  {
    table: kind +"_"+ propname,
    keycol: kind,
    valuecol: propname
  };
  return rv;
};

/**
 * @returns {object}
 *   table: the name of the table
 *   colname: the name of the column
 */
db.getMeta = function DB_getMeta(kind, propname)
{
  let rv =
  {
    table: kind,
    colname: propname,
  };
  return rv;
};

/** Create and store a transaction */
db.commit = function DB_commit(user, message, callback)
{
  db.lockCache();

  //tk.dump("updates", tk.dumpObject(db.updates));

  let entities =
    [db.normalizeEntity(ent) for each(ent in db.updates)];

  //tk.dump("allEntities", tk.dumpObject(entities));

  let cleanEntities = [ent for each(ent in entities) if(ent)];

  //tk.dump("cleanEntities", tk.dumpObject(cleanEntities));

  // if there are no items in the operations list, return false;
  if(!cleanEntities.length)
    return false;

  let txn = new Transaction(user, message, cleanEntities);
  //tk.dump("transaction", tk.dumpObject(txn));

  // create a new thread to store the transaction
  let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  timer.initWithCallback(function DB_commitThread() {
        db.applyTransactionThread(txn, callback);
      }, 1, Ci.nsITimer.TYPE_ONE_SHOT);
}

db.normalizeEntity = function DB_normalizeEntity(aEntity)
{
  let props = model.getProperties(aEntity.key().kind);
  assert((typeof(props) == "object"), "invalid Entity.key().kind");

  let persistedProps = aEntity.persistedProperties;
  let ops = [];
  for(let p in props)
  {
    let prop = props[p];
    let stored = persistedProps[p] || null;
    let current = aEntity[p] || null;
    let card = model.getCardinal(aEntity.key().kind, p);

    let stored_isarray = tk.isarray(stored);
    let current_isarray = tk.isarray(current);

    if(card == 1 && current_isarray)
    {
      assert(false, "cannot assign a list to "+ aEntity.key().kind
          +"."+ p +" with cardinality of 1");
      throw new Error("cannot assign a list to "+ aEntity.key().kind
          +"."+ p +" with cardinality of 1");
    }

    if(card != 1 && current && !current_isarray)
    {
      assert(false, "must assign a list or null to "+ aEntity.key().kind
          +"."+ p +" with cardinality of *");
      throw new Error("must assign a list or null to "+ aEntity.key().kind
          +"."+ p +" with cardinality of *");
    }

    stored = stored_isarray ? stored : [stored];
    current = current_isarray ? current : [current];

    let len = current.length > stored.length ? current.length : stored.length;
    for(let i = 0; i < len; i++)
    {
      let sval = stored[i] || null;
      let cval = current[i] || null;
      let op = db.normalizeOperation(prop, sval, cval);
      if(op)
        ops.push(op);
    }
  }

  if(!ops.length)
    return null;

  return {
    uri: aEntity.key().uri,
    class: aEntity.key().class,
    operations: ops
  };
}

db.normalizeOperation = function DB_normalizeOperation(uri, stored, current)
{
  stored = stored || null;
  current = current || null;

  if(stored == current)
    return null;

  if(stored == null)
    return ["append", uri, current];

  if(current == null)
    return ["remove", uri, current];

  return ["update", uri, current];
};

/**
 * Apply the transaction on a background thread
 * todo: we need a garbage collection routine
 */
db.applyTransactionThread = function DB_applyTxnThread(transaction, callback)
{
  // apply the transaction locally
  let state = db.applyTransaction(transaction, db.TRANSACTION_STATE.init);
  if(state != db.TRANSACTION_STATE.localNew)
  {
    db.releaseCache();
    assert(false, "failed bringing transaction to state "+
        "db.TRANSACTION_STATE.localNew");
    db.logger.fatal("Applying initialized transaction failed.");
    callback(false);
    return true;
  }
  db.updateCache();
  // return the normalized transaction to the callback
  callback(transaction);
  return true;
};

db.updateCache = function DB_updateCache()
{
  tk.dump("before", tk.dumpObject(db.cache));
  db.updates = [];

  for(let uri in db.cache)
  {
    for(let p in db.cache[uri])
    {
      if(p != "persistedProperties" && p != "key")
        db.cache[uri].persistedProperties[p] = db.cache[uri][p];
    }
  }

  db.releaseCache();
  tk.dump("after", tk.dumpObject(db.cache));
};

/**
 * Apply a transaction to the local datastore.
 *
 * @param {object} a dcube.Transaction object
 * @param {int} one of db.TRANSACTION_STATE representing
 *   the current state of the transaction
 *
 * @returns false on failure or one of db.TRANSACTION_STATE
 */
db.applyTransaction = function DB_applyTxn(aTransaction, aState)
{
  // fast track if the caller is only setting the state of an
  // existing transaction
  if(aState == db.TRANSACTION_STATE.remoteConfirm)
  {
    // todo: we need to rollback transactions in state == 4
    var sql = "UPDATE OR ABORT transaction_record SET "+
        "state=:state WHERE uid=:uid";
    var stmt = db.connection.createStatement(sql);
    stmt.params.state = aState;
    stmt.params.uid = aTransaction.uid;
    try {
      db.executeStatement(stmt, sql);
    } catch(e) {
      db.logger.fatal(e.message);
      assert(false, e.message);
      return db.TRANSACTION_STATE.localError;
    }
    return db.TRANSACTION_STATE.complete;
  }

  // a transaction happens within an SQLite transaction
  db.connection.beginTransaction();

  // flag that will be false if no changes were made
  var entityCommitted = false;
  var rollback = false;
  // for each entity in the transcation content:
  try
  {
    aTransaction.content.forEach(function DB_applyEntity(ent)
      {
        if(rollback)
          return;

        if(typeof(ent.class) != "string") {
          db.logger.warn("invalid class uri '"+
            ent.class +"' in db.createAndStoreTransaction()");
          rollback = true;
          db.connection.rollbackTransaction();
          assert(false, "invalid class uri: "+ ent.class);
          return;
        }
        let kind = model.getKindForClass(ent.class);
        // assert the dataclass exists in our ontology

        if(!kind || typeof(kind) != "string") {
          db.logger.warn("kind does not exist for class '"+
            ent.class +"' in db.createAndStoreTransaction()");
          rollback = true;
          db.connection.rollbackTransaction();
          assert(false, "kind does not exist for class: "+ ent.class);
          return;
        }

        if(typeof(ent.uri) != "string") {
          db.logger.warn("invalid entity uri '"+
            ent.uri +"' in db.createAndStoreTransaction()");
          rollback = true;
          db.connection.rollbackTransaction();
          assert(false, "invalid entity uri: "+ ent.uri);
          return;
        }
        let index = db.indexof(ent.uri, kind);

        if(!tk.isarray(ent.operations)) {
          db.logger.warn("entity operations is not a list: '"+
            ent.operations +"' in db.createAndStoreTransaction()");
          rollback = true;
          db.connection.rollbackTransaction();
          assert(false, "entity operations is not a list: "+ ent.operations);
          return;
        }

        // updates to make to the entity
        let updateSet = {updates: []};
        let insertSet = {updates: [], cols: []};

        // the entity has never been stored before
        if(!index) {
          var meta = db.getMeta(kind, "uri");
          insertSet.cols.push(meta.colname);
          insertSet.updates.push(":"+ meta.colname);
          insertSet[meta.colname] = ent.uri;
        }

        let ops = Iterator(ent.operations);
        for(let [i, op] in ops)
        {
          let method = op[0];
          if(typeof(method) != "string") {
            db.logger.warn("method '"+ op[1] +"' is invalid data operation "+
              "in db.createAndStoreTransaction()");
            rollback = true;
            db.connection.rollbackTransaction();
            assert(false,
                "method '"+ op[1] +"' is invalid data operation");
            return;
          }

          if(!index && (method == "update" || method == "remove")) {
            db.logger.warn(method +" a property on a non-existing entity '"+
                ent.uri +"'");
            rollback = true;
            db.connection.rollbackTransaction();
            assert(false,
                method +" a property on a non-existing entity");
            return;
          }

          tk.dump("predicate", op[1]);
          let propname = model.getPropertyName(kind, op[1]);
          tk.dump("property", propname);
          
          if(typeof(propname) != "string") {
            db.logger.warn(
                "property '"+ op[1] +"' does not exist for class '"+
              ent.class +"' in db.createAndStoreTransaction()");
            rollback = true;
            db.connection.rollbackTransaction();
            assert(false,
                "property '"+op[1]+"' does not exist for class: "+ent.class);
            return;
          }

          let target = op[2];
          if(typeof(target) != "string") {
            db.logger.warn("invalid operation target '"+
              target +"' in db.createAndStoreTransaction()");
            rollback = true;
            db.connection.rollbackTransaction();
            assert(false, "invalid operation target: "+ target);
            return;
          }

          let cardinal = model.getCardinal(kind, propname);
          let range = model.getRange(kind, propname);
          
          if(method == "update")
          {
            // if 1 to 1 relationship; add change to the update statement
            if(cardinal == 1)
            {
              var meta = db.getMeta(kind, propname);
              updateSet.updates.push(meta.colname +"=:"+ meta.colname);
              updateSet[meta.colname] = target;
              continue;
            }

            // if 1 to many [??? or many to many]; create and execute update
            if(range != "literal"){
              rollback = true;
              assert(false, "unexpected many to many relationship");
              return;
            }
            var meta = db.getFKMeta(kind, propname);
            // we ignore any unique matches, because if the key value pair
            // has already been updated to match this operation, we don't
            // need to do anything to maintain expected consistency
            var sql = "UPDATE OR IGNORE "+ meta.table
              +" SET "+ meta.valuecol +"=:val"
              +" WHERE "+ meta.keycol +"=:uri";

            tk.dump("sql", sql);

            var stmt = db.connection.createStatement(sql);
            stmt.params.val = target;
            stmt.params.uri = ent.uri;
            try {
              db.executeStatement(stmt, sql);
            } catch(e) {
              rollback = true;
              db.connection.rollbackTransaction();
              db.logger.warn(e.message);
              assert(false, e.message);
              return;
            }
            stmt.finalize();
            continue;
          }

          if(method == "remove")
          {
            // if 1 to 1 relationship; add null change to the update statement
            if(cardinal == 1)
            {
              var meta = db.getMeta(kind, propname);
              updateSet.updates.push(meta.colname +"=:"+ meta.colname);
              updateSet[meta.colname] = null;
              continue;
            }

            // if 1 to many or many to many; create and execute delete
            var meta = db.getFKMeta(kind, propname);
            var sql = "DELETE FROM "+ meta.table +" WHERE "+
                meta.keycol +"=:uri AND "+ meta.valuecol +"=:val";

            tk.dump("sql", sql);

            var stmt = db.connection.createStatement(sql);
            stmt.params.val = target;
            stmt.params.uri = ent.uri;
            try {
              db.executeStatement(stmt, sql);
            } catch(e) {
              rollback = true;
              db.connection.rollbackTransaction();
              db.logger.warn(e.message);
              assert(false, e.message);
              return;
            }
            stmt.finalize();
            continue;
          }

          if(method == "append")
          {
            // if 1 to 1 relationship;
            // add change to the insert or update statement
            if(cardinal == 1)
            {
              var meta = db.getMeta(kind, propname);
              if(index) // entity already exists
              {
                assert((updateSet.updates.indexOf(
                        meta.colname +"=:"+ meta.colname) == -1),
                    "colname "+ meta.colname +" is a duplicate.");

                updateSet.updates.push(meta.colname +"=:"+ meta.colname);
                updateSet[meta.colname] = target;
                continue;
              }
              // entity does not yet exist in our db
              assert((insertSet.cols.indexOf(meta.colname) == -1),
                  "colname "+ meta.colname +" is a duplicate.");
              insertSet.cols.push(meta.colname);
              insertSet.updates.push(":"+ meta.colname);
              insertSet[meta.colname] = target;
              continue;
            }

            // if 1 to many or many to many; create and execute insert
            var meta = db.getFKMeta(kind, propname);

            // if the property key-value already exists, we skip it
            var sql = "INSERT OR IGNORE INTO "+ meta.table +" ("+
                meta.keycol +","+ meta.valuecol +") VALUES (:uri,:val)";

            tk.dump("sql", sql);

            var stmt = db.connection.createStatement(sql);
            stmt.params.val = target;
            stmt.params.uri = ent.uri;
            try {
              db.executeStatement(stmt, sql);
            } catch(e) {
              rollback = true;
              db.connection.rollbackTransaction();
              db.logger.warn(e.message);
              assert(false, e.message);
              return;
            }
            stmt.finalize();
            continue;
          }
        }
        
        // we should not allow a set of insert operations along with a set
        // of update operations on properties with a cardinality of 1
        if(updateSet.updates.length && insertSet.updates.length) {
          rollback = true;
          db.connection.rollbackTransaction();
          tk.dump("insert and update", tk.dumpObject(aTransaction));
          tk.dump("inserts", tk.dumpObject(insertSet));
          tk.dump("updates", tk.dumpObject(updateSet));
          assert(false, "insert and update statemtents on the same table");
          return;
        }

        if(updateSet.updates.length)
        {
          var meta = db.getMeta(kind, null);
          let sql = "UPDATE "+ meta.table +" SET "+
              updateSet.updates.join(",") +" WHERE rowid=:index";

          tk.dump("sql", sql);

          var stmt = db.connection.createStatement(sql);
          stmt.params.index = index;
          for(let p in updateSet) {
            if(p != "updates")
              stmt.params[p] = updateSet[p];
          }

          try {
            var result = db.executeStatement(stmt, sql);
          } catch(e) {
            rollback = true;
            db.connection.rollbackTransaction();
            db.logger.warn(e.message);
            assert(false, e.message);
            return;
          }
          stmt.finalize();
        }

        if(insertSet.updates.length)
        {
          var meta = db.getMeta(kind, null);
          //tk.dump("meta", tk.dumpObject(meta));

          let sql = "INSERT INTO "+ meta.table +" ("+ insertSet.cols.join(",")
              +") VALUES ("+ insertSet.updates.join(",") +")";

          tk.dump("sql", sql);

          var stmt = db.connection.createStatement(sql);
          for(let p in insertSet) {
            if(p != "updates" && p != "cols")
              stmt.params[p] = insertSet[p];
          }

          try {
            var result = db.executeStatement(stmt, sql);
          } catch(e) {
            rollback = true;
            db.connection.rollbackTransaction();
            db.logger.warn(e.message);
            assert(false, e.message);
            return;
          }
          stmt.finalize();
        }

        // at least 1 entity was written
        entityCommitted = true;
      });
  } catch(e) {
    rollback = true;
    if(db.connection.transactionInProgress)
      db.connection.rollbackTransaction();
    db.logger.error(e.message +" "+ e.fileName +" line:" + e.lineNumber);
    Cu.reportError(e);
  }

  // create the SQL transaction record statement and bind params
  var insertsql = "INSERT INTO transaction_record "+
      "VALUES (:uid, :datetime, :seq, :message, :user, :state, :serial)";

  tk.dump("sql", insertsql);

  var stmt = db.connection.createStatement(insertsql);
  stmt.params.uid = aTransaction.uid;
  stmt.params.datetime = aTransaction.datetime;
  stmt.params.seq = aTransaction.seq;
  stmt.params.message = aTransaction.message;
  stmt.params.user = aTransaction.user;
  stmt.params.serial = JSON.stringify(aTransaction.content);

  if(!rollback && entityCommitted)
  {
    if(aState == db.TRANSACTION_STATE.remoteNew)
      stmt.params.state = db.TRANSACTION_STATE.complete;
    else
      stmt.params.state = db.TRANSACTION_STATE.localNew;

    try {
      db.executeStatement(stmt, insertsql);
    } catch(e) {
      stmt.finalize();
      db.connection.rollbackTransaction();
      db.logger.fatal(e.message);
      assert(false, e.message);
      return false; // the caller should quarentine this transaction
    }

    stmt.finalize();
    db.connection.commitTransaction();
    return db.TRANSACTION_STATE.localNew;
  }

  else
  {
    var rv = false;
    if(aState == db.TRANSACTION_STATE.remoteNew) {
      rv = db.TRANSACTION_STATE.localError;
      stmt.params.state = rv;
    }
    else {
      rv = db.TRANSACTION_STATE.localIncomplete;
      stmt.params.state = rv;
    }

    try {
      db.executeStatement(stmt, insertsql);
    } catch(e) {
      stmt.finalize();
      db.logger.fatal(e.message);
      if(!rollback)
        db.connection.rollbackTransaction();
      assert(false, e.message);
      return false; // the caller should quarentine this transaction
    }

    stmt.finalize();
    return rv;
  }
};

db.getConnection = function DB_getConnection()
{
  let file = Cc["@mozilla.org/file/directory_service;1"].
    getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);

  file.append(DATASTORE_FILE);
  if(!file.exists())
    file.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0644);

  let ss = Cc["@mozilla.org/storage/service;1"]
    .getService(Ci.mozIStorageService);
  let cxn = ss.openDatabase(file);

  if(!cxn.tableExists("transaction_record"))
  {
    try {
      cxn.executeSimpleSQL(TRANSACTION_RECORD_SCHEMA);
    }
    catch(e if e.result == Components.results.NS_ERROR_FAILURE)
    {
      Cu.reportError("datastore SQL error: " +
                      cxn.lastErrorString + " in " +
                      TRANSACTION_RECORD_SCHEMA);
    }
  }

  let schema = db.schema();
  //tk.dump("schema", tk.dumpObject(schema));

  let missingTables = false;
  for(table in schema)
  {
    if(!cxn.tableExists(table))
    {
      missingTables = true;

      let scheme = schema[table].map(function(col) {
          return col + " STRING";
        });

      let sql = "CREATE TABLE "+ table +" ("+
          scheme.join(",") +")";
      try {
        //tk.dump("sql", sql);
        cxn.executeSimpleSQL(sql);
      }
      catch(e if e.result == Components.results.NS_ERROR_FAILURE)
      {
        Cu.reportError("datastore SQL error: " +
                        cxn.lastErrorString + " in " +
                        TRANSACTION_RECORD_SCHEMA);
      }
    }
  }
  if(!missingTables)
    db.logger.info("Schema in place.");
  else
    db.logger.info("New Schema created.");

  return cxn;
};
