/*jslint
onevar: true,
undef: true,
nomen: true,
eqeqeq: true,
plusplus: true,
bitwise: true,
strict: true,
immed: true */

/*global
Components: false
*/

"use strict";

var EXPORTED_SYMBOLS = ["exports"];

if (typeof Components !== "undefined") {
  var require = Components.utils.import(
        "resource://crownconstruction/modules/boot.js", null).require;
  var exports = {};
  var module = {id: "events"};
}

exports.engine = "XPCOM";

