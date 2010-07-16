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

  , log = require('logging').get('Platform')

  , PlatformError = require('errors')
                      .ErrorConstructor('PlatformError', 'platform.js')

  , observe_pref = function () {}
  ;

exports.console = application.console;
exports.addListener = application.addListener;
exports.removeListener = application.removeListener;

// Preference object constructor.
function Pref(pref) {
  if(!(this instanceof Pref)) {
    return new Pref(pref);
  }
  this.extIPreference = pref;
  this.name = pref.name;
  this.type = pref.type;
}

Pref.prototype = {};

Pref.prototype.name = '';
Pref.prototype.type = '';

Pref.prototype.value = function () {
  return this.extIPreference.value;
};

Pref.prototype.locked = function () {
  return this.extIPreference.locked;
};

Pref.prototype.modified = function () {
  return this.extIPreference.modified;
};

Pref.prototype.addListener = function (fn) {
  var self = this;
  observe_pref(this.name, function () {
    fn.call(self);
  });
};

function load(cb) {
  require.ensure(['environ'], function (require) {
    var prefservice = Cc["@mozilla.org/preferences-service;1"]  
                        .getService(Ci.nsIPrefService)
      , prefbranch
      , observer = {}

      , env = require('environ')
      , events = require('events')

      , registry = {}
      ;

    if (!env.EXTENSION_ID) {
      log.warn(PlatformError(new Error('"EXTENSION_ID" environment '+
          'variable is not defined. Unable to load '+
          'extension and preferences interfaces.')));
      cb('platform', null);
      return;
    }
    log.info('"EXTENSION_ID" is now defined. Loading prefs.');

    observer.observe = function (nsIPrefBranch, changed, pref) {
      if (changed !== 'nsPref:changed') {
        return;
      }
      pref = pref.replace(/^\./, '');
      log.info('Change in preference "'+ pref +'" observed.');
      if (typeof registry[pref] === 'function') {
        registry[pref]();
      }
    };

    prefbranch = prefservice.getBranch('extensions.'+ env.EXTENSION_ID);
    prefbranch.QueryInterface(Ci.nsIPrefBranch2);
    prefbranch.addObserver('', observer, false);

    observe_pref = function (name, callback) {
      if (!registry[name]) {
        registry[name] = events.Broadcaster();
      }
      registry[name].add(callback, callback);
    };

    exports.extension = function (callback) {
      if (application.extensions) {
        events.enqueue(function () {
          callback(application.extensions.get(env.EXTENSION_ID));
        }, 0);
        return;
      }
      application.getExtensions(function (extensions) {
        callback(extensions.get(env.EXTENSION_ID));
      });
    };

    exports.pref = function (name, callback, defaultValue) {
      exports.extension(function (extension) {
        var pref = extension.prefs.get(name);
        if (!pref) {
          extension.prefs.setValue(name, defaultValue);
          log.info('Set preference "'+ name
            +'" to default value `'+ defaultValue +'`.');
          pref = extension.prefs.get(name);
        }
        else {
          log.info('Pref "'+ name
            +'" is set to to value `'+ pref.value +'`.');
        }
        callback(Pref(pref));
      });
    };

    cb('platform', exports);
  });
}

