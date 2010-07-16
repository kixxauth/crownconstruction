/*

License
-------

All source code in this directory is licensed under the MIT license unless
otherwise noted in the source file itself.

See MIT-LICENSE in this directory for details.

All content and images in this directory are (c) 2009 - 2010 by contributors to The
Fireworks Project Inc. (http://www.fireworksproject.com) and, unless otherwise
indicated, are licensed under a Creative Commons Attribution-Share Alike 3.0
Unported License (http://creativecommons.org/licenses/by-sa/3.0/).

See CC-LICENSE in this folder for more details.

*/

(function (jq, underscore) {
  var deck = jq.deck(jq('#application-panels').children())
    , commandset = jq('#commandset').commandSet()
    , un
    , require = Components.utils
                  .import('resource://fireworks/lib/require.js', null)
                  .require
    , events = require('events')
    , util = require('util')
    , logging = require('logging')
    , log
    , dcube
    , user
    , start
    , panels
    ;

  jq('#panel-navigation').hide();

  function mod_tabset() {
    var self = {}
      , panels = [
          'authuser'
        , 'createdb'
        , 'viewdb'
        , 'createuser'
        , 'viewuser'
        , 'console']
      , current
      ;

    jq.commandControl.bind('panels', function (ev, panel) {
      deck(panel);
      current = panel;
    });

    self.show = function (panel_id) {
      if (panel_id !== current && un.indexOf(panels, panel_id) !== -1) {
        current = panel_id;
        jq.commandControl.push('panels', panel_id);
      }
    };

    return self;
  }

  function maybe_authenticated_start(data, err) {
    var str = 'no result';
    if (err) {
      str = util.prettify(err);
      Components.utils.reportError(err);
      jq('#console-content')
        .html('<pre>'+ str +'</pre>');
    }
    if (data) {
      data.groups = data.groups || [];
      str = jq('#user-template').template(data);
      jq('#console-content')
        .html('clear');
    }
    jq('#authuser-content').html(str);
    jq('#panel-navigation').show();
    panels('authuser');
  }

  function maybe_new_db(data, err) {
    var str = 'no result';
    if (err) {
      str = err +'';
      Components.utils.reportError(err);
      jq('#console-content')
        .html('<pre>'+ util.prettify(err) +'</pre>');
      if (err === 'Database already exists.' ||
          err === 'User is restricted.' ||
          err === 'Authentication denied.') {
        jq('#createdb-content').text(err);
        return;
      }
      jq('#db-update-message').text('request error');
    }
    if (data) {
      data.owner_acl = data.owner_acl || [];
      data.user_acl = data.user_acl || [];
      data.manager_acl = data.manager_acl || [];
      str = jq('#editdb-template').template(data);
      jq('#console-content')
        .html('clear');
      jq('#db-update-message').text('created');
    }
    jq('#viewdb-content').html(str);
    panels('viewdb');
  }

  function maybe_db(data, err) {
    var str = 'no result';
    if (err) {
      str = err +'';
      Components.utils.reportError(err);
      jq('#console-content')
        .html('<pre>'+ util.prettify(err) +'</pre>');
      jq('#db-update-message').text('request error');
    }
    if (data) {
      data.owner_acl = data.owner_acl || [];
      data.user_acl = data.user_acl || [];
      data.manager_acl = data.manager_acl || [];
      str = jq('#editdb-template').template(data);
      jq('#console-content')
        .html('clear');
      jq('#db-update-message').text('got db');
    }
    jq('#viewdb-content').html(str);
    panels('viewdb');
  }

  function maybe_new_user(data, err) {
    var str = 'no result';
    if (err) {
      str = err +'';
      Components.utils.reportError(err);
      jq('#console-content')
        .html('<pre>'+ util.prettify(err) +'</pre>');
      if (err === 'User already exists.') {
        jq('#createuser-content').html(str);
        return;
      }
      jq('#user-update-message').text('request error');
    }
    if (data) {
      data.groups = data.groups || [];
      str = jq('#edituser-template').template(data);
      jq('#console-content')
        .html('clear');
      jq('#user-update-message').text('created');
    }
    jq('#viewuser-content').html(str);
    panels('viewuser');
  }

  function maybe_user(data, err) {
    var str = 'no result';
    if (err) {
      str = err +'';
      Components.utils.reportError(err);
      jq('#console-content')
        .html('<pre>'+ util.prettify(err) +'</pre>');
      jq('#user-update-message').text('request error');
    }
    if (data) {
      data.groups = data.groups || [];
      str = jq('#edituser-template').template(data);
      jq('#console-content')
        .html('clear');
      jq('#user-update-message').text('got user');
    }
    jq('#viewuser-content').html(str);
    panels('viewuser');
  }

  function authenticate(ev) {
    var username = jq('#username').val()
      , passkey = jq('#passkey').val()
      ;

    dcube.User(username, function (x) {
      user = x;
      user('get', passkey, username)(
        function (response) {
          maybe_authenticated_start(response);
        },
        function (ex) {
          log.info(ex);
          maybe_authenticated_start(false, ex);
        });
    });
    return false;
  }

  function create_db(ev) {
    var passkey = jq('#passkey').val()
      , dbname = jq('#new-dbname').val()
      ;

    user('createDatabase', passkey, dbname)(
      function (response) {
        maybe_new_db(response);
      },
      function (ex) {
        log.info(ex);
        maybe_new_db(false, ex);
      });
    return false;
  }

  function update_db(ev) {
    var passkey = jq('#passkey').val()
      , name = jq('#view-dbname').text()
      , owner_acl = jq('#owner-acl').val().split(' ')
      , manager_acl = jq('#manager-acl').val().split(' ')
      , user_acl = jq('#user-acl').val().split(' ')
      , data  = {}
      ;

    data.name = name;
    if (owner_acl.length && owner_acl[0]) {
      data.owner_acl = owner_acl;
    }
    if (manager_acl.length && manager_acl[0]) {
      data.manager_acl = manager_acl;
    }
    if (user_acl.length && user_acl[0]) {
      data.user_acl = user_acl;
    }

    jq('#db-update-message').text('updating db');
    user('updateDatabase', passkey, name, data)(
      function (result) {
        maybe_db(result);
      },
      function (ex) {
        log.info(ex);
        maybe_db(false, ex);
      });
    return false;
  }

  function get_db(ev) {
    var passkey = jq('#passkey').val()
      , dbname = jq('#existing-dbname').val()
      ;

    jq('#db-update-message').text('getting db');
    user('getDatabase', passkey, dbname)(
      function (response) {
        maybe_db(response);
      },
      function (ex) {
        log.info(ex);
        maybe_db(false, ex);
      });
    return false;
  }

  function create_user(ev) {
    var passkey = jq('#passkey').val()
      , target = jq('#new-username').val()
      ;

    dcube.userExists(target)(
      function (exists) {
        if (exists) {
          maybe_new_user(false, 'User already exists.');
          return;
        }
        dcube.createUser(target)(
          function (created) {
            if (!created) {
              maybe_new_user(false, 'User already exists.');
              return;
            }
            user('get', passkey, target)(
              function (response) {
                maybe_new_user(response);
              },
              function (ex) {
                maybe_new_user(false, ex);
              });
          },
          function (ex) {
            log.info(ex);
            maybe_new_user(false, ex);
          });
      },
      function (ex) {
          log.info(ex);
          maybe_new_user(false, ex);
      })
    return false;
  }

  function update_user(ev) {
    var passkey = jq('#passkey').val()
      , target = jq('#view-username').text()
      , data = {
          username: target
        , groups: jq('#user-groups').val().split(' ')
        }
      ;
    jq('#user-update-message').text('updating user');
    user('update', passkey, target, data)(
      function (response) {
        maybe_user(response);
      },
      function (ex) {
        maybe_user(false, ex);
      });
    return false;
  }

  function get_user(ev) {
    var passkey = jq('#passkey').val()
      , target = jq('#existing-username').val()
      ;

    jq('#user-update-message').text('getting user');
    user('get', passkey, target)(
      function (response) {
        maybe_user(response);
      },
      function (ex) {
        log.info(ex);
        maybe_user(false, ex);
      });
    return false;
  }

  start = events.Aggregate(function (require, Q) {
    // DOM is ready and modules have loaded.
    jq = Q.noConflict(true);
    un = underscore.noConflict();

    dcube = require('dcube');
    log = logging.get('Fireworks_Admin');

    panels = mod_tabset().show;

    jq('a.bbq').live('click', function (ev) {
      var parts = jq(this).attr('href').split('/');
      jq.commandControl.push(parts[0], parts[1]);
      return false;
    });

    jq('a.cmd').live('click', function (ev) {
      var parts = jq(this).attr('href').split('/');
      jq.commandControl.broadcast(parts[0], parts[1]);
      return false;
    });

    jq('#authenticate').click(authenticate);
    jq('#create-db').click(create_db);
    jq('#update-db').click(update_db);
    jq('#get-db').click(get_db);
    jq('#create-user').click(create_user);
    jq('#update-user').click(update_user);
    jq('#get-user').click(get_user);
  });

  window.location.hash = '';
  require.ensure(['dcube'], start());
  jq(start());
}(jQuery, _));
