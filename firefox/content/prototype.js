var Q = require("events");
var HTTP = require("http");

var P;

window.addEventListener("load",
    function (e) {
      var r = HTTP.create();
      var p = r.send("GET", "htt://www.foodoes_not_exist/");
      dump("call to r.send() returned\n");
      p.then(
        function (res) {
          dump("RESPONSE status:\n"+ res.status +"\n");
          res.headers = 44;
        },
        function (e) {dump("Got exception. \n"+ e +"\n");}).
      then(
        function (res) {
          dump("RESPONSE HEADERS:\n"+ res.headers +"\n");
          res.headers = 7;
        },
        function (e) {dump("Got exception. \n"+ e +"\n");}
        );
      dump("call to r.then() returned\n");
      P = p;
    }, false);
