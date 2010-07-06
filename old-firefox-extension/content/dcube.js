///

function require(id) {
  var m = Components.utils.import(
      "resource://chrometest/resources/"+ id +".js", null);
  return ((typeof m.exports === "object") ? m.exports : m);
}

var DCUBE = (function () {
	var app = {},
    DDD = require("dcube"),
		output, debug_chk,
		domain = "fireworks-skylight.appspot.com";

	function on_debug_chk(ev) {
		var chk = debug_chk.checked;
		DDD.debug(chk);
		print_line(
			chk ? "Turned on debugging mode." : "Turned off debugging mode.");
	}

	function on_window_load(ev) {
		document.getElementById("domain").value = domain;
		output = document.getElementById("output");
		debug_chk = document.getElementById("debug-mode");
		debug_chk.addEventListener("click", on_debug_chk, false);
		DDD.domain(domain);
		on_debug_chk();
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
		DDD.domain(d);
		print_line("Set domain to "+ d);
	};

	app.check_user = function check_user(id) {
		var v = document.getElementById(id).value;

		dump("\n # Checking user..\n");
		print_line("Checking user...");

		try {
			DDD.checkUser(v)(
			function (x) {
				print_line("User "+ v + (x ? " exists." : " does NOT exist."));
			},
			function (ex) {
				print_line(ex.toString());
			});
		} catch(e) {
			print_line(e.toString());
		}
	}

	app.create_user = function create_user(id) {
		dump("\n # Creating user..\n");
		print_line("Creating user...");

		DDD.createUser(document.getElementById(id).value)(
		function (user) {
			print_line("Created user "+ user.username);
		},
		function (ex) {
			print_line(ex.toString());
		});
	};

	app.get_user = function get_user(unid, pkid) {
		dump("\n # Getting user..\n");
		print_line("Getting user...");

		DDD.getUser(
				document.getElementById(unid).value,
				document.getElementById(pkid).value)(
		function (user) {
			print_line(JSON.stringify(user));
		},
		function (ex) {
			print_line(ex.toString());
		});
	};

	return app;
}());

