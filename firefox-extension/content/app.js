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
  , handle_login_cmd
  , username_keyup, passkey_keyup
  , check_username, check_passkey
  , check_invalid_username, check_invalid_passkey
  , show_username_warning, show_passkey_warning
  ;

function show_button() {
  jq('#animated-spinner').hide();
  jq('#login-button').css('opacity', 1);
}

function show_spinner() {
  var button = jq('#login-button')
    , coords = button.offset()
    , x = (button.width() / 2) + coords.left
    , y = (button.height() / 2) + coords.top
    , spinner = jq('#animated-spinner')
    ;

  if (!spinner.length) {
    spinner = jq('<img id="animated-spinner" width="16" height="16" '+
                 'src="ui-anim_basic_16x16.gif" />')
      .appendTo('#main')
      .hide();
  }

  button.css('opacity', 0);
  spinner
    .css({
        position: 'absolute'
      , top: y - 8
      , left: x - 8
    })
    .show()
    ;
}

function start_application(connection) {
  spec.util = util;
  spec.connection = connection;
  platform.pref('cachetime', function (pref) {
    spec.cache_expiration = pref.value();
    APP(require, log, jq, spec);
  }, 40000);
  jq('#login-button').unbind('click', handle_login_cmd);
  jq('#animated-spinner').hide();
}

show_username_warning = (function () {
  var showing = false;
  return function (message) {
    if(!message) {
      jq('#username-warning-box').hide();
      showing = false;
      return;
    }

    if (showing) {
      jq('#username-warning-box').text(message);
      return;
    }

    var target = jq('#username')
      , width = target.width() * 1.1
      , height = target.height() * -0.3
      ;

    showing = true;
    target.popover({
        container: '#username-warning-box'
      , message: message
      , animate: {fadeIn: 400}
      , offsets: {top: height, left: width}
      });
  };
}());

show_passkey_warning = (function () {
  var showing = false;
  return function (message) {
    if(!message) {
      jq('#passkey-warning-box').hide();
      showing = false;
      return;
    }

    if (showing) {
      jq('#passkey-warning-box').text(message);
      return;
    }

    var target = jq('#passkey')
      , width = target.width() * 1.1
      , height = target.height() * -0.3
      ;

    showing = true;
    target.popover({
        container: '#passkey-warning-box'
      , message: message
      , animate: {fadeIn: 400}
      , offsets: {top: height, left: width}
      });
  };
}());

function dispatch_username_warning(message) {
  switch (message) {
  case 'User does not exist.':
    show_username_warning('This username does not exist.');
    break;
  case 'too short':
    show_username_warning(
        'A username must have at least one character.');
    break;
  case 'too long':
    show_username_warning(
        'A username cannot contain more than 70 characters.');
    break;
  case 'invalid characters':
    show_username_warning('A username may only contain the '+
        'characters "a" - "z", "A" - "Z", "0" - "9", and "_".');
    break;
  default:
    SHARED.throw_error(log)(new Error(
      'Unexpected login error: "'+ message +'".'));
  }
}

function dispatch_passkey_warning(message) {
  switch (message) {
  case 'Authentication denied.':
    show_passkey_warning('Invalid passkey.');
    break;
  case 'too short':
    show_passkey_warning(
        'A passkey must have at least 4 characters.');
    break;
  case 'too long':
    show_passkey_warning(
        'A passkey cannot contain more than 140 characters.');
    break;
  case 'invalid characters':
    show_passkey_warning(
        'A passkey may only contain visible characters.');
    break;
  default:
    SHARED.throw_error(log)(new Error(
      'Unexpected login error: "'+ message +'".'));
  }
}

function show_login_warning(message) {
  var target = jq('p.login.submit')
    , height = target.height() * 1.3
    ;
  target.popover({
      container: '#login-warning-box'
    , message: message
    , animate: {show: 0}
    , offsets: {top: height}
    });
}

function dispatch_login_warning(message) {
  switch (message) {
  case 'Authentication denied.':
    dispatch_passkey_warning(message);
    window.setTimeout(function () {
      jq('#passkey')
        .focus()
        .keyup(passkey_keyup)
        ;
    }, 0);
    break;
  case 'User does not exist.':
    dispatch_username_warning(message);
    window.setTimeout(function () {
      jq('#username')
        .focus()
        .keyup(username_keyup)
        ;
    }, 0);
    break;
  case 'DCubeError: Request error.':
    // TODO: This should be a dialog.
    show_login_warning('Lost network connection.');
    break;
  default:
    SHARED.throw_error(log)(new Error(
      'Unexpected login error: "'+ message +'".'));
  }
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
      log.debug(err);
      log.warn('Login DB connection request problem.');
      dispatch_login_warning(err +'');
      show_button();
    }
  );
}

function validate_passkey(passkey) {
  try {
    passkey = SHARED.validateString(
                passkey, 4, 140, /[\b\t\v\f\r\n]/);
  }
  catch (e) {
    // 'too short', 'too long', 'invalid characters'
    return [false, e];
  }
  return [passkey];
}

function validate_username(username) {
  try {
    username = SHARED.validateString(
                 username, 1, 70, /\W/);
  }
  catch (e) {
    // 'too short', 'too long', 'invalid characters'
    return [false, e];
  }
  return [username];
}

function check_corrected_username() {
  var username = validate_username(this.value);
  if (!username[0]) {
    dispatch_username_warning(username[1]);
    check_username = check_invalid_username;
  }
}

check_invalid_username = function () {
  var username = validate_username(this.value);
  if (!username[0]) {
    dispatch_username_warning(username[1]);
    return;
  }
  show_username_warning(false);
  check_username = check_corrected_username;
};

check_username = check_invalid_username;

username_keyup = function (ev) {
  check_username.call(this);
};

function check_corrected_passkey() {
  var passkey = validate_passkey(this.value);
  if (!passkey[0]) {
    dispatch_passkey_warning(passkey[1]);
    check_passkey = check_invalid_passkey;
  }
}

check_invalid_passkey = function () {
  var passkey = validate_passkey(this.value);
  if (!passkey[0]) {
    dispatch_passkey_warning(passkey[1]);
    return;
  }
  show_passkey_warning(false);
  check_passkey = check_corrected_passkey;
};

check_passkey = check_invalid_passkey;

passkey_keyup = function (ev) {
  check_passkey.call(this);
};

handle_login_cmd = function (ev) {
  var username = jq('#username').unbind('keyup', username_keyup).val()
    , passkey = jq('#passkey').unbind('keyup', passkey_keyup).val()
    ;

  show_spinner();
  show_username_warning(false);
  show_passkey_warning(false);
  username = validate_username(username);
  passkey = validate_passkey(passkey);

  if (username[0] && passkey[0]) {
    try_login(username[0], passkey[0]);
    return false;
  }

  if (username[1]) {
    window.setTimeout(function () {
      jq('#username')
        .focus()
        .keyup(username_keyup)
        ;
      show_button();
    }, 0);
    dispatch_username_warning(username[1]);
    return false;
  }

  window.setTimeout(function () {
    jq('#passkey')
      .focus()
      .keyup(passkey_keyup)
      ;
    show_button();
  }, 0);
  dispatch_passkey_warning(passkey[1]);
  return false;
};

function show_login() {
  jq('#login').load(LOGIN_OVERLAY, function () {
    jq('#login-button').click(handle_login_cmd);
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
  var state = null

    , panels = {
        customers: jq('#customer-search').hide()
      , jobs: jq('#job-search').hide()
      }

    , customer_search_mode = 'customers'
    , jq_customer_results = jq('#customer-search-results')
    , customer_results_template = jq('#customer_search_results-template')
                                    .template()
    ;

  jq.commandControl.bind('search', function (ev, command, params) {
    if (command === 'customers' || command === 'jobs') {
      if (state) {
        panels[state].hide();
      }
      if (command === 'customers') {
        if (customer_search_mode !== params.mode) {
          jq_customer_results.html('');
        }
        customer_search_mode = params.mode;
      }
      panels[command].show();
      state = command;
    }
    else if (state) {
      panels[state].hide();
      state = null;
    }
  });

  jq_commandset.bind('commandstate', function (ev, new_state, changes) {
    if (un.indexOf(changes, 'search') === -1 && state !== null) {
      jq.commandControl.push('search', 'none');
    }
  });

  function maybe_customer_results(results) {
    log.trace('customer search results length: '+
        (results ? results.length : '0'));

    cache(connection('id'), function (transaction) {
      var rv = [];
      results = results || [];

      try {
        un.each(results, function (customer) {
          var key = customer('key');
          transaction.put(key, customer, cache_exp);
          rv.push({
              key: key
            , names: customer('entity').names
          });
        });
        jq_customer_results
          .html(customer_results_template({
                  customers: rv
                , link_class: (customer_search_mode === 'newjob' ?
                    'cmd' : 'bbq')
                , link_hash: (customer_search_mode === 'newjob' ?
                    'jobs/create?customer=' : 'customers/view?key=')
                }));
      }
      catch (e) {
        throw_error(e);
      }
      finally {
        transaction.close();
      }
    });
  }

  jq('#customer-search-button').click(function (ev) {
    connection('query')
      .start()
      .eq('kind', 'customer')
      .range('last_name', jq('#customer-search-lastname').val().toUpperCase())
      .append(maybe_customer_results)
      .send()
      ;
    return false;
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

function mod_jobs(jq_commandset) {
  var modname = 'jobs'
    , kind = 'job'
    , fieldnames = [
        'header'
      , 'dates'
      , 'payments'
      , 'special-orders'
      , 'subcontractors'
      , 'siding'
      , 'roofing'
      , 'permits'
      , 'estimate'
      , 'profitandtaxes'
      ]
    , jq_view = jq('#'+ modname +'-view')
    , tab_panels = jq.deck(jq('#'+ modname).children())
    , commands = {}
    , render = rendering(modname, fieldnames)
    , control = get_ViewControl(modname)
    , currently_viewing
    ;

  function toshow(key, view) {
  }

  function show(key, view) {
    //logging.inspect('view', view);
    render('header', {strname: view.strname, description: view.description});
    render('dates', {
        contractdate: view.contractdate
      , est_startdate: view.est_startdate
      , startdate: view.startdate
      , est_completedate: view.est_completedate
      , completedate: view.completedate
      , handoff: view.handoff
      , walkthrough: view.walkthrough
    });
    render('payments', {
        payments: view.payments
      , direct_pays: view.direct_pays
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

  // TODO: Appending may also need modification and data mapping.
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
    log.trace(modname +'::view');
    if (params.key !== currently_viewing) {
      control.show = show;
      control.open(params.key);
    }
    tabset.show(modname);
    tab_panels(modname +'-view');
  };

  commands.create = function (params) {
    log.trace(modname +'::create');
    if (!params.customer) {
      throw_error(new Error('Cannot create a job without a customer.'));
    }
    control.show = show_new;
    control.create(kind, {customer: params.customer});
  };

  events.addListener('db.committed', control.commit());
  jq_commandset.bind('commandstate', view_focus(modname, control));
  jq.commandControl.bind(modname, function (ev, command, params) {
    commands[command](params);
  });
}

jq('#workspace').load(WORKSPACE_OVERLAY, function (jq_workspace) {
  var interval
    , commandset = jq('#commandset').commandSet()
    ;

  tabset = mod_tabset();
  mod_search(commandset);
  mod_customers(commandset);
  mod_jobs(commandset);
  mod_personnel(commandset);
  set_commands(jq_workspace[0]);

  interval = window.setInterval(function () {
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

