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
window: false,
Components: false,
jQuery: false,
_: false,
SHARED: false,
MODELS: false
*/

"use strict";

var INIT
  , LOGIN
  , APP
  , DEV_OVERLAY = './shared/dev-overlay.xml'
  , LOGIN_OVERLAY = 'login-overlay.xml'
  , CONNECTIONS_OVERLAY = 'connections-overlay.xml'
  , WORKSPACE_OVERLAY = 'workspace-overlay.xml'
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

  window.location.hash = '';

  start = events.Aggregate(function (require, jq) {
    var env = require('environ')
      , platform = require('platform')
      , log = require('logging')
                .get(env.LOG_NAME || 'Fireworks_App')
      ;

    log.info('Module system bootstrapped.');
    platform.pref('dev', function (dev_pref) {
      if (dev_pref.value()) {
        jq('#underlay').load(DEV_OVERLAY);
      }
      require.ensure(['db'], function (require) {
        LOGIN(require, log, require('db'), jq, deck);
      });
    }, false);
    
  });

  require.ensure(['environ', 'platform', 'logging', 'db'], start());
  jq(start());
};

LOGIN = function (require, log, db, jq, deck) {
  var logging = require('logging')
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
          log.trace('got DB connection: '+
            ((typeof connection === 'function') ?
             connection('id') : 'invalid'));
          APP(require, log, connection, jq, deck);
        }

        // DCubeError: 'Request error.'
        // 'User does not exist.'
        // 'Authentication denied.'
        // DB does not exist???
        // Unauthenticated on DB???
      , function (err) {
          logging.checkpoint('app.js Connection Error', err);
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

  function show_connections(connections) {
    logging.dump(jq('#connections-list-template')[0].firstChild.nodeValue);
  }

  db.connections(function (connections) {
    log.info(connections.length +' connections.');
    if (connections.length) {
      jq('#connections').load(CONNECTIONS_OVERLAY, function () {
        show_connections(connections);
      });
    }
    else {
      jq('#login').load(LOGIN_OVERLAY, show_login);
    }
  });
};

APP = function (require, log, connection, jq, deck) {
  var un = _.noConflict()
    , util = require('util')
    , curry = util.curry
    , confirmObject = util.confirmObject
    , confirmFunc = util.confirmFunc
    , isArray = util.isArray
    , logging = require('logging')
    , db = require('db')
    , Query = db.Query
    , commands
    , bbq
    , tabset
    , search
    , customers
    , jobs
    , personnel
    ;

  function mod_commands() {
    var self = {}
      , registry = {}
      ;

    self.register = function (namespace, command, fn) {
      registry[namespace] = confirmObject(registry[namespace]);
      registry[namespace][command] = fn;
    };

    self.dispatch = function (namespace, command, args) {
      args = (isArray(args) ? args :
        ((typeof args === 'undefined') ? [] : [args]));
      confirmFunc(confirmObject(registry[namespace])[command])
        .apply(null, args);
    };

    return self;
  }

  // ## Registered commands:
  //   * 'panels.customers'
  //   * 'panels.jobs'
  //   * 'panels.personnel'
  //   * 'search.customers'
  //   * 'search.jobs'
  //   * 'customers.create'
  //   * 'jobs.create'
  //   * 'personnel.directory'
  //   * 'personnel.create'

  function mod_bbq(workspace) {
    var self = {}
      , bbq_state = {}
      ;

    jq('a.bbq', workspace).live('click', function (ev) {
      // TODO: DEBUG REMOVE 
      log.trace('a.bbq '+ jq(this).attr('href'));

      var state = {}
        , parts = jq(this).attr('href').replace(/^#/, '').split('/')
        , id = parts[0]
        , url = parts[1]
        ;

      if (!id) {
        log.error(new Error('jQuery.bbq hash "'+ parts +'" is not valid.'));
        return false;
      }

      state[id] = url;
      jq.bbq.pushState(state);
      return false;
    });

    jq(window).bind('hashchange', function(ev) {
      var new_state = ev.getState();

      // TODO: DEBUG REMOVE 
      logging.inspect('BBQ state', new_state);

      un.each(new_state, function (val, key, dict) {
        if (bbq_state[key] === val) {
          return;
        }

        // TODO: DEBUG REMOVE 
        log.trace('Detected hashchange', val);

        var parts = val.split('?')
          , state = parts[0]
          , params = jq.deparam.querystring(parts[1], true)
          ;

        commands.dispatch(key, state, [params]);
      });
      bbq_state = new_state;
    });

    return self;
  }

  function mod_tabset() {
    var self = {}
      , deck = jq.deck(jq('#tabset').children())
      ;

    commands.register('panels', 'customers', curry(deck, 'customers'));
    commands.register('panels', 'jobs', curry(deck, 'jobs'));
    commands.register('panels', 'personnel', curry(deck, 'personnel'));

    return self;
  }

  function mod_search() {
    var self = {}
      , jq_job = jq('#job-search').hide()
      , jq_customer = jq('#customer-search').hide()
      ;

    commands.register('search', 'customers', function () {
      // 2 forms of this panel --
      // one for customer search and one for job creation.
      // TODO
      logging.checkpoint('Show customer search panel.');
    });

    commands.register('search', 'jobs', function () {
      // TODO
      logging.checkpoint('Show job search panel.');
    });

    return self;
  }

  function mod_customers() {
    var self = {}
      , deck = jq.deck(jq('#customers').children())
      ;

    commands.register('customers', 'create', function () {
      // TODO
      logging.checkpoint('Create new customer.');
    });

    return self;
  }

  function mod_jobs() {
    var self = {}
      , deck = jq.deck(jq('#jobs').children())
      ;

    commands.register('jobs', 'create', function () {
      // TODO
      logging.checkpoint('Create new job.');
      commands.dispatch('search', 'customers');
    });

    return self;
  }

  function mod_personnel() {
    var self = {}
      , deck = jq.deck(jq('#personnel').children())
      ;

    commands.register('personnel', 'create', function () {
      var employee = connection('create', 'employee');
      logging.checkpoint('Employee entity', employee);
    });
    return self;
  }

  jq('#workspace').load(WORKSPACE_OVERLAY, function (jq_workspace) {
    logging.checkpoint('Loaded workspace overlay.');
    commands = mod_commands();
    tabset = mod_tabset();
    search = mod_search();
    customers = mod_customers();
    jobs = mod_jobs();
    personnel = mod_personnel();
    bbq = mod_bbq(jq_workspace[0]);
    deck('workspace');
  });
};

INIT(jQuery);

