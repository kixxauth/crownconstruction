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
jQuery: false
*/

"use strict";

var INIT
  , LOGIN
  , APP
  ;

INIT = function (jq) {
  var deck = jq.deck(jq('#main').children())
    , start
    , require = Components
                  .utils
                  .import('resource://fireworks/lib/require.js', null)
                  .require

    , events = require('events')
    ;

  require('platform')
    .console.log('Start Fireworks application instance.');

  start = events.Aggregate(function (require, jq) {
    var env = require('environ')

      , log = require('logging')
                .get('Fireworks_App' || env.LOG_NAME)
      ;

    log.info('Module system bootstrapped.');
    LOGIN(require, log, deck);
  });

  require.ensure(['logging', 'environ'], start());
  jq(start());
};

LOGIN = function (require, log, deck) {
};

APP = function () {
};

INIT(jQuery);

