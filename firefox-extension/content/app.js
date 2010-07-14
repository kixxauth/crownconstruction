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
      SHARED.spinner('login');
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

  SHARED.spinner('login', jq('#login-button'), jq('#animated-spinner'));
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
      SHARED.spinner('login');
    }, 0);
    dispatch_username_warning(username[1]);
    return false;
  }

  window.setTimeout(function () {
    jq('#passkey')
      .focus()
      .keyup(passkey_keyup)
      ;
    SHARED.spinner('login');
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
    var jq_connections = jq('#connections-list')
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
  , register_control
  , throw_error = SHARED.throw_error(log)
  , validate_round_currency = SHARED.validate_currency()
  , autosave = {}
  , tabset
  , tabselectors
  , navset
  , personnel_cache
  , $N = {}
  , $F = function () {}
  ;

function mod_tab_selectors() {
  var self = {}
    , tab_selectors = {}
    , panels = {
        'default': ['home', 'controls']
      , 'customers': ['home', 'view', 'search', 'create']
      , 'jobs': ['home', 'view', 'search', 'create']
      , 'personnel': ['home', 'view', 'directory', 'create']
      }
    , base_color = jq('#default-panel-navigation').css('background-color')
    , current = {}
    ;

  un.each(panels, function (panel, panelname) {
    tab_selectors[panelname] = {};
    un.each(panel, function (tabname) {
      tab_selectors[panelname][tabname] = jq(
        'li.panel-navigation.'+ panelname +'.'+ tabname);
    });
  });

  tab_selectors.customers.view.hide();
  tab_selectors.jobs.view.hide();
  tab_selectors.personnel.view.hide();

  self.highlight = function (panelname, tabname) {
    tab_selectors[panelname][tabname]
      .css({
          'background-color': '#f8ad01'
        , 'background-image': 'url(./shared/fade-20.png)'
        , 'background-repeat': 'repeat-x'
        })
      .delay(800)
      .animate({'background-color': base_color}, 400)
      ;
  };

  self.activate = function (panelname, tabname) {
    if (current[panelname]) {
      current[panelname].removeClass('active');
    }
    current[panelname] = tab_selectors[panelname][tabname].addClass('active');
  };

  self.insert = function (panelname, tabname, href) {
    tab_selectors[panelname][tabname]
      .children('a.panel-navigation')
      .attr('href', href)
      .end()
      .show()
      ;
    self.activate(panelname, tabname);
  };

  self.get = function (panelname, tabname) {
    if (!tabname) {
      return tab_selectors[panelname];
    }
    return tab_selectors[panelname][tabname];
  };

  return self;
}

autosave.interval = null;
autosave.start = function () {
  if (autosave.interval !== null) {
    return;
  }
  autosave.interval = window.setInterval(function () {
    try {
      connection('commit')(null, function (err) {
        log.warn(err);
        log.warn('Shutting down commit loop.');
        window.clearInterval(autosave.interval);
        throw_error(new Error('Encountered network error -- '+
            'Shutting down commit loop.'));
      });
    } catch (e) {
      log.warn(e);
    }
  }, 3000);
};

autosave.clear = function () {
  window.clearInterval(autosave.interval);
  autosave.interval = null;
};

function mod_personnel_cache() {
  var timeout
    , transaction
    , callback
    , exp = cache_exp * 3
    ;

  function maybe_results(results) {
    var groups;
    log.debug('Employee caching: '+
      (isArray(results) ? results.length : 'invalid'));
    try {
      if (!isArray(results)) {
        log.warn('No personnel results.');
        return;
      }

      // Collect all the group names and members.
      groups = {};
      un.each(results, function (result) {
        if (typeof result !== 'function') {
          log.debug(result);
          log.error('Invalid response for personnel directory.');
        }

        var i = 0
          , key = result('key')
          , employee = result('entity')
          , name = (employee.name.first +' '+ employee.name.last)
          , parts = employee.groups.split(',')
          , group_name
          ;

        for (; i < parts.length; i += 1) {
          group_name = jq.trim(parts[i]);
          if (!groups[group_name]) {
            groups[group_name] = [];
          }
          groups[group_name].push({
              key: key
            , name: name
            , entity: result
            , data: employee
          });
        }
      });
      transaction.put('personnel', groups, exp);
    }
    catch (e) {
      throw_error(e);
    }
    finally {
      transaction.close();
    }
    if (typeof callback === 'function') {
      callback(groups);
      callback = null;
    }
  }

  function loopy(time) {
    timeout = window.setTimeout(function () {
      timeout = null;
      cache(connection('id'), function (t) {
        transaction = t;
        connection('query')
          .start()
          .eq('kind', 'employee')
          .append(maybe_results)
          .send()
          ;
        loopy();
      });
    }, time || (exp - 15000));
  }

  function get(cb) {
    cache(connection('id'), function (t) {
      var personnel = t.get('personnel');
      if (personnel) {
        t.close();
        cb(personnel);
        return;
      }

      transaction = t;
      callback = cb;
      connection('query')
        .start()
        .eq('kind', 'employee')
        .append(maybe_results)
        .send()
        ;
    });
  }

  loopy(1);
  jq(window)
    .blur(function (ev) {
      window.clearTimeout(timeout);
      timeout = null;
    })
    .focus(function (ev) {
      if (typeof timeout !== 'number') {
        loopy();
      }
    })
    ;

  return get;
}

function mod_navset() {
  var self = {}
    , selectors = {}
    , items = {
        panels: ['customers', 'jobs', 'personnel', 'default']
      , search: ['customers', 'jobs']
      }
    , current
    ;

  un.each(items, function (item, itemname) {
    selectors[itemname] = {};
    un.each(item, function (panelname) {
      selectors[itemname][panelname] = jq(
        'a.navigation.'+ itemname +'.'+ panelname);
    });
  });

  self.activate = function (item_name, panel_name) {
    if (current === selectors[item_name][panel_name]) {
      return;
    }
    if (current) {
      current.removeClass('active');
    }
    current = selectors[item_name][panel_name].addClass('active');
  };

  self.get = function (item_name, panel_name) {
    if (!panel_name) {
      return selectors[item_name];
    }
    return selectors[item_name][panel_name];
  };

  return self;
}

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

function mod_default(jq_commandset) {
  var modname = 'default'
    , tab_panels = jq.deck(jq('#'+ modname).children('.inner-tab-panel'))
    , commands = {}
    ;

  commands.home = function () {
    tabset.show(modname);
    tab_panels(modname +'-home');
    tabselectors.activate(modname, 'home');
  };

  commands.controls = function () {
    tabset.show(modname);
    tab_panels(modname +'-controls');
    tabselectors.activate(modname, 'controls');
  };

  jq.commandControl.bind(modname, function (ev, command, params) {
    commands[command](params);
  });

  jq.commandControl.bind('panels', function (ev, command, params) {
    if (command === modname) {
      if (!jq.commandControl.get()[modname]) {
        jq.commandControl.push(modname, 'home');
      }
    }
  });

  function start_handler(ev) {
    if (!jq.commandControl.get().panels) {
      jq.commandControl.push('panels', 'default');
    }
    jq(window).unbind('hashchange', start_handler);
  }
  jq(window).bind('hashchange', start_handler);
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
    log.trace('Search panel command "'+ command +'".');
    log.trace('Search panel current state is "'+ state +'".');
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
      if (customer_search_mode === 'newjob') {
       jq('#customer-search-close-icon')
         .removeClass('bbq')
         .addClass('cmd')
         ;
      }
      else {
       jq('#customer-search-close-icon')
         .removeClass('cmd')
         .addClass('bbq')
         ;
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

    if (!results || !results.length) {
      jq_customer_results
        .html('<li class="search-result">'+
              'No results were found.</li>');
      SHARED.spinner('customer-search');
      return;
    }

    cache(connection('id'), function (transaction) {
      var rv = [];
      results = results || [];

      try {
        un.each(results, function (customer) {
          var key = customer('key'), data = customer('entity');
          transaction.put(key, customer, cache_exp);
          rv.push({
              key: key
            , names: data.names
            , addresses: data.addresses
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
        SHARED.spinner('customer-search');
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
    SHARED.spinner('customer-search', jq(this), jq('#animated-spinner'));
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
  return function (ev, state) {
    var panel = (state.panels || $N).state;
    state = (state[modname] || $N).state;
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
      log.debug(e);
      throw_error('Unable to render tamplate "'+ name +'".');
    }
  };
}

register_control = (function () {
  var controls = [];

  jq(window).blur(function (ev) {
    un.each(controls, function (control) {
      control.windowBlur();
    });
  });

  jq(window).focus(function (ev) {
    un.each(controls, function (control) {
      control.windowFocus();
    });
  });

  return function(control) {
    controls.push(control);
  };
}());

function mod_personnel(jq_commandset) {
  var modname = 'personnel'
    , kind = 'employee'
    , fieldnames = ['name', 'phones', 'addresses', 'groups']
    , jq_view = jq('#'+ modname +'-view')
    , jq_directory = jq('#personnel-group-list')
    , directory_template = jq('#personnel_directory-template').template()
    , tab_panels = jq.deck(jq('#'+ modname).children('.inner-tab-panel'))
    , commands = {}
    , render = rendering(modname, fieldnames)
    , control = get_ViewControl(modname)
    , currently_viewing
    ;

  register_control(control);

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
        , parts = jq(this).attr('href').split('/')
        , tpl_name = parts[0], name = parts[1]
        , view
        , data = {}
        ;

      field[name] = control.entity.data[name];
      field[name].push({});
      view = control.append(field);
      data[name] = view[name];
      render(tpl_name, data);
      return false;
    });

  commands.home = function () {
    tabset.show(modname);
    tab_panels(modname +'-home');
    tabselectors.activate(modname, 'home');
  };

  commands.view = function (params) {
    if (params.key !== currently_viewing) {
      control.show = show;
      control.open(params.key);
    }
    tabset.show(modname);
    tab_panels(modname +'-view');
    tabselectors.insert(modname, 'view', modname +'/view?key='+ params.key);
  };

  commands.create = function () {
    log.trace(modname +'::create');
    control.show = show_new;
    control.create(kind);
    tabselectors.highlight(modname, 'create');
  };

  commands.directory = function () {
    personnel_cache(function (results) {
      jq_directory.html(directory_template({groups: results}));
      tab_panels('personnel-directory');
    });
    tabset.show(modname);
    tabselectors.activate(modname, 'directory');
  };

  events.addListener('db.committed', control.commit());
  jq_commandset.bind('commandstate', view_focus(modname, control));

  jq.commandControl.bind(modname, function (ev, command, params) {
    commands[command](params);
  });

  jq.commandControl.bind('panels', function (ev, command, params) {
    if (command === modname) {
      if (!jq.commandControl.get()[modname]) {
        jq.commandControl.push(modname, 'home');
      }
    }
  });
}

function mod_customers(jq_commandset) {
  var modname = 'customers'
    , kind = 'customer'
    , fieldnames = ['names', 'phones', 'addresses', 'emails', 'jobs']
    , jq_view = jq('#'+ modname +'-view')
    , tab_panels = jq.deck(jq('#'+ modname).children('.inner-tab-panel'))
    , commands = {}
    , render = rendering(modname, fieldnames)
    , control = get_ViewControl(modname)
    , currently_viewing
    ;

  register_control(control);

  tabselectors.get(modname, 'search').click(function () {
    tabselectors.highlight(modname, 'search');
  });

  function render_all(key, view) {
    un.each(view, function (data, name) {
      render(name, data);
    });
    currently_viewing = key;
  }

  function map_data(view, jobs) {
    var rv = view;
    rv.names = {names: view.names};
    rv.addresses = {addresses: view.addresses};
    rv.phones = {phones: view.phones};
    rv.emails = {emails: view.emails};
    rv.jobs = {jobs: []};
    
    un.each(jobs, function (job) {
      if (typeof job !== 'function') {
        log.warn('Invalid job entity supplied to cutomers::map_data().');
        return;
      }
      var data = job('entity');
      rv.jobs.jobs.push({
          key: job('key')
        , strname: data.strname
        , description: data.description
        });
    });

    logging.checkpoint('mapped customer data');
    logging.inspect('jobs', rv.jobs);

    return rv;
  }

  function show(key, view) {
    cache(connection('id'), function (transaction) {
      function maybe_results(results, err) {
        try {
          if (!results) {
            log.warn('Remote query error in customers::show().');
            log.debug(err);
            transaction.close();
            render_all(key, map_data(view, []));
            return;
          }
          un.each(results, function (job) {
            transaction.put(job('key'), job, cache_exp);
          });
          transaction.close();
        }
        catch (e) {
          transaction.close();
          throw_error(e);
        }
        render_all(key, map_data(view, results));
      }

      try {
        connection('query')
          .start()
          .eq('kind', 'job')
          .eq('ref_customer', key)
          .append(maybe_results)
          .send()
          ;
      }
      catch (e) {
        throw_error(e);
        transaction.close();
      }
    });
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
        , parts = jq(this).attr('href').split('/')
        , tpl_name = parts[0], name = parts[1]
        , view
        , data = {}
        ;

      field[name] = control.entity.data[name];
      field[name].push({});
      view = control.append(field);
      data[name] = view[name];
      render(tpl_name, data);
      return false;
    });

  commands.home = function () {
    tabset.show(modname);
    tab_panels(modname +'-home');
    tabselectors.activate(modname, 'home');
  };

  commands.view = function (params) {
    if (params.key !== currently_viewing) {
      control.show = show;
      control.open(params.key);
    }
    tabset.show(modname);
    tab_panels(modname +'-view');
    tabselectors.insert(modname, 'view', modname +'/view?key='+ params.key);
  };

  commands.create = function () {
    log.trace(modname +'::create');
    control.show = show_new;
    control.create(kind);
    tabselectors.highlight(modname, 'create');
  };

  events.addListener('db.committed', control.commit());
  jq_commandset.bind('commandstate', view_focus(modname, control));

  jq.commandControl.bind(modname, function (ev, command, params) {
    commands[command](params);
  });

  jq.commandControl.bind('panels', function (ev, command, params) {
    if (command === modname) {
      if (!jq.commandControl.get()[modname]) {
        jq.commandControl.push(modname, 'home');
      }
    }
  });
}

function mod_jobs(jq_commandset) {
  var modname = 'jobs'
    , kind = 'job'
    , fieldnames = [
        'header'
      , 'checkpoints'
      , 'dates'
      , 'payments'
      , 'special_orders'
      , 'subcontractors'
      , 'siding'
      , 'roofing'
      , 'permits'
      , 'estimate'
      , 'profitandtaxes'
      ]
    , jq_view = jq('#'+ modname +'-view')
    , tab_panels = jq.deck(jq('#'+ modname).children('.inner-tab-panel'))
    , commands = {}
    , render = rendering(modname, fieldnames)
    , control = get_ViewControl(modname)
    , validate = {}
    , currently_viewing
    ;

  register_control(control);

  tabselectors.get(modname, 'search').click(function () {
    tabselectors.highlight(modname, 'search');
  });

  function simply_update() {
    control.update(this.name, this.value);
  }

  function validate_number() {
    var num = this.value;
    if (!num) {
      return;
    }

    num = isNaN(num) ? '0' : num;
    this.value = num;
    control.update(this.name, +num);
  }

  function validate_money() {
    var results = validate_round_currency(this.value);
    this.value = results[0];
    control.update(this.name, results[1]);
  }

  function validate_date() {
    if (!this.value) {
      return;
    }

    var parts = this.value.split('/')
      , month, day, year, timestamp, offset
      ;

    if (parts.length !== 3) {
      return;
    }

    month = parts[0]; day = parts[1]; year = parts[2];
    timestamp = new Date(year, month -1, day);
    offset = timestamp.getTimezoneOffset() * 60 * 1000;
    control.update(this.name, (timestamp - offset));
  }

  // Job ID
  validate.strname = simply_update;
  // Sales person ref
  validate.sale_by = simply_update;
  // Estimate person ref
  validate.estimate_by = simply_update;
  // Production person ref
  validate.production_by = simply_update;
  validate.estimate_date = validate_date;
  validate.roundtrip_miles = validate_number;
  validate.allotted_miles = validate_number;
  validate.startdate = validate_date;
  validate.est_startdate = validate_date;
  validate.completedate = validate_date;
  validate.est_completedate = validate_date;
  validate.contractdate = validate_date;
  validate.description = simply_update;
  validate.taxlabor = validate_money;
  validate.estimated_profit = validate_money;

  validate.payments = function (key, field, i, leaf) {
    switch (leaf) {
    case 'due':
      validate_date.call(this);
      break;
    case 'amount':
      validate_money.call(this);
      break;
    default:
      control.update(this.name, this.value);
    }
  };

  validate.direct_pays = simply_update;
  validate.handoff = validate_date;
  validate.walkthrough = validate_date;

  validate.special_orders = function (key, field, i, leaf) {
    if (leaf === 'order_date' || leaf === 'delivery_date') {
      validate_date.call(this);
      return;
    }
    control.update(this.name, this.value);
  };

  validate.sub_contractors = function (key, field, i, leaf) {
    if (leaf === 'quote') {
      validate_money.call(this);
      return;
    }
    if (leaf === 'startdate') {
      validate_date.call(this);
      return;
    }
    control.update(this.name, this.value);
  };

  validate.siding = function (key, field, leaf) {
    if (leaf === 'squares') {
      validate_number.call(this);
      return;
    }
    control.update(this.name, this.value);
  };

  validate.roofing = function (key, field, leaf) {
    if (leaf === 'squares') {
      validate_number.call(this);
      return;
    }
    control.update(this.name, this.value);
  };

  validate.permits = function (key, field, i, leaf) {
    if (leaf === 'date_received') {
      validate_date.call(this);
      return;
    }
    control.update(this.name, this.value);
  };

  function render_all(key, view) {
    jq('input.fform.date', jq_view[0]).each(function () {
      jq(this).datepicker('destroy');
    });

    un.each(view, function (data, name) {
      render(name, data);
    });

    jq('input.fform.date', jq_view[0]).each(function () {
      jq(this).datepicker({onSelect: validate_date});
    });

    currently_viewing = key;
  }

  function map_data(view, personnel, customer) {
    var rv = {};
    customer = customer('entity');

    rv.header = {
      strname: view.strname
    , customer_name: customer.names[0].last +', '+ customer.names[0].first
    , sale_by: view.sale_by
    , production_by: view.production_by
    , description: view.description
    };

    rv.checkpoints = {handoff: view.handoff, walkthrough: view.walkthrough};

    rv.dates = {
      contractdate: view.contractdate
    , est_startdate: view.est_startdate
    , startdate: view.startdate
    , est_completedate: view.est_completedate
    , completedate: view.completedate
    };

    rv.payments = {
      payments: view.payments
    , direct_pays: view.direct_pays
    };

    rv.special_orders = {special_orders: view.special_orders};
    rv.subcontractors = {sub_contractors: view.sub_contractors};
    rv.siding = {siding: view.siding};
    rv.roofing = {roofing: view.roofing};
    rv.permits = {permits: view.permits};

    rv.estimate = {
      estimate_by: view.estimate_by
    , estimate_date: view.estimate_date
    , roundtrip_miles: view.roundtrip_miles
    , allotted_miles: view.allotted_miles
    };

    rv.profitandtaxes = {
      estimated_profit: view.estimated_profit
    , taxlabor: view.taxlabor
    };

    return rv;
  }

  function show(key, view) {
    cache(connection('id'), function (transaction) {
      var customer_key = view.customer.value
        , customer
        ;
      try {
        customer = transaction.get(customer_key);
        if (!customer) {
          connection('get', customer_key, function (customer, err) {
            try {
              if (!customer) {
                log.debug(err);
                log.warn('Job .get() connection error.');
              }

              customer = isArray(customer) && customer[0] ? customer[0] : null;

              if (customer) {
                transaction.put(customer_key, customer, cache_exp);
              }
            }
            catch (e) {
              throw_error(e);
            }
            finally {
              transaction.close();
            }
            personnel_cache(function (results) {
              if (!isArray(results)) {
                log.warn('No personnel results for job.');
                return;
              }
              render_all(key, map_data(view, results, customer));
            });
          });
          return;
        }
      }
      catch (e) {
        throw_error(e);
      }
      finally {
        transaction.close();
      }

      personnel_cache(function (results) {
        if (!isArray(results)) {
          log.warn('No personnel results for job.');
        }
        render_all(key, map_data(view, results, customer));
      });
    });
  }

  function show_new(key, view) {
    show(key, view);
    jq.commandControl.push(modname, 'view?key='+ key);
  }

  jq('input.fform', jq_view[0])
    .live('keyup', function (ev) {
      var parts = this.name.split('.');
      validate[parts[1]].apply(this, parts);
    });

  // TODO: Appending may also need modification and data mapping.
  jq('a.fform.append', jq_view[0])
    .live('click', function (ev) {
      var field = {}
        , parts = jq(this).attr('href').split('/')
        , tpl_name = parts[0], name = parts[1]
        , view
        ;

      field[name] = control.entity.data[name];
      field[name].push({});
      view = map_data(control.append(field), null, $F);

      jq('input.fform.date', jq_view[0]).each(function () {
        jq(this).datepicker('destroy');
      });

      render(tpl_name, view[tpl_name]);

      jq('input.fform.date', jq_view[0]).each(function () {
        jq(this).datepicker({onSelect: validate_date});
      });

      return false;
    });

  commands.home = function () {
    tabset.show(modname);
    tab_panels(modname +'-home');
    tabselectors.activate(modname, 'home');
  };

  commands.view = function (params) {
    log.trace(modname +'::view');
    if (params.key !== currently_viewing) {
      control.show = show;
      control.open(params.key);
    }
    tabset.show(modname);
    tab_panels(modname +'-view');
    tabselectors.insert(modname, 'view', modname +'/view?key='+ params.key);
  };

  commands.create = function (params) {
    log.trace(modname +'::create');
    if (!params.customer) {
      throw_error(new Error('Cannot create a job without a customer.'));
    }
    control.show = show_new;
    control.create(kind, {customer: params.customer});
    tabselectors.highlight(modname, 'create');
  };

  events.addListener('db.committed', control.commit());
  jq_commandset.bind('commandstate', view_focus(modname, control));

  jq.commandControl.bind(modname, function (ev, command, params) {
    commands[command](params);
  });

  jq.commandControl.bind('panels', function (ev, command, params) {
    if (command === modname) {
      if (!jq.commandControl.get()[modname]) {
        jq.commandControl.push(modname, 'home');
      }
    }
  });
}

jq('#workspace').load(WORKSPACE_OVERLAY, function (jq_workspace) {
  var commandset = jq('#commandset').commandSet()
    ;

  personnel_cache = mod_personnel_cache();
  tabset = mod_tabset();
  navset = mod_navset();
  commandset.bind('commandstate', function (ev, state) {
    var panel = (state.panels || $N).state
      , search = (state.search || $N).state
      ;

    if (panel) {
      navset.activate('panels', panel);
    }
    if (search && search !== 'none') {
      navset.activate('search', search);
    }
  });

  tabselectors = mod_tab_selectors();
  mod_search(commandset);
  mod_default(commandset);
  mod_customers(commandset);
  mod_jobs(commandset);
  mod_personnel(commandset);
  set_commands(jq_workspace[0]);

  events.addListener('db.state', function (db) {
    logging.checkpoint(db.id +' is in state '+ db.state +'.');
  });
  events.addListener('db.committing', function (db) {
    logging.checkpoint(db.id +' is committing.');
  });
  events.addListener('db.committed', function (db) {
    logging.checkpoint(db.id +' committed in state '+ db.state +'.');
  });

  autosave.start();
  main_deck('workspace');
  jq(window)
    .blur(function (ev) { autosave.clear(); })
    .focus(function (ev) { autosave.start(); })
    .trigger('hashchange')
    ;
});
};

INIT(jQuery);

