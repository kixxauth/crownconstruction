var DCUBE = (function () {
  var app = {},
      DDD = require("dcube"),
      output,
      domain = "fireworks-skylight.appspot.com";

  DDD.setDomain(domain);

  function on_debug_chk(ev) {
    var chk = ev.target.checked;
    DDD.debug(chk);
    print_line(
      chk ? "Turned on debugging mode." : "Turned off debugging mode.");
  }

  function on_window_load(ev) {
    document.getElementById("domain").value = domain;
    output = document.getElementById("output");
    debug_chk = document.getElementById("debug-mode");
    debug_chk.addEventListener("click", on_debug_chk, false);
    window.removeEventListener("load", on_window_load, false);
  }

  function on_window_close(ev) {
    debug_chk.removeEventListener("click", on_debug_chk, false);
    window.removeEventListener("close", on_window_close, false);
  }

  window.addEventListener("load", on_window_load, false);
  window.addEventListener("close", on_window_close, false);

  function print_line(txt) {
    var p = document.createElement("p");
    p.appendChild(document.createTextNode(txt));
    output.appendChild(p);
  }

  app.set_domain = function set_domain(id) {
    var d = document.getElementById(id).value;
    DDD.setDomain(d);
    print_line("Set domain to "+ d);
  };

  app.create_user = function create_user(id) {
    var username = document.getElementById(id).value;
    try {

      DDD.createUser(username).then(

          function fulfilled(un) {
            print_line("User '"+ un +"' has been created.");
          },

          function exception(ex) {
            print_line(ex.toString());
          });

    } catch (e) {
      print_line(e.toString());
    }
  };

  app.put_db = function get_or_create_db(id) {
    var dbname = document.getElementById(id).value,
        username = document.getElementById("getdb_username").value,
        passkey = document.getElementById("getdb_passkey").value,
        owner_acl = document.getElementById("owner_acl"),
        manager_acl = document.getElementById("manager_acl"),
        user_acl = document.getElementById("user_acl"),
        db = {};

    if (manager_acl.value) {
      db.manager_acl = manager_acl.value.split(",");
    }
    if (user_acl.value) {
      db.user_acl = user_acl.value.split(",");
    }
    if (owner_acl.value) {
      db.owner_acl = owner_acl.value.split(",");
    }

    try {

      DDD.putDatabase(dbname, db, username, passkey).then(
          function fulfilled(rv) {
            if (rv.manager_acl) {
              manager_acl.value = rv.manager_acl.join(",");
            }
            if (rv.user_acl) {
              user_acl.value = rv.user_acl.join(",");
            }
            if (rv.owner_acl) {
              owner_acl.value = rv.owner_acl.join(",");
            }
          },

          function exception(ex) {
            print_line(ex.toString());
          });

    } catch (e) {
      print_line(e.toString());
    }
  };

  return app;
}());
