/*

License
-------

All source code in this directory is licensed under the MIT license unless
otherwise noted in the source file itself.

See MIT-LICENSE in this directory for details.

*/

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

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , application = Cc["@mozilla.org/fuel/application;1"]
                    .getService(Ci.fuelIApplication)

  , events = require('events') 
  , util = require('util')
  ;

// Create a custom error constructor function.
exports.ErrorConstructor = function (name, module) {
  name = name || 'Error';
  module = module || 'anonymous';

  function ErrorConstructor(x) {
    if (!(this instanceof ErrorConstructor)) {
      return new ErrorConstructor(x);
    }

    if (util.isError(x)) {
      this.message = x.message;
      this.stack = x.stack;
      this.lineNumber = x.lineNumber;
      this.fileName= x.fileName;
    }
    else {
      this.message = x || '';
      this.stack = null;
      this.lineNumber = null;
      this.fileName= 'module '+ module;
    }
    this.name = name;
  }

  ErrorConstructor.prototype = new Error();

  return ErrorConstructor;
};

function load(cb) {
  events.enqueue(function () {
    cb('errors', exports);
  }, 0);
}
