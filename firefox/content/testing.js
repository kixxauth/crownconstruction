const Cc = Components.classes;
const Ci = Components.interfaces;

function runTest(aTest)
{
  switch(aTest)
  {
    default:
      alert('invalid test');
  }
}

function appendResult(aCtn, aResult)
{
  let ctn = $(aCtn);
  if(!ctn)
  {
    ctn = DIV({id:aCtn});
    $("result-ctn").appendChild(ctn);
  }
  ctn.appendChild(P(aResult));
}

function clearResults(aCtn)
{
  let ctn = $(aCtn);
  if(!ctn)
  {
    try {
    ctn = DIV({id:aCtn});
    } catch(e) { Components.utils.reportError(e); }
    $("result-ctn").appendChild(ctn);
  }
  ctn.innerHTML = "<p>results cleared</p>";
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

function onSetupJoin()
{
  let cp = setCheckPoint();
  
  let cxn = getConnection();

  cxn.executeSimpleSQL(PERSON_SCHEMA);
  cxn.executeSimpleSQL(PERSON_TAG);
  cxn.executeSimpleSQL(PERSON_CAR);
  cxn.executeSimpleSQL(CAR_SCHEMA);

  let insertPerson = cxn.createStatement("INSERT INTO person "+
      "VALUES (:uri, :name)");
  let insertTag = cxn.createStatement("INSERT INTO person_tag "+
      "VALUES (:person, :tag)");
  let insPersonCar = cxn.createStatement("INSERT INTO person_car "+
      "VALUES (:person, :car)");
  let insertCar = cxn.createStatement("INSERT INTO car "+
      "VALUES (:uri, :model, :color)");

  let people = [
      {uri:"x", name:"foo"},
      {uri:"y", name:"bar"},
      {uri:"z", name:"bear"}
    ];
  let tags = [
      {person:"x", tag:"a"},
      {person:"y", tag:"b"},
      {person:"y", tag:"c"},
      {person:"z", tag:"a"},
      {person:"z", tag:"b"},
      {person:"z", tag:"c"}
    ];
  let person_cars = [
      {person:"x", car:"ca"},
      {person:"x", car:"cb"},
      {person:"x", car:"cd"},
      {person:"y", car:"ce"},
      {person:"y", car:"cf"},
      {person:"z", car:"cg"}
    ];
  let cars = [
      {uri:"ca", model:"prias", color:"red"},
      {uri:"cb", model:"civic", color:"white"},
      {uri:"cd", model:"tundra", color:"blue"},
      {uri:"ce", model:"tacoma", color:"green"},
      {uri:"cf", model:"focus", color:"yellow"},
      {uri:"cg", model:"camry", color:"red"}
    ];

  cxn.beginTransaction();

  people.forEach(function(person) {
        this.params.uri = person.uri;
        this.params.name = person.name;
        this.execute();
        this.reset();
      }, insertPerson);
  insertPerson.finalize();

  tags.forEach(function(tag) {
        this.params.person = tag.person;
        this.params.tag = tag.tag;
        this.execute();
        this.reset();
      }, insertTag);
  insertTag.finalize();

  person_cars.forEach(function(pc) {
        this.params.person = pc.person;
        this.params.car = pc.car;
        this.execute();
        this.reset();
      }, insPersonCar);
  insPersonCar.finalize();

  cars.forEach(function(car) {
        this.params.uri = car.uri;
        this.params.model = car.model;
        this.params.color = car.color;
        this.execute();
        this.reset();
      }, insertCar);
  insertCar.finalize();

  cxn.commitTransaction();

  cxn.close();

  printCheckPoint(cp);
}

function onTryJoin()
{
  let cp = setCheckPoint();

  let cxn = getConnection();

  let sql = "SELECT "+
    "person.name as name, "+
    "person_tag.tag as tag, "+
    "person_car.car as car "+
    "FROM person "+
    "INNER JOIN person_tag ON person.uri=person_tag.person "+
    "INNER JOIN person_car ON person.uri=person_car.person";

  let s = cxn.createStatement(sql);

  dump("\nExecuting\n");
  while(s.executeStep()) {
    dump("name:"+s.row.name+", tag:"+s.row.tag+", carURI:"+s.row.car+"\n");
  }

  let sql = "SELECT "+
    "car.model as model, "+
    "person_car.person as personURI "+
    "FROM car "+
    "INNER JOIN person_car ON car.uri=person_car.car";

  let s = cxn.createStatement(sql);

  dump("\nExecuting\n");
  while(s.executeStep()) {
    dump("model:"+s.row.model+",  owner:"+s.row.personURI+"\n");
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

const PERSON_SCHEMA = 
  "CREATE TABLE person("+
  " uri STRING,"+
  " name STRING,"+
  " PRIMARY KEY (uri))";

const PERSON_TAG =
  "CREATE TABLE person_tag("+
  " person STRING,"+
  " tag STRING)";

const PERSON_CAR =
  "CREATE TABLE person_car("+
  " person STRING,"+
  " car STRING)";

const CAR_SCHEMA = 
  "CREATE TABLE car("+
  " uri STRING,"+
  " model STRING,"+
  " color STRING,"+
  " PRIMARY KEY (uri))";

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
