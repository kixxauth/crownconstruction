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
  require.ensure(['events', 'http', 'util'], function (require) {
    var http = require('http')
      , util = require('util')
      , events = require('events')
      ;

    // Read config file and set global constants.
    try {
      http.request({url: exports.CONFIGS_URL}, function (response, err) {
        if (err) {
          log.debug(err);
          log.error(EnvironError(new Error('Unable to read config file at "'+
                exports.CONFIGS_URL +'".')));
          cb('environs', exports);
          return;
        }

        var configs = {}, attr;
        try {
          configs = JSON.parse(response.body);
        }
        catch (parseErr) {
          log.debug(parseErr);
          log.error(EnvironError(new Error('Unable to parse config file at "'+
                exports.CONFIGS_URL +'".')));
        }

        for (attr in configs) {
          if (util.has(configs, attr)) {
            exports[attr] = configs[attr];
          }
        }

        cb('environs', exports);
      });
    }
    catch (httpErr) {
      log.debug(httpErr);
      log.error(EnvironError(new Error('Invalid config file "'+
            exports.CONFIGS_URL +'".')));
      cb('environs', exports);
    }
  });
}

