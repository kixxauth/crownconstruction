const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://crownconstruction/modules/lib.js");
Cu.import("resource://crownconstruction/modules/toolkit.js");
Cu.import("resource://crownconstruction/modules/launch.js");
Cu.import("resource://crownconstruction/modules/configs.js");
Cu.import("resource://crownconstruction/modules/log.js");

function onWindowLoad()
{
  launch();
}

function printResult(aResult)
{
  let ctn = $("result-ctn");
  ctn.innerHTML = aResult;
}

function testLogging()
{
  let r = "<p>";
  r += "debug:"+ configs.get("debug") +"<br />";
  r += "loglevel:"+ configs.get("log-level") +"<br />";
  r += "</p>";
  printResult(r);

  let logger = log.getLogger("testing");
  logger.fatal("this is fatal");
  logger.error("this is error");
  logger.warn("this is warn");
  logger.info("this is info");
  logger.config("this is config");
  logger.debug("this is debug");
  logger.trace("this is trace");
  return true;
}

function testAssert()
{
  printResult("<p>check the console</p>");
  assert(false, "this is a test asssertion.");
  return true;
}

function testIsArray()
{
  let r = "<p>";
  r += "object:"+ tk.isarray(new Date()) +"<br />";
  r += "bool:"+ tk.isarray(true) +"<br />";
  r += "string:"+ tk.isarray("log-level") +"<br />";
  r += "null:"+ tk.isarray(null) +"<br />";
  r += "array:"+ tk.isarray(new Array()) +"<br />";
  r += "</p>";
  printResult(r);
}

function testIterator()
{
  let r = "<p>";
  let it = Iterator([4,5,6,7]);
  for(let i in it)
    r += "index:"+ i +"<br />";
  r += "</p>";
  printResult(r);
}

function onArrayAssignment()
{
  let cp = setCheckPoint();
  let i = 0, a = [];
  while(i < 10000) {
    a[i] = Math.round(Math.random() * 100);
    i++;
  }
  printCheckPoint(cp);
}

function onArrayPush()
{
  let cp = setCheckPoint();
  let i = 0, a = [];
  while(i < 10000) {
    a.push(Math.round(Math.random() * 100));
    i++;
  }
  printCheckPoint(cp);
}

function onGetDataFile()
{
  let cp = setCheckPoint();

  let file = openDataFile();

  printCheckPoint(cp);
}

function onDeleteDataFile()
{
  let file = openDataFile();

  let cp = setCheckPoint();

  file.remove(false);

  printCheckPoint(cp);
}

function onOpenConnection()
{
  let file = openDataFile();

  let cp = setCheckPoint();

  let cxn = openConnection(file);

  printCheckPoint(cp);
}

function onGetConnection()
{
  let cp = setCheckPoint();

  let cxn = getConnection();

  printCheckPoint(cp);
}

function onWriteEntities(q)
{
  let len = parseInt(q);
  let pointer = 0;
  let ents = [];
  while(pointer <= len) {
    ents.push(createEntity());
    pointer++;
  }

  let cxn = getConnection();
  let cp = setCheckPoint();

  pointer = 0;
  while(pointer < ents.length) {
    writeNewEntity(ents[pointer], cxn);
    pointer++;
  }

  printCheckPoint(cp);

  cxn.close();
}

function onWriteEntitiesTransaction(q)
{
  let len = parseInt(q);
  let pointer = 0;
  let ents = [];
  while(pointer <= len) {
    ents.push(createEntity());
    pointer++;
  }

  let cxn = getConnection();
  let cp = setCheckPoint();

  cxn.beginTransaction();
  pointer = 0;
  while(pointer < ents.length) {
    writeNewEntity(ents[pointer], cxn);
    pointer++;
  }
  cxn.commitTransaction();

  printCheckPoint(cp);

  cxn.close();
}

function onWriteEntitiesAsync(q)
{
  let len = parseInt(q);
  let pointer = 0;
  let ents = [];
  while(pointer <= len) {
    ents.push(createEntity());
    pointer++;
  }

  let cxn = getConnection();
  let cp = setCheckPoint();

  let stmts = [];
  pointer = 0;
  while(pointer < ents.length) {
    stmts = stmts.concat(createEntityInserts(ents[pointer], cxn));
    pointer++;
  }

  cxn.executeAsync(stmts, stmts.length,
      {
        handleCompletion: function(reason) {
          printCheckPoint(cp);
        },

        handleError: function(err) {
          Components.utils.reportError(err.result +":"+ err.message);
          alert("there was an error.");
        }
      });
}

let GlobalCache = {};

function onReadFromSQLite(q)
{
  let cp = setCheckPoint();
  readEntitiesFromSQLite(q);
  printCheckPoint(cp);
}

function onReadFromCache(q)
{
  let cp = setCheckPoint();
  let len = parseInt(q);
  let pointer = 0, ents = [];
  while(pointer <= len) {
    ents.push(GlobalCache[createURI()]);
    pointer++;
  }
  printCheckPoint(cp);
}

function readEntitiesFromSQLite(q)
{
  let len = parseInt(q);
  let pointer = 0;
  while(pointer <= len) {
    readEntityFromSQLite(createURI());
    pointer++;
  }
}

function readEntityFromSQLite(uri)
{
  let arcs = querySQLite(uri);
  let ent = new Entity(arcs);
  GlobalCache[uri] = ent;
} 

function querySQLite(uri)
{
  cxn = getConnection();
  let stmt = cxn.createStatement("SELECT rowid,predicate,target"+
    " FROM triples WHERE subject=:subject");
  stmt.params.subject = uri;

  let rows = [];
  while(stmt.executeStep())
    rows.push({
        rowid: stmt.row.rowid,
        predicate: stmt.row.predicate,
        target: stmt.row.target});

  stmt.finalize();
  cxn.close();

  return rows;
}

const DATASTORE_FILE = "sqlite_testing.sqlite";
function openDataFile()
{
  let f = Cc["@mozilla.org/file/directory_service;1"].
    getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);

  f.append(DATASTORE_FILE);
  if(!f.exists())
    f.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0644);

  return f;
}

const TRIPLES_SCHEMA =
  "CREATE TABLE triples(" +
  " subject STRING," +
  " predicate STRING," +
  " target STRING)";

function openConnection(f)
{
  let ss = Cc["@mozilla.org/storage/service;1"]
    .getService(Ci.mozIStorageService);

  let cxn = ss.openDatabase(f);

  if(!cxn.tableExists("triples"))
  {
    try {
      cxn.executeSimpleSQL(TRIPLES_SCHEMA);
    }
    catch(e if e.result == Components.results.NS_ERROR_FAILURE)
    {
      Cu.reportError("datastore SQL error: " +
                      db.lastErrorString + " in " +
                      TRIPLES_SCHEMA);
    }
  }

  return cxn;
}

function getConnection() {
  return openConnection(openDataFile());
}

function writeNewEntity(ent, cxn)
{
  let stmt = cxn.createStatement("INSERT INTO triples VALUES "+
    "(:subject, :predicate, :target)");
  let rv = ent.map(writeTriple, stmt);
  stmt.finalize();
  return rv;
}

function createEntityInserts(ent, cxn)
{
  let stmt = cxn.createStatement("INSERT INTO triples VALUES "+
    "(:subject, :predicate, :target)");
  let rv = ent.map(createTripleStatement, stmt);
  return rv;
}

function createTripleStatement(value, index, list)
{
  this.params.subject = value.subject;
  this.params.predicate = value.predicate;
  this.params.target = value.target;
  return this;
}

function writeTriple(value, index, list)
{
  this.params.subject = value.subject;
  this.params.predicate = value.predicate;
  this.params.target = value.target;
  this.execute();
  this.reset();
}

function createEntity()
{
  let subject = createURI();
  let len = Math.round((Math.random() * 10) +1).toString();
  let i = 0, triples = [];
  while(i <= len) {
    triples.push(createTriple(subject));
    i++;
  }
  return triples;
}

function createURI() {
  return "uri:"+ Math.round(Math.random() * 1000).toString();
}

function createTriple(subject)
{
  let predicates = [
    'http://www.crownconstructioninc.com/rdf#job-enddate',
    'http://www.crownconstructioninc.com/rdf#job-startdate',
    'http://www.crownconstructioninc.com/rdf#job-idno',
    'http://www.crownconstructioninc.com/rdf#has-customer',
    'http://www.crownconstructioninc.com/rdf#customer-person',
    'http://www.crownconstructioninc.com/rdf#employee-person',
    'http://www.fireworksproject.com/rdf#hasMember',
    'http://www.fireworksproject.com/rdf#lastname',
    'http://www.fireworksproject.com/rdf#firstname',
    'http://www.fireworksproject.com/rdf#name',
    'http://www.fireworksproject.com/rdf#name'
    ];

  let targets = [
    'fireworks',
    'project',
    '1',
    '000010000',
    'this is supposed to represent some text that is longer',
    '1234567890-=qwerrtyyuuuiiiiiooassddfffgghjkl;;zxcvbnm,.qweoiuewrlkjndsvoiasdcjnsadvcohsdfoihasdc;jklnsadoihjwer;ljknsdcoihjwer;ojknsdcoihasdfoihsad;oihasefoihasd;ojknasfdoihsef;oihjsdf;ojhsadf;onhsadfoihsadf',
    'http://www.fireworksproject.com/rdf#hasMember',
    'http://www.fireworksproject.com/rdf#lastname',
    'http://www.fireworksproject.com/rdf#firstname',
    'http://www.fireworksproject.com/rdf#name',
    'http://www.fireworksproject.com/rdf#name'
    ];

  return {
    subject: subject,
    predicate: predicates[Math.round(Math.random() * 10)],
    target: targets[Math.round(Math.random() * 10)]
  };
}

function Entity(arcs)
{
  if(arcs)
  {
    arcs.forEach(function(a){
        this[a.predicate] = a.target;
        },
        this);
  }
  this.prop = null;
}

function setCheckPoint()
{
  return Date.now();
}
function printCheckPoint(cp)
{
  let now = Date.now();
  let time = now - cp;
  $("sqlite-results").innerHTML = "time: "+ time.toString() + " milliseconds";
}

window.addEventListener("load", onWindowLoad, false);
