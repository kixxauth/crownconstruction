var DCUBE = (function () {
  var app = {},
      DDD = require("dcube"),
      output, debug_chk;

  DDD.setDomain("fireworks-skylight.appspot.com");

  function on_debug_chk(ev) {
    ddd.debug(debug_chk.checked);
  }

  function on_window_load(ev) {
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

  app.create_user = function create_user() {
    print_line("create user");
    //var username = document.getElementById("new-username").value;
  };

  return app;
}());
