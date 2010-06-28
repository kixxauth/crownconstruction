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
  , DEV_OVERLAY = 'dev-overlay.html'
  , LOGIN_OVERLAY = 'login-overlay.html'
  ;

INIT = function (jq) {
  var deck = jq.deck(jq('#main-deck').children())
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
      , platform = require('platform')
      , log = require('logging')
                .get(env.LOG_NAME || 'Fireworks_App')
      ;

    log.info('Module system bootstrapped.');
    platform.pref('dev', function (dev_pref) {
      if (dev_pref.value()) {
        jq('#overlay')
          .load(DEV_OVERLAY, function () {
              jq(this)
                .children('.gridcol')
                .css({
                    'background': '#057dd4'
                  , 'float': 'left'
                  , 'width': '7.25%'
                  , 'height': '780px'
                  , 'margin-left': '1%'
                  , 'opacity': '0.2'
                  })
                ;
            })
          .css({
              'position': 'absolute'
            , 'top': '0'
            , 'left': '0'
            , 'display': 'block'
            , 'width': '100%'
            , 'height': '780px'
            })
          ;
      }
      LOGIN(require, log, jq, deck);
    }, false);
    
  });

  require.ensure(['environ', 'platform', 'logging'], start());
  jq(start());
};

LOGIN = function (require, log, jq, deck) {
  var logging = require('logging')
    , db = require('db')
    ;

  function show_login() {
    deck('login');
    logging.checkpoint('overlay loaded');
  }

  db.connections(function (connections) {
    log.info(connections.length +' connections.');
    if (connections.length) {
      dump('TODO: connections login.\n');
    }
    else {
      logging.checkpoint('loading overlay');
      jq('#login').load(LOGIN_OVERLAY, show_login)
    }
  });
};

APP = function () {
};

INIT(jQuery);

