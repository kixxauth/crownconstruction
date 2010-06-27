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

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , log = require('logging').get('Environs')

  , EnvironError = require('errors')
                     .ErrorConstructor('EnvironError', 'environ')
  ;

exports.CONFIGS_URL = 'resource://fireworks/config.json';

function load(cb) {
  require.ensure(['http', 'util'], function (require) {
    var http = require('http')
      , util = require('util')
      ;

    // Read config file and set global constants.
    try {
      http.request({url: exports.CONFIGS_URL}, function (response, err) {
        try {
          if (err) {
            log.debug(err);
            throw new Error('Unable to read config file at "'+
                        exports.CONFIGS_URL +'".');
          }

          var configs = {}, attr;
          try {
            configs = JSON.parse(response.body);
          }
          catch (parseErr) {
            log.debug(parseErr);
            throw new Error('Unable to parse config file at "'+
                        exports.CONFIGS_URL +'".');
          }

          for (attr in configs) {
            if (util.has(configs, attr)) {
              exports[attr] = configs[attr];
            }
          }
        }
        catch (e) {
          log.error(EnvironError(e));
        }
        finally {
          cb('environs', exports);
        }
      });
    }
    catch (httpErr) {
      log.debug(httpErr);
      log.error(EnvironError(new Error('Invalid config file "'+
            exports.CONFIGS_URL +'".')));
    }
    finally {
      cb('environs', exports);
    }
  });
}

