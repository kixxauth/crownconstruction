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
    , logging = require('logging')
    , log = logging.get(env.LOG_NAME || 'Fireworks_App')
    ;

  log.info('Module system bootstrapped.');
  platform.pref('dev', function (dev_pref) {
    if (dev_pref.value()) {
      jq('#underlay').load(DEV_OVERLAY);
    }
    LOGIN(require, log, jq, {
        db: require('db')
      , deck: deck
      , logging: logging
      , platform: platform
    });
  }, false);
});

require.ensure(['environ', 'platform', 'logging', 'db'], start());
jq(start());
};

LOGIN = function (require, log, jq, spec) {
var db = spec.db
  , util = require('util')
  , deck = spec.deck
  , platform = spec.platform
  ;

function start_application(connection) {
  spec.util = util;
  spec.connection = connection;
  platform.pref('cachetime', function (pref) {
    spec.cache_expiration = pref.value();
    APP(require, log, jq, spec);
  }, 40000);
}

function show_login() {
  jq('#login').load(LOGIN_OVERLAY, function () {
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
      promise(start_application, 
        // DCubeError: 'Request error.'
        // 'User does not exist.'
        // 'Authentication denied.'
        // DB does not exist???
        // Unauthenticated on DB???
        function (err) {
          jq_login_warn.html(err).show();
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
    jq('#username').focus();
  });
}

function show_connections(connections) {
  jq('#connections').load(CONNECTIONS_OVERLAY, function () {
    var jq_connections = jq('#connctions-list')
      .html(jq('#connections-list-template')
              .template({connections: connections}));

    jq('a.connections', jq_connections[0])
      .live('click', function () {
        var href = jq(this).attr('href');
        if (href === 'create') {
          show_login();
        }
        else {
          db.getConnection(href, start_application);
        }
        return false;
      });

    deck('connections');
  });
}

db.connections(function (connections) {
  log.info(connections.length +' connections.');
  if (connections.length) {
    show_connections(connections);
  }
  else {
    show_login();
  }
});
};

APP = function (require, log, jq, spec) {
var un = _.noConflict()
  , connection = spec.connection
  , Query = spec.db.Query
  , main_deck = spec.deck
  , cache_exp = spec.cache_expiration
  , util = spec.util
  , isArray = util.isArray
  , logging = spec.logging
  , curry = util.curry
  , events = require('events')
  , view = require('view')
  , mapview = view.mapview
  , cache = require('memcache').cache
  , ViewControl = SHARED.ViewControl
  , throw_error = SHARED.throw_error(log)
  , commands
  , tabset
  , $N = {}
  ;

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

function set_commands(workspace) {
  jq('a.bbq', workspace).live('click', function (ev) {
    // TODO: DEBUG REMOVE 
    log.trace('a.bbq '+ jq(this).attr('href'));

    var state = {}
      , parts = jq(this).attr('href').split('/')
      , id = parts[0]
      , url = parts[1]
      ;

    state[id] = url;
    jq.bbq.pushState(state);
    return false;
  });

  jq('a.cmd', workspace).live('click', function (ev) {
    // TODO: DEBUG REMOVE 
    log.trace('a.cmd '+ jq(this).attr('href'));

    var state = {}
      , parts = jq(this).attr('href').split('/')
      , id = parts[0]
      , url = parts[1]
      , sub_parts = url.split('?')
      , state_str = sub_parts[0]
      , params = jq.deparam.querystring(sub_parts[1], true)
      ;

    state[id] = {state: state_str, params: params};
    commands.broadcast(state);
    return false;
  });
}

function mod_tabset() {
  var self = {}
    , deck = jq.deck(jq('#tabset').children())
    , panels = ['customers', 'jobs', 'personnel']
    , current
    ;

  un.each(panels, function (panel) {
    commands.register('panels', panel, curry(deck, panel));
  });

  self.show = function (panel_id) {
    logging.checkpoint('show panel', panel_id);
    if (panel_id !== current && un.indexOf(panels, panel_id) !== -1) {
      logging.checkpoint('push state for', panel_id);
      jq.bbq.pushState({'panels': panel_id});
      current = panel_id;
    }
  };

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
  var jq_personnel = jq('#personnel')
    , deck = jq.deck(jq_personnel.children())
    , control = ViewControl(connection, cache, mapview, cache_exp, logging)

    // Cache templates
    , directory_template = jq('#personnel_directory-template').template()
    , name_template = jq('#employee_name-template').template()
    , addresses_template = jq('#employee_addresses-template').template()
    , phones_template = jq('#employee_phones-template').template()
    , groups_template = jq('#employee_groups-template').template()

    // Cache jQuery collection
    , jq_directory = jq('#personnel-group-list')
    , jq_name = jq('#employee-name')
    , jq_addresses = jq('#employee-addresses')
    , jq_phones = jq('#employee-phones')
    , jq_groups = jq('#employee-groups')
    ;

  function handle_input(ev) {
    logging.checkpoint('update', this.name);
    control.update(this.name, this.value);
  }

  jq('input.fform', jq_personnel[0]).live('keyup', handle_input);

  control.busy = function () {
    // TODO
    // Show busy indicator.
    alert('Busy...');
  };

  control.show = function (key, employee) {
    logging.inspect('employee view', employee);
    var name, addresses, phones, groups;
    try {
      if (!key) {
        throw new Error('Missing employee entity key.');
      }
      if (!employee) {
        throw new Error('Missing employee entity.');
      }

      jq_name.html(name_template(
            {name: employee.name}));

      jq_addresses.html(addresses_template(
            {addresses: employee.addresses, key: key}));

      jq_phones.html(phones_template(
            {phones: employee.phones, key: key}));

      jq_groups.html(groups_template(
            {groups: employee.groups}));
    }
    catch (e) {
      throw_error(e);
    }
  };

  events.addListener('db.committing', control.commit());

  commands.observe(function (state) {
    // TODO DEBUG REMOVE
    logging.inspect('personnel state observer', state);
    var panel = (state.panels || $N).state
      , personnel = (state.personnel || $N).state
      ;

    if (panel === 'personnel' && personnel === 'view') {
      control.focus();
    }
    else {
      control.blur();
    }
  });

  commands.register('personnel', 'view', function (params) {
    control.open(params.key);
    tabset.show('personnel');
    deck('personnel-view');
  });

  commands.register('personnel', 'create', function () {
    // TODO
    // Create employee.
    /* Testing
    var employee = connection('create', 'employee')
      , view = mapview(employee('key'), employee('entity'))
      , ent = view.entity
      , pointer = view.pointer
      , view = view.view
      ;

    logging.checkpoint('Employee entity data', util.prettify(ent));
    logging.checkpoint('Employee entity view', util.prettify(view));

    logging.checkpoint('Should mutate.');
    update_field(employee('key') +'.name.first', 'Otto', pointer, ent);
    update_field(employee('key') +'.name.last', 'Van-go', pointer, ent);
    employee('update', ent);

    logging.checkpoint('Should be clean.');
    update_field(employee('key') +'.name.first', '', pointer, ent);
    update_field(employee('key') +'.name.last', '', pointer, ent);
    employee('update', ent);

    logging.checkpoint('Should mutate.');
    update_field(employee('key') +'.name.first', 'Bjorn', pointer, ent);
    update_field(employee('key') +'.name.last', 'Straussberg', pointer, ent);
    employee('update', ent);

    logging.checkpoint('Should commit.');
    connection('commit')(function (q) {
      // `q` is the number of committed entities.
      logging.checkpoint('commit', util.prettify(q));
    });
    */
  });

  commands.register('personnel', 'directory', function () {
    function maybe_results(results) {
      log.debug('Employee directory results: '+
        (isArray(results) ? results.length : 'invalid'));

      cache(connection('id'), function (transaction) {
        try {
          var groups = {};

          // Collect all the group names and members.
          jq.each(results, function (idx, result) {
            var i = 0
              , key = result('key')
              , employee = result('entity')
              , name = (employee.name.first +' '+ employee.name.last)
              , parts = employee.groups.split(',')
              , len = parts.length
              , group_name
              ;

            transaction.put(key, result, cache_exp);

            for (; i < len; i += 1) {
              group_name = jq.trim(parts[i]);
              if (!groups[group_name]) {
                groups[group_name] = [];
              }
              groups[group_name].push({
                  key: key
                , name: name
              });
            }
          });

          jq_directory.html(directory_template({groups: groups}));
          deck('personnel-directory');
        }
        catch (e) {
          throw_error(e);
        }
        finally {
          transaction.close();
        }
      });
    }

    connection('query')
      .start()
      .eq('kind', 'employee')
      .append(maybe_results)
      .send()
      ;
    tabset.show('personnel');
  });
}

jq('#workspace').load(WORKSPACE_OVERLAY, function (jq_workspace) {
  commands = SHARED.CommandControl(jq, throw_error);
  tabset = mod_tabset();
  mod_search();
  mod_customers();
  mod_jobs();
  mod_personnel();
  set_commands(jq_workspace[0]);

  window.setInterval(function () {
    try {
      connection('commit');
    } catch (e) {
      log.warn(e);
    }
  }, 3000);

  main_deck('workspace');
});

// TODO
/*
events.addListener('db.state', function (db) {
  logging.checkpoint(db.id +' is in state '+ db.state +'.');
});
events.addListener('db.committing', function (db) {
  logging.checkpoint(db.id +' is committing.');
});
events.addListener('db.committed', function (db) {
  logging.checkpoint(db.id +' committed in state '+ db.state +'.');
});
*/
};

INIT(jQuery);

