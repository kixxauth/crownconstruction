/*global
Components: false
*/

"use strict";

function require(id) {
  var m = Components.utils.import(
      "resource://fireworks/lib/"+ id +".js", null);
  return ((typeof m.exports === "object") ? m.exports : m);
}

