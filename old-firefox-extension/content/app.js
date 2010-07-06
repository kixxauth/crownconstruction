//
//

if (typeof FUEL === "undefined") {
  FUEL = Components.classes["@mozilla.org/fuel/application;1"]
        .getService(Components.interfaces.fuelIApplication);
}

if (typeof console === "undefined") {
  console = FUEL.console;
}

if (typeof NOT_IMP !== "function") {
  function NOT_IMP(hard) {
    try {
      ASSERT.ok(false, ""+ (arguments.callee.caller.name || "unknown") +
                       "() not yet implemented. Called from "+
                       (arguments.callee.caller.caller.name || "unknown"));
    } catch(e) {
      if (hard) {
        throw e;
      } else {
        console.log(e.name +": "+ e.message);
      }
    }
  }
}

if (typeof TODO !== "function") {
  function TODO(msg) {
    console.log("TODO: "+ msg);
  }
}

var APP = (function APP_init() {
  var self = {},

      log = 0,

      this_username,

      widgets = {},

      jMonad_extensions = {

        //
        // options:
        //  content: html string or jQuery object
        //  buttons: named functions
        //  classes: css classes to add
        //  height: in px (default = 'auto')
        //  modal: bool (defualt = false)
        //  position: 'center','left','right','top','bottom'
        //    Or an array containing an x,y coordinate pair in pixel offset from left, top
        //    corner of viewport (e.g. [350,100]).
        //    Or an array containing x,y position string values (e.g.
        //    ['right','top'] for top right corner).
        //    (default = 'center')
        //  title: string (default = '')
        //  width: in px (default=300)
        dialog: function (cc, opt) {
          opt = opt || {};
          jQuery('<div></div>')
            .append(opt.content || '<p></p>')
            .dialog({
              autoOpen: true,
              buttons: opt.buttons || {},
              closeOnEscape: true,
              closeText: "close",
              dialogClass: opt.classes || "",
              draggable: false,
              hide: null,
              height: opt.height || 'auto',
              maxHeight: false,
              maxWidth: false,
              minHeight: 150,
              minWidth: 150,
              modal: opt.modal,
              position: opt.position || 'center',
              resizable: false,
              show: null,
              stack: true,
              title: opt.title || '',
              width: opt.width || 300,
              zIndex: 1000,
              close: cc
            });
        },

        deck: function (cc, name) {
          NOT_IMP();
          cc();
        }
      };
  
  // Bind the jModad extensions.
  //jMonad.extend(jMonad_extensions);

  widgets.job_form = (function () {
    var self = {};

    self.update = function job_form_update(data) {
      NOT_IMP();
    };

    return self;
  }());

  function validate_username() {
    // Remove any previous warnings that may have been placed.
    jQuery('#login-input-ctn > .line-warning').remove();

    try {
      username = DCube.validateUsername(username);
    } catch(ex) {
      if (ex.name === "DCubeUsernameValidationError") {
        switch (ex.message) {
        case "too short":
          jQuery('#username-input-ctn')
            .append('<span class="line-warning">Your username must '+
                    'contain at least 1 charactar.</span>');
          break;
        case "too long":
          jQuery('#username-input-ctn')
            .append('<span class="line-warning">Your username must not '+
                    'contain more than 140 characters.</span>');
          break;
        case "invalid characters":
          jQuery('#username-input-ctn')
            .append('<span class="line-warning">Your username may only '+
                    'contain characters from a-z, A-Z, 0-9, and the "_".'+
                    '</span>');
          break;
        }
        jQuery('#username').focus().select();
        return false;
      }
      log.error("Unexpected error from DCube.validatePasskey(): "+ ex);
    }
    return true;
  }

  function validate_passkey() {
    // Remove any previous warnings that may have been placed.
    jQuery('#login-input-ctn > .line-warning').remove();

    try {
      passkey = DCube.validatePasskey(passkey);
    } catch(ex) {
      if (ex.name === "DCubePasskeyValidationError") {
        switch (ex.message) {
        case "too short":
          jQuery('#passkey-input-ctn')
            .append('<span class="line-warning">Your username must '+
                    'contain at least 1 charactar.</span>');
          break;
        case "too long":
          jQuery('#passkey-input-ctn')
            .append('<span class="line-warning">Your username must not '+
                    'contain more than 140 characters.</span>');
          break;
        }
        jQuery('#passkey').focus().select();
        return false;
      }
      log.error("Unexpected error from DCube.validatePasskey(): "+ ex);
    }
    return true;
  }

  function start_app(username, view) {
    log.debug("start_app()");

    if (view) {
      jMonad.broadcast("view", view);
    } else {
      DCube('#VIEW:'+ username)
        .get("memcache")
        .then(
            function get_view_fulfilled(result) {
              jMonad.broadcast("view", result);
            },
            function get_view_exception(ex) {
              log.error(ex);
              jMonad.broadcast("view", null);
            });
    }

    jMonad.observeOnce("view",
        function observe_view(v) {
          var p;
          log.debug("Observed 'view'.");

          if (view && typeof view === "object") {
            for (p in view) {
              if(Object.prototype.hasOwnProperty.call(view, p) &&
                  widgets[p] &&
                  typeof widgets[p].update === "function") {
                widgets[p].update(view[p]);
              }
            }
          }

          jMonad(this).deck("app");
        });
  }

  self.log = (function logging() {
    NOT_IMP();
    return function log() {
        NOT_IMP();
      };
   }());

  self.db = (function () {
    var dbs = ["crown_construction", "crown_construction_sandbox"],
        current = dbs[0];

    return function (toggle) {
        if (toggle) {
          current = dbs[1];
          return current;
        }
        if (typeof toggle !== "undefined") {
          current = dbs[0];
          return current;
        }
        return current;
      };
  }());

  self.appName = function app_name() {
    return "Crown_Construction_ERM";
  };

  // Event handler for a DOM level 1 login event.
  self.onChooseUser = function app_onChoooseUser(username) {
    // User chose to login with a username not listed.
    if (!username) {
      jMonad("main").deck("login", "username");
      return true;
    }

    if (DCube.connection(self.db(), username)) {
      start_app(username);
    }
    else {
      this_username = username;
      jMonad("main").deck("login", "passkey");
    }

    return true;
  };

  // Event handler for a DOM level 1 login event.
  self.onEnterUsername = function app_onEnterUsername(username) {
    log.debug("Enter username.");

    if (!validate_username(username)) {
      return true;
    }

    log.debug("ONCE: Username entered.");
    this_username = username;

    // Remove any previous warnings that may have been placed.
    jQuery('#login-input-ctn > .line-warning').remove();
    // Show the the passkey input field.
    jQuery("#passkey").show().focus();

    DCube.pingUser({username: username})
      .then(
          function dcube_ping_fulfilled() {
            jMonad.broadcast("user-status", "exists");
          },
          function dcube_ping_exception(ex) {
            if (ex === "user not found") {
              jMonad.broadcast("user-status", "not found");
              return;
            }
            else if (ex !== "offline") {
              log.warn("Unexpected exception from DCube.pingUser(): '"+
                           ex +"'");
            }
            log.info("Broadcasting 'network-offline'.");
            jMonad.broadcast("network-offline");
          },
          function dcube_ping_progress() {
            NOT_IMP();
          });
    return true;
  };

  // Event handler for a DOM level 1 login event.
  self.onEnterPasskey = function app_onEnterPasskey(passkey) {
    log.debug("Enter passkey.");

    if (!validate_passkey(passkey)) {
      return true;
    }

    log.debug("ONCE: Passkey entered.");
    jMonad("main")
      .pass(function () {
            jQuery('#waiting-open').show();
          })
      .waitAnd("user-status", 700)
      .pass(function () {
            jQuery('#waiting-open').hide();
          })
      .observeOnce("user-status",
          function (user_status) {
            if (user_status === "exists") {
              DCube('#VIEW:'+ this_username)
                .connect(self.db(), this_username, passkey)
                .then(
                  function dcube_connect_fulfilled(results) {
                    start_app(this_username, results[0]);
                  },
                  function dcube_connect_exception(ex) {
                    log.error(ex);
                    NOT_IMP();
                  });
            }
            else if (user_status === "not found") {
              jQuery('#username-input-ctn')
                .append('<span class="line-warning">'+
                        'That username does not exist.'+
                        'Is there a typo?</span>');
              jQuery('#username').focus().select();
            }
          });
    return true;
  };

	/*
  DCube("#FIREWORKS:"+ self.appName())
    .get("memcache")
    .then(
      function got_app_cache(app_cache) {
        jMonad.broadcast("app-cache", app_cache);
      },
      function app_cache_error(ex) {
        log.warn("The application cache on DCube is not reachable.");
        jMonad.broadcast("app-cache");
      });
			*/

  return self;
}());

jQuery(function () {

  // The application cache was retrieved.
		/*
  jMonad.observeOnce("app-cache", function (app_cache) {
      if (app_cache && app_cache.users && app_cache.users.length) {
        jMonad("main")
          .deck("login", "users", app_cache.users);
      }
      else {
        jMonad("main")
          .deck("login", "username");
      }
    });

  APP.log().debug("TODO: Implement offline handler.");
  jMonad.observe("network-offline", function handle_offline() {
      NOT_IMP();
    });
		*/

	jQuery('#tabs').tabs();
});

