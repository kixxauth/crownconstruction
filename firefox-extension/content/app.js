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
jQuery: false,
SHARED: false,
MODELS: false
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
        jq('#underlay')
          .load(DEV_OVERLAY, function () {
              jq(this)
                .children('.gridcol')
                .css({
                    'background': '#d0e2f3'
                  , 'float': 'left'
                  , 'width': '7.25%'
                  , 'height': '780px'
                  , 'margin-left': '1%'
                  })
                ;
            })
          .css({
              'position': 'absolute'
            , 'top': '0'
            , 'left': '0'
            , 'width': '100%'
            , 'height': '780px'
            , 'z-index': '-1'
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
    var jq_login_warn = jq('#login-warning-box').hide()
      ;

    function show_username_warning(msg) {
      jq_login_warn.html(msg).show();
    }

    function show_passkey_warning(msg) {
      jq_login_warn.html(msg).show();
    }

    function try_login(username, passkey) {
      // TODO: Cache key of user session data.
      var query = db.Query()
        , promise
        ;

      query.query()
        .eq('kind', 'user_session')
        .eq('user', username)
        ;

      // TODO: Get dbname from login form.
      promise = db.connect('crown_construction_sandbox'
                         , MODELS
                         , username
                         , passkey
                         , query);
      promise(
        function (connection) {
          logging.checkpoint('connection', connection);
        }
      , function (err) {
          logging.checkpoint('connection err', err);
        }
      );
    }

    function handle_cmd(ev) {
      var username = jq('#username').val()
        , passkey = jq('#passkey').val()
        ;

      try {
        username = SHARED.validateString(username, 1, 70, /\W/);
      }
      catch (u_err) {
        // 'too short', 'too long', 'invalid characters'
        show_username_warning(u_err);
        return false;
      }

      try {
        passkey = SHARED.validateString(passkey, 4, 140, /[\b\t\v\f\r\n]/);
      }
      catch (p_err) {
        // 'too short', 'too long', 'invalid characters'
        show_passkey_warning(p_err);
        return false;
      }

      try_login(username, passkey);

      return false;
    }

    jq('#login-button').click(handle_cmd);
    deck('login');
  }

  db.connections(function (connections) {
    log.info(connections.length +' connections.');
    if (connections.length) {
      // TODO: connections login.
    }
    else {
      logging.checkpoint('loading overlay');
      jq('#login').load(LOGIN_OVERLAY, show_login);
    }
  });
};

APP = function () {
};

INIT(jQuery);

