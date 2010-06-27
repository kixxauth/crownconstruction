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

dump(' ... environs.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}
  ;

exports.CONFIGS_URL = 'resource://fireworks/config.json';

function load(cb) {
  var xhr = Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
              .createInstance(Ci.nsIXMLHttpRequest)
    ;

  xhr.onreadystatechange = function on_ready_state_change(ev) {
    if (ev.target.readyState !== 4) {
      return;
    }
    var configs, attr;
    try {
      if (!xhr.responseText && ev.target.status === 0) {
        throw new Error('Unable to read config file at: "'+
            exports.CONFIGS_URL +'".');
      }
      try {
        configs = JSON.parse(xhr.responseText);
      }
      catch (parseErr) {
        throw new Error('Unable to parse config file at: "'+
                    exports.CONFIGS_URL +'".');
      }

      for (attr in configs) {
        if (Object.prototype.hasOwnProperty.call(configs, attr)) {
          exports[attr] = configs[attr];
        }
      }
    }
    catch (e) {
      Cu.reportError(e);
    }
    finally {
      cb('environ', exports);
    }
  };

  try {
    xhr.overrideMimeType('application/json');
    xhr.open('GET', exports.CONFIGS_URL, true);
    xhr.send(null);
  } catch(e) {
    Cu.reportError(
        Error('Problem opening '+ exports.CONFIGS_URL +'; '+ e.message));
    cb('environ', exports);
  }
}

