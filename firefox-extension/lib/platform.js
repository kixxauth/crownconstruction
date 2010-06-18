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

dump('loading platform.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , application = Cc["@mozilla.org/fuel/application;1"]
                    .getService(Ci.fuelIApplication)

  , observe_pref
  ;

function PlatformError(msg) {
  var self;
  if (msg instanceof Error) {
    self = msg;
  }
  else {
    self = new Error(msg);
  }
  self.name = "PlatformError";
  self.constructor = PlatformError;
  return self;
}

function Pref(pref, defaultValue) {
  if(!(this instanceof Pref)) {
    return new Pref(pref, defaultValue);
  }
  this.extIPreference = pref;
  this.name = pref.name;
  this.type = pref.type;
}

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
  observe_pref(this.name, function () {
    fn.call(this);
  });
};

exports.console = application.console;
exports.addListener = application.addListener;
exports.removeListener = application.removeListener;

function load(cb) {
  require.ensure(['environ', 'events'], function (require) {
    var observer = {}

      , env = require('environ')
      , events = require('events')

      , prefservice = Cc["@mozilla.org/preferences-service;1"]  
                        .getService(Ci.nsIPrefService)

      , prefbranch
      , registry = {}
      ;

    if (!env.EXTENSION_ID) {
      events.trigger('error',
        PlatformError('"EXTENSION_ID" environment variable is not defined. '+
          'Unable to load extension and preferences interfaces.'));
      cb('platform', exports);
      return;
    }

    observer.observe = function (nsIPrefBranch, changed, pref) {
      if (changed !== Ci.nsIPrefBranch2.NS_PREFBRANCH_PREFCHANGE_TOPIC_ID) {
        return;
      }
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
          pref = extension.prefs.get(name);
        }
        callback(Pref(pref));
      });
    };

    exports.extension(function (this_ext) {
      this_ext.addListner('uninstall', function () {
        prefbranch.deleteBranch('');
      });
    });

    cb('platform', exports);
  });
}

dump('loaded platform.js\n');
