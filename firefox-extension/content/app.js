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
  , main_deck = spec.deck
  , cache_exp = spec.cache_expiration
  , util = spec.util
  , isArray = util.isArray
  , logging = spec.logging
  , curry = util.curry
  , events = require('events')
  , view = require('view')
  , cache = require('memcache').cache
  , ViewControl = SHARED.ViewControl
  , throw_error = SHARED.throw_error(log)
  , tabset
  , $N = {}
  ;

function set_commands(workspace) {
  jq('a.bbq', workspace).live('click', function (ev) {
    log.trace('a.bbq '+ jq(this).attr('href'));
    var parts = jq(this).attr('href').split('/');
    jq.commandControl.push(parts[0], parts[1]);
    return false;
  });

  jq('a.cmd', workspace).live('click', function (ev) {
    log.trace('a.cmd '+ jq(this).attr('href'));
    var parts = jq(this).attr('href').split('/');
    jq.commandControl.broadcast(parts[0], parts[1]);
    return false;
  });
}

function mod_tabset() {
  var self = {}
    , deck = jq.deck(jq('#tabset').children())
    , panels = ['customers', 'personnel', 'jobs']
    , current
    ;

  jq.commandControl.bind('panels', function (ev, panel) { deck(panel); });

  self.show = function (panel_id) {
    if (panel_id !== current && un.indexOf(panels, panel_id) !== -1) {
      jq.bbq.pushState({'panels': panel_id});
      current = panel_id;
    }
  };

  return self;
}

function mod_search(jq_commandset) {

  jq.commandControl.bind('search', function (ev, command, params) {
  });

  jq_commandset.bind('commandstate', function (ev, new_state, changes) {
    if (un.indexOf(changes, 'search') === -1 && state !== 'none') {
      jq.commandControl.push('search', 'none');
    }
  });
}

function get_ViewControl(name) {
  return ViewControl({
      connection: connection
    , cache: cache
    , mapview: view.mapview
    , cache_expiration: cache_exp
    , name: name
    , logging: logging
  });
}

function view_focus(modname, control) {
  return function (state) {
    var panel = (state.panels || $N).state;
    state = (state.customers || $N).state;
    if (panel === modname && state === 'view') {
      control.focus();
    }
    else {
      control.blur();
    }
  };
}

function rendering(mod_name, fields) {
  var templates = {}
    , field_vals = {}
    ;

  un.each(fields, function (field_name) {
    log.trace('getting template #'+ mod_name +'_'+ field_name +'-template');
    templates[field_name] = jq('#'+ mod_name +'_'+ field_name +'-template')
                              .template();
    field_vals[field_name] = jq('#'+ mod_name +'-'+ field_name);
  });

  return function (name, data) {
    try {
      field_vals[name].html(templates[name](data));
    } catch (e) {
      throw_error(e);
    }
  };
}

function mod_customers(jq_commandset) {
  var modname = 'customers'
    , kind = 'customer'
    , fieldnames = ['names', 'phones', 'addresses', 'emails']
    , jq_view = jq('#'+ modname +'-view')
    , tab_panels = jq.deck(jq('#'+ modname).children())
    , commands = {}
    , render = rendering(modname, fieldnames)
    , control = get_ViewControl(modname)
    , currently_viewing
    ;

  function show(key, view) {
    un.each(view, function (value, name) {
      var data = {};
      data[name] = value;
      render(name, data);
    });
    currently_viewing = key;
  }

  function show_new(key, view) {
    show(key, view);
    jq.commandControl.push(modname, 'view?key='+ key);
  }

  jq('input.fform', jq_view[0])
    .live('keyup', function (ev) {
      // TODO: Validation
      control.update(this.name, this.value);
    });

  jq('a.fform.append', jq_view[0])
    .live('click', function (ev) {
      var field = {}
        , name = jq(this).attr('href')
        , view
        ;

      field[name] = control.entity.data[name];
      field[name].push({});
      view = control.append(field);
      render(name, view[name]);
      return false;
    });

  commands.view = function (params) {
    if (params.key !== currently_viewing) {
      control.show = show;
      control.open(params.key);
    }
    tabset.show(modname);
    tab_panels(modname +'-view');
  };

  commands.create = function () {
    log.trace(modname +'::create');
    control.show = show_new;
    control.create(kind);
  };

  events.addListener('db.committed', control.commit());
  jq_commandset.bind('commandstate', view_focus(modname, control));
  jq.commandControl.bind(modname, function (ev, command, params) {
    commands[command](params);
  });
}

function mod_personnel(jq_commandset) {
  var modname = 'personnel'
    , kind = 'employee'
    , fieldnames = ['name', 'phones', 'addresses', 'groups']
    , jq_view = jq('#'+ modname +'-view')
    , jq_directory = jq('#personnel-group-list')
    , directory_template = jq('#personnel_directory-template').template()
    , tab_panels = jq.deck(jq('#'+ modname).children())
    , commands = {}
    , render = rendering(modname, fieldnames)
    , control = get_ViewControl(modname)
    , currently_viewing
    ;

  function show(key, view) {
    un.each(view, function (value, name) {
      var data = {};
      data[name] = value;
      render(name, data);
    });
    currently_viewing = key;
  }

  function show_new(key, view) {
    show(key, view);
    jq.commandControl.push(modname, 'view?key='+ key);
  }

  jq('input.fform', jq_view[0])
    .live('keyup', function (ev) {
      // TODO: Validation
      control.update(this.name, this.value);
    });

  jq('a.fform.append', jq_view[0])
    .live('click', function (ev) {
      var field = {}
        , name = jq(this).attr('href')
        , view
        ;

      field[name] = control.entity.data[name];
      field[name].push({});
      view = control.append(field);
      render(name, view[name]);
      return false;
    });

  commands.view = function (params) {
    if (params.key !== currently_viewing) {
      control.show = show;
      control.open(params.key);
    }
    tabset.show(modname);
    tab_panels(modname +'-view');
  };

  commands.create = function () {
    log.trace(modname +'::create');
    control.show = show_new;
    control.create(kind);
  };

  commands.directory = function () {
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
          tab_panels('personnel-directory');
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
    tabset.show(modname);
  };

  events.addListener('db.committed', control.commit());
  jq_commandset.bind('commandstate', view_focus(modname, control));
  jq.commandControl.bind(modname, function (ev, command, params) {
    logging.checkpoint('got command', command);
    commands[command](params);
  });
}

function mod_jobs() {
  /*
  var self = {}
    , deck = jq.deck(jq('#jobs').children())
    ;

  commands.register('jobs', 'create', function () {
    // TODO
    logging.checkpoint('Create new job.');
    commands.dispatch('search', 'customers');
  });

  return self;
  */
}

jq('#workspace').load(WORKSPACE_OVERLAY, function (jq_workspace) {
  var commandset = jq('#commandset').commandSet();
  tabset = mod_tabset();
  mod_search(commandset);
  mod_customers(commandset);
  //mod_jobs();
  mod_personnel(commandset);
  set_commands(jq_workspace[0]);

  var interval = window.setInterval(function () {
    try {
      connection('commit')(null, function (err) {
        log.warn(err);
        log.warn('Shutting down commit loop.');
        window.clearInterval(interval);
        throw_error(new Error('Encountered network error -- '+
            'Shutting down commit loop.'));
      });
    } catch (e) {
      log.warn(e);
    }
  }, 3000);

  main_deck('workspace');
});

// TODO Watch and notify db status.
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

