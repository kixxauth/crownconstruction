let EXPORTED_SYMBOLS = ["db"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://crownconstruction/modules/lib.js");
Cu.import("resource://crownconstruction/modules/toolkit.js");
Cu.import("resource://crownconstruction/modules/log.js");
Cu.import("resource://crownconstruction/modules/configs.js");
Cu.import("resource://crownconstruction/modules/model.js");

/** Entity */
function Entity(key, props)
{
  this.key = function Ent_key() {
    return key;
  };
  this.persistedProperties = function Ent_pp() {
    return props;
  };
}

/** Key */
function Key()
{
  let parts = arguments.length = 1 ? arguments[0].split(" ") ? arguments;
  this.realm = parts[0];
  this.class = model.getClassForKind(parts[1]);
  this.kind = parts[1];
  this.uri = parts[2];
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

let _burning = false;

db.launch = function DB_launch()
{
  if(_burning)
    return;

  db.logger = log.getLogger("db");
  db.connection = db.getConnection();

  _burning = true;
};

/** create an new entity instance by class */
db.createNewEntity = function DB_createNewEntity(kind)
{
  let props = model.getProperties(kind);
  assert(props, "A model for kind '"+ kind +"' could not be found.");
  if(!props) {
    throw new TypeError("A model for kind '"+ kind
        +"' could not be found.");
  }

  let key = new Key(configs.get("realm"), kind, getUUID());
  let ent = new Entity(key, {});
  db.cache[key.uri] = ent;
  db.updates.push(ent);
  return key;
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
   * but caused and error loally */
  localError: 4

  /** transaction is committed locally and remotely, but not confirmed */
  remoteConfirm: 5,

  /** transaction is completed locally and remotely and confirmed */
  complete: 7,
};

db.executeStatement = function DB_executeStatement(stmt, sql)
{
};

db.indexof = function DB_indexOf(uri, kind)
{
};

/** @returns {object}
 *   table: the name of the table
 *   keycol: the name of the key col in the table
 *   valuecol: the name of the value col in the table
 */
db.getFKMeta = function DB_getFKMeta(kind, propname)
{
};

/**
 * @returns {object}
 *   table: the name of the table
 *   colname: the name of the column
 */
db.getMeta = function DB_getMeta(kind, propname)
{
};

/** Create and store a transaction */
db.commit = function DB_commit(user, message, callback)
{
  let entities =
    [db.normalizeEntity(ent) for each(ent in db.cache) if(ent.modified)];

  let cleanEntities = [ent for each(ent in entities) if(ent)];

  // if there are no items in the operations list, return false;
  if(!cleanEntities.length)
    return false;

  let txn = new Transaction(user, message, cleanEntities);

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

  let persistedProps = aEntity.persistedProperties();
  let ops = [];
  for(let p in props)
  {
    let prop = props[p];
    let stored =  persistedProps[p];
    if(!stored)
      continue;

    let current = aEntity[p];
    assert((typeof(current) != "undefined"), "missing Entity property "+ p);

    let op = db.normalizeOperation(prop.uri, stored, current);
    if(op)
      ops.push(op);
  }

  if(!ops.length)
    return null;

  return 
  {
    uri: aEntity.key().uri,
    class: aEntity.key().class,
    operations: ops
  };
}

db.normalizeOperation = function DB_normalizeOperation(uri, stored, current)
{
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
  if(state == db.TRANSACTION_STATE.localNew)
  {
    assert(false, "failed bringing transaction to state "+
        "db.TRANSACTION_STATE.localNew");
    db.logger.fatal("Applying initialized transaction failed.");
    return true;
    callback(false);
  }
  // return the normalized transaction to the callback
  callback(transaction);
  return true;
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
    // todo: we need to rollback transactions in state == 5
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
      return false;
    }
    return db.TRANSACTION_STATE.complete;
  }

  // a transaction happens within an SQLite transaction
  db.connection.beginTransaction();

  // flag that will be false if no changes were made
  var entityCommitted = false;
  var rollback = false;
  // for each entity in the transcation content:
  aTransaction.content.foreach(function DB_applyEntity(ent)
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

      if(typeof(kind) != "string") {
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
              ent.uri"'");
          rollback = true;
          db.connection.rollbackTransaction();
          assert(false,
              method +" a property on a non-existing entity");
          return;
        }

        let propname = model.getPropertyName(kind, op[1]);
        
        if(typeof(propname) != "string") {
          db.logger.warn("property '"+ op[1] +"' does not exist for class '"+
            ent.class +"' in db.createAndStoreTransaction()");
          rollback = true;
          db.connection.rollbackTransaction();
          assert(false,
              "property '"+ op[1]+"' does not exist for class: "+ ent.class);
          return;
        }

        let target = op[3];
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
          if(range == "resource"){
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
          var stmt = db.connection.createStatement(sql);
          stmt.params.val = target;
          stmt.params.uri = ent.uri;
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
          var stmt = db.connection.createStatement(sql);
          stmt.params.val = target;
          stmt.params.uri = ent.uri;
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
              updateSet.updates.push(meta.colname +"=:"+ meta.colname);
              updateSet[meta.colname] = target;
              continue;
            }
            // entity does not yet exist in our db
            insertSet.cols.push(meta.colname);
            insertSet.updates.push(":"+ meta.colname);
            insertSet[meta.colname] = target;
            continue;
          }

          // if 1 to many or many to many; create and execute insert
          var meta = db.getFKMeta(kind, propname);

          // if the property key-value already exists, we skip it
          var sql = "INSERT OR IGNORE INTO "+ meta.table +" WHERE "+
              meta.keycol +"=:uri AND "+ meta.valuecol +"=:val";

          var stmt = db.connection.createStatement(sql);
          stmt.params.val = target;
          stmt.params.uri = ent.uri;
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
          continue;
        }
      }
      
      // we should not allow a set of insert operations along with a set
      // of update operations on properties with a cardinality of 1
      if(updateSet.updates.length && insertSet.updates.length) {
        rollback = true;
        assert(false, "invalid date operations");
        return;
      }

      if(updateSet.updates.length)
      {
        var meta = db.getMeta(kind);
        let sql = "UPDATE "+ meta.table +" SET "+ updateSet.updates.join(",")
            +" WHERE rowid=:index";
        var stmt = db.connection.createStatement(sql);
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
        var meta = db.getMeta(kind);
        let sql = "INSERT INTO "+ meta.table +" ("+ insertSet.cols.join(",")
            +") VALUES ("+ insertSet.updates.join(",") +")";
        var stmt = db.connection.createStatement(sql);
        for(let p in insertSet) {
          if(p != "updates" || p != "cols")
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

  // create the SQL transaction record statement and bind params
  var insertsql = "INSERT INTO transaction_record "+
      "VALUES (:uid, :datetime, :message, :user, :serial, :state)";
  var stmt = db.connection.createStatement(insertsql);
  stmt.params.uid = aTransaction.uid;
  stmt.params.datetime = aTransaction.datetime;
  stmt.params.message = aTransaction.message;
  stmt.params.user = aTransaction.user;
  stmt.params.serial = aTransaction.serial;

  if(!rollback && entityCommited)
  {
    if(aState == db.TRANSACTION_STATE.remoteNew)
      stmt.params.state = db.TRANSACTION_STATE.complete;
    else
      stmt.params.state = db.TRANSACTION_STATE.localNew;

    try {
      var result = db.executeStatement(stmt, insertsql);
    } catch(e) {
      stmt.finalize();
      db.connection.rollbackTransaction();
      db.logger.fatal(e.message);
      assert(false, e.message);
      return false; // the caller should quarentine this transaction
    }

    stmt.finalize();
    db.connection.commitTransaction();
    return true;
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
      var result = db.executeStatement(stmt, insertsql);
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
}
