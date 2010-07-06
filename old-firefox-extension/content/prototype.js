var CHAP = require("chap");
var JR = require("jsonrequest");
var DDD = require("dcube");
DDD.debug(1);
DDD.setDomain("0-5.latest.fireworks-skylight.appspot.com");

var CXN;

function dojr() {
  dump(" cnonce: "+ CHAP.cnonce("x", "nextnonce") +"\n");
  dump(" response: "+ CHAP.response("x", "nonce") +"\n");
}

function doDCube() {
  var promise = DDD.connect("sandbox", "sandbox", [], "3 taps");
  promise.then(
      function (rv) {
        CXN = rv.connection;
      },
      function (ex) {
        ex = ex || {name: "undefined", message: "none"};
        alert(ex.name +" : "+ ex.message);
      });
}

function putdata() {
  var r = CXN.request();
  var q = DDD.query("put");
  q.appendStatement("group", "=", "new");
  q.appendStatement("blob", "=", "stuff");
  r.appendQuery(q);
  var promise = r.send();
  promise.then(
      function (rv) {
        dump(" result:\n"+ require("util").repr(rv) +"\n\n");
        alert("OK");
      },
      function (ex) {
        ex = ex || {name: "undefined", message: "none"};
        alert(ex.name +" : "+ ex.message);
      });
}
