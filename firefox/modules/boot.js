/*jslint
onevar: true,
undef: true,
nomen: true,
eqeqeq: true,
plusplus: true,
bitwise: true,
strict: true,
immed: true */

/*members exports, import, utils
*/

/*global
Components: false
*/

"use strict";

function require(id) {
  var m = Components.utils.import(
      "resource://crownconstruction/modules/"+ id +".js", null);
  if (m.exports === "object") {
    return m.exports;
  }
  return ((typeof m.exports === "object") ? m.exports : m);
}

