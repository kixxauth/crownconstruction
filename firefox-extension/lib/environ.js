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

dump('loading environs.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require
  ;

function EnvironError(msg) {
  var self;
  if (msg instanceof Error) {
    self = msg;
  }
  else {
    self = new Error(msg);
  }
  self.name = "EnvironError";
  self.constructor = EnvironError;
  return self;
}

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
          Cu.reportError(err);
          events.trigger('error',
            EnvironError(
              'Unable to read config file at "'+ exports.CONFIGS_URL +'".'));
        }

        var configs = {}, attr;
        try {
          configs = JSON.parse(response.body);
        }
        catch (parseErr) {
          Cu.reportError(parseErr);
          events.trigger('error',
            EnvironError(
              'Unable to parse config file at "'+ exports.CONFIGS_URL +'".'));
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
      events.trigger('error', httpErr);
      cb('environs', exports);
    }
  });
}

dump('loaded environs.js\n');
