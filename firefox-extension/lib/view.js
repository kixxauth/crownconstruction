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

dump(' ... view.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , events = require('events')
  , util = require('util')
  , has = util.has
  ;

// `x` is the data
// `pointer` is the pointer dictionary
// `view` is the data view dictionary
// `parts` is the current path array
function map_to_dict(x, pointer, view, parts) {
  var p, path;
  for (p in x) {
    if (has(x, p)) {
      // Make a copy and push the path.
      path = parts.slice();
      path.push(p);

      if (typeof x[p] === 'object') {
        // Test for array
        if (Object.prototype.toString.call(x[p]) === "[object Array]") {
          view[p] = [];
        }
        else {
          view[p] = {};
        }
        arguments.callee(x[p], pointer, view[p], path);
      }
      else {
        view[p] = {
          path: path.join('.'),
          value: x[p]
        };

        path.pop();
        pointer[path.join('.')] = x;
      }
    }
  }
}

exports.mapview = function (key, ent) {
  var pointer = {}, view = {};
  map_to_dict(ent, pointer, view, [key]);
  return {view: view, pointer: pointer, entity: ent};
};

function load(cb) {
  events.enqueue(function () {
    cb('view', exports);
  }, 0);
}

