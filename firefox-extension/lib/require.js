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
Components: false,
dump: false
*/

"use strict";

var EXPORTED_SYMBOLS = ['require']

  , Cu = Components.utils

  , module_path = 'resource://fireworks/lib/'

  , loaded_modules = {}

    // The events module will be loaded with the require function.
  , events

    // Temporary trace logging until the logging module is loaded.
  , log = {
      trace: function (msg) {
               dump('> Booting Module_Loader: '+ msg +'\n');
             }
    }
  ;

function get_url(id) {
  return module_path + id +'.js';
}

function require(id) {
  var url, m = loaded_modules[id];

  log.trace('require("'+ id +'")');

  if (m) {
    log.trace('"'+ id +'" loading from cache.');
    return m;
  }
   
  log.trace('"'+ id +'" loading partial.\n');
  url = get_url(id);
  try {
    m = Cu.import(url, null);
  }
  catch (e) {
    if (log.debug && log.error) {
      log.debug(e);
      log.error('Could not require() module from "'+ url +'".');
      return;
    }
    Cu.reportError(e);
    Cu.reportError('Could not require() module from "'+ url +'".');
    return;
  }
  return ((typeof m.exports === 'object') ? m.exports : m);
}

log.trace('Loading events module');
events = require('events');
log.trace('Loading logging module');
log = require('logging').get('Module_Loader');

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

require.ensure = function (modules, callback) {
  var loader = Loader(callback)
    , i = 0
    , len = modules.length
    , init
    ;

  log.trace('require.ensure("'+ modules +'")');
  for (; i < len; i += 1) {
    if (!loaded_modules[modules[i]]) {
      log.trace('require.ensure() loading "'+ modules[i] +'"');
      try {
        init = Cu.import(get_url(modules[i]), null).load;
      }
      catch (loadErr) {
        log.debug(loadErr);
        throw 'Error loading module from "'+ get_url(modules[i]) +'".';
      }
      init(loader(['id', 'exports']));
    }
    else {
      log.trace('require.ensure() already loaded "'+ modules[i] +'"');
    }
  }

  if (!init) {
    events.enqueue(function () {
      callback(require);
    }, 0);
  }
};

