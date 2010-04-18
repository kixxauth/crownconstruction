/*
Licensed under The MIT License
==============================

Copyright (c) 2009 - 2010 Fireworks Technology Projects Inc.
[www.fireworksproject.com](http://www.fireworksproject.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */


/*jslint
onevar: true,
undef: true,
nomen: true,
eqeqeq: true,
plusplus: true,
bitwise: true,
strict: true,
immed: true */

/*global
Components: false,
window: false,
jQuery: false,
jMonad: false
*/

"use strict";

(function (window, undef) {

// Ghetto require function.
function require(id) {
  var m = Components.utils.import(
      "resource://crownconstruction/modules/"+ id +".js", null);
  return ((typeof m.exports === "object") ? m.exports : m);
}

var LOG,
	LOGGING = require("logging"),
	CACHE = require("cache"),
	DCube = require("dcube"),
	DECK,
	SIGS,
	WIDGETS,
	jQ,
	BBQ,
	jMon = jMonad();

function isin(x, y) {
	return Object.prototype.hasOwnProperty.call(x, y);
}

LOG = (function () {
	var d = new Date();
	return LOGGING.getLogger("CC_ERM_"+
		(d.getMonth() +1) +"-"+
		d.getDate() +"-"+
		d.getHours() +":"+
		d.getMinutes() +":"+
		d.getSeconds());
}());

DCube.logger(LOG);

// Function
DECK = (function () {
}());

// Module
SIGS = (function () {

	var signals = (function () {
		var sigs = {};

		function construct_signal(name) {
			var observers = {};

			return {
				observe: function signal_observe(f) {
					observers[f] = f;
					if (this.value) {
						f.apply(null, this.value);
					}
				},

				ignore: function signal_ignore(f) {
					delete observers[f];
				},

				broadcast: function signal_broadcast(data) {
					var ob;
					this.value = data;

					for (ob in observers) {
						if (Object.prototype.hasOwnProperty.call(observers, ob)) {
							observers[ob].apply(null, this.value);
						}
					}
				}
			};
		}

		return function (name) {
			return sigs[name] || (sigs[name] = construct_signal(name));
		};
	}());

	function broadcast(signal) {
		signals(signal).broadcast(Array.prototype.slice.call(arguments, 1));
		return this;
	}

	function check(signal) {
		return signals(signal).value;
	}

	function observe() {
		var callbacks = [], sigs = [], i = 0, n = 0;

		for(; i < arguments.length; i += 1) {
			if (typeof arguments[i] === "function") {
				callbacks.push(arguments[i]);
			}
			else {
				sigs.push(arguments[i]);
			}
		}

		for (i = 0; i < callbacks.length; i += 1) {
			for (; n < sigs.length; n += 1) {
				signals(sigs[n]).observe(callbacks[i]);
			}
		}

		return this;
	}

	function observe_once(signal, callback) {
		signal = signals(signal);
		if (typeof callback !== "function") {
			throw new Error(
					"The callback argument passed to .observeOnce() by '"+
					(arguments.callee.caller.name || "anonymous")+
					"()' is not a function.");
		}

		signal.observe(function () {
				signal.ignore(arguments.callee);
				callback.apply(this, Array.prototype.slice.call(arguments));
			});

		return this;
	}

	function ignore(signal, callback) {
		signals(signal).ignore(callback);
		return this;
	}

	function wait(continuation /* signal names and callbacks */) {
		var callbacks = [], i = 0,
				observers = [],
				timer,
				args = Array.prototype.slice.call(arguments, 1);

		function handler() {
			var i = 0;
			// Remove all listeners.
			if (typeof timer === "number") {
				window.clearTimeout(timer);
				timer = null;
			}

			for (; i < observers.length; i += 1) {
				signals(observers[i]).ignore(handler);
			}

			for (i = 0; i < callbacks.length; i += 1) {
				callbacks[i]();
			}
			// The continuation is invoked AFTER all of the callbacks.
			continuation();
		}

		for (; i < args.length; i += 1) {
			if (typeof args[i] === "function") {
				// If this argument is a function, it is meant to be a callback.
				callbacks.push(args[i]);
			}
			else if (typeof args[i] === "number" && timer === undef) {
				// If this argument is a number, it is meant to set a timer.
				// The `+` is used to convert possible strings to ints.
				timer = window.setTimeout(handler, +args[i]);
			}
			else {
				// If this argument is anything but a function or a number,
				// it is meant to be a signal identifier.
				observers.push(args[i]);
				signals(args[i]).observe(handler);
			}
		}
		return this;
	}

	function wait_and(continuation /* signal names and callbacks */) {
		var observed = {}, observers = [], i = 0,
				callbacks = [],
				timer, timeout,
				args = Array.prototype.slice.call(arguments, 1);

		function make_handler(signal) {
			return function (/* signal data */) {
					var ok = true, s, i = 0;

					observed[signal] = true;
					if (signal !== timeout) {
						signals(signal).ignore(arguments.callee);
					}

					// Check to see if all the registered observers have been set.
					for (s in observed) {
						if (Object.prototype.hasOwnProperty.call(observed, s) &&
								!observed[s]) {
							ok = false;
							break;
						}
					}

					if (ok) {
						for(; i < callbacks.length; i += 1) {
							callbacks[i]();
						}
						// The continuation is invoked AFTER all of the callbacks.
						continuation();
					}
				};
		}

		for (; i < args.length; i += 1) {
			if (typeof args[i] === "function") {
				// If this argument is a function, it is meant to be a callback.
				callbacks.push(args[i]);
			}
			else if (typeof args[i] === "number" && timer === undef) {
				// If this argument is a number, it is meant to set a timer.
				// The `+` is used to convert possible strings to ints.
				observed[args[i]] = false;
				timeout = args[i];
				timer = window.setTimeout(make_handler(args[i]), +args[i]);
			}
			else {
				// If this argument is anything but a function or a number,
				// it is meant to be a signal identifier.
				observers.push([args[i], make_handler(args[i])]);
				observed[args[i]] = false;
			}
		}
		for (i = 0; i < observers.length; i += 1) {
			signals(observers[i][0]).observe(observers[i][1]);
		}
		return this;
	}

	return {
		// The first parameter is the signal name and the rest of the parameters
		// are passed to the observers.
		// Returns the signals module for chaining.
		broadcast: broadcast,

		// Given a signal name, returns the last known set of params.
		check: check,

		// Pass any number of signal identifiers and callback functions. Any
		// function passed will be interpreted as a callback function.  Each
		// callback will be called whenever any of the named signals is fired.  If
		// the signal has already been fired, the observer function will be called
		// immediately.
		observe: observe,

		// Pass 1 signal name and 1 callback. When the signal is fired, or if it
		// has already been fired, the callback will be invoked and then the signal
		// will be ignored.
		observe_once: observe_once,

		// First param is a signal name and the second is the observer function to
		// remove.
		ignore: ignore,

		// The first parameter is a continuation callback function. The rest of tha
		// params may be a combination of signal names and observer callback
		// functions.  As soon as one of the signals fires, or has already been
		// fired, all the callbacks are invoked with the signal parameters. The
		// continuation is called last without any arguments passed.
		wait: wait,


		// The first parameter is a continuation callback function. The rest of the
		// params may be a combination of signal names and observer callback
		// functions.  As soon as all of the signals has fired, or have already
		// been fired, all the callbacks are invoked with the signal parameters.
		// The continuation is called last without any arguments passed.
		wait_and: wait_and
	};

}());

// Module
function mod_widgets(deparam) {
	var self = {}, widgets = {};

	function widget_constructor(widget) {
		var overridden_update = widget.update,
			current_state_string;

		widget.update = function (new_state_string) {
			if (new_state_string === current_state_string) {
				return;
			}
			var parts = new_state_string.split('?'),
				hash = parts[0],
				params = deparam(parts[1]);

			overridden_update(hash, params);
		};

		widgets[widget.id] = widget;
		return widget;
	}

	function has_widget(id) {
		return isin(widgets, id);
	}

	function each(fn) {
		var id;
		for (id in widgets) {
			if(isin(widgets, id)) {
				fn(widgets[id]);
			}
		}
	}

	self.hasWidget = has_widget;
	self.widget = widget_constructor;
	self.each = each;
	return self;
}

WIDGETS = mod_widgets(function (params) {
	return jQ.deparam.querystring(params, true);
});

function customers_tab_widget() {
	var self = {id: "tab-customers"};

	self.update = function (hash, params) {
		dump("hash: "+ hash);
		dump(" params: "+ JSON.stringify(params) +"\n");
	};

	return self;
}

function make_widgets() {
	WIDGETS.widget(customers_tab_widget());
}

function init() {
	LOG.info("init()");
	make_widgets();

	jQ('#tabs').tabs();
  
  // For all links inside a .bbq widget, push the appropriate state onto the
  // history when clicked.
  jQ('.bbq a[href^=#]').live('click', function(e){
    var state = {},
      
      // Get the id of this .bbq widget.
      id = jQ(this).closest('.bbq').attr('id'),
      
      // Get the url from the link's href attribute, stripping any leading #.
      url = jQ(this).attr('href').replace(/^#/, '');

		// Make sure there is a widget object with this id.
		if (!WIDGETS.hasWidget(id)) {
			LOG.warn('No widget with id "'+ id +'".');
		}
    
    // Set the state.
    state[id] = url;
    BBQ.pushState(state);
    
    // And finally, prevent the default link click behavior by returning false.
    return false;
  });

	jQ(window).bind('hashchange', function(e) {
		WIDGETS.each(function (widget) {
			widget.update(e.getState(widget.id) || '');
		});
	});
}

jQuery(function (x) {
	jQ = x;
	BBQ = jQ.bbq;
	SIGS.broadcast("DOM_ready");
});

SIGS.wait_and(init, "DOM_ready", 700);

}(window));

