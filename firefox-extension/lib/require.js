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

var EXPORTED_SYMBOLS = ['require']

  , Cu = Components.utils

  , module_path = 'resource://fireworks/lib/'

  , loaded_modules = {}

  , events
  ;

function get_url(id) {
  return module_path + id +'.js';
}

function require(id) {
  var url, m = loaded_modules[id];

  dump('require("'+ id +'")\n');

  if (m) {
    dump('"'+ id +'" loading from cache.\n');
    return m;
  }
   
  dump('"'+ id +'" loading partial.\n');
  url = get_url(id);
  try {
    m = Cu.import(url, null);
  }
  catch (e) {
    Cu.reportError(e);
    Cu.reportError('Could not require() module from "'+ url +'".');
    return;
  }
  return ((typeof m.exports === 'object') ? m.exports : m);
}

function load(modules) {
  var i = 0, len = modules.length;

  for (; i < len; i += 1) {
    loaded_modules[modules[i].id] = modules[i].exports;
  }
}

function Loader(callback) {
  return events.Aggregate(function (modules) {
     load(modules);
     callback(require);
  });
}

dump('Loading events module to initialize "require" module.\n');
events = require('events');

require.ensure = function (modules, callback) {
  var loader = Loader(callback)
    , i = 0
    , len = modules.length
    , init
    ;

  dump('require.ensure("'+ modules +'").\n');
  for (; i < len; i += 1) {
    if (!loaded_modules[modules[i]]) {
      dump('require.ensure() will load "'+ modules[i] +'".\n');
      try {
        init = Cu.import(get_url(modules[i]), null).load;
      }
      catch (loadErr) {
        Cu.reportError(loadErr);
        throw 'Error loading module from "'+ get_url(modules[i]) +'".';
      }
      init(loader(['id', 'exports']));
    }
  }

  if (!init) {
    dump('require.ensure() has nothing to load.\n');
    events.enqueue(function () {
      callback(require);
    }, 0);
  }
};

