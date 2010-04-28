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
_: false
*/

"use strict";

// Module
var SIGS = (function (undef) {

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

var APP = (function (window) {

	// Ghetto require function.
	function require(id) {
		var m = Components.utils.import(
				"resource://crownconstruction/modules/"+ id +".js", null);
		return ((typeof m.exports === "object") ? m.exports : m);
	}

	var app = {},
		LOG,
		JQ,
		DCUBE = require('dcube'),
		MODELS,
		WIDGETS = {},
		VIEW;

	// Handy utility.
	function isin(x, y) {
		return Object.prototype.hasOwnProperty.call(x, y);
	}

	// Make a uid generator.
	function uid_generator(prefix, hash) {
		if (typeof prefix === 'function') {
			hash = prefix;
			prefix = '';
		}
		prefix = (typeof prefix === 'string') ? prefix : '';

		var counter = 0,
			time_string = new Date().getTime();

		return  ((typeof hash === 'function') ? 
			function () {
				return hash(prefix + (counter += 1) + time_string);
			} :
			function () {
				return prefix + (counter += 1) + time_string;
			});
	}

	LOG = (function () {
		var d = new Date();
		return require("logging")
			.getLogger("CC_ERM_"+
				(d.getMonth() +1) +"-"+
				d.getDate() +"-"+
				d.getHours() +":"+
				d.getMinutes() +":"+
				d.getSeconds());
	}());

	// Templating.
	function template(id, data) {
		return _.template(document.getElementById(id).innerHTML, data);
	}

	/////////////////////////////////////////////////////////////////////////////
	// DCube Models
	// ------------
	MODELS = (function () {
		var models = {};

		function index_last_name(val) {
			return ['last_name', val];
		}

		models.customer = function (db) {
			return {
				names: db.list(
					db.dict({
						first: db.str(),
						last: db.str({index: index_last_name})
					})
				),
				addresses: db.list(
					db.dict({
						street: db.str(),
						city: db.str(),
						state: db.str(),
						zip: db.str()
					})
				),
				phones: db.list(
					db.dict({
						phone: db.str(),
						label: db.str()
					})
				),
				emails: db.list(
					db.dict({
						email: db.str(),
						label: db.str()
					})
				)
			};
		};

		return models;
	}());

	/////////////////////////////////////////////////////////////////////////////
	// BBQ Widgets
	// -----------
	WIDGETS.customers_tab_widget = function (db, construct_view) {
		var self = {id: "tab-customers"},
			actions;

		actions = {

			'find': function () {
				alert('find');
			},

			'new': function () {
				var customer = db.create('customer'),
					view = construct_view(customer('key'), customer('entity')),
					dict = view.dict, view = view.view;

				//dump('#new\n');
				//dump(' entity -> '+ JSON.stringify(customer('entity')) +'\n\n');

				//var view = construct_view(customer('key'), customer('entity'));
				//dump(' view -> '+ JSON.stringify(view) +'\n\n');

				JQ('#customer_form')
					.html(
							template('customer-names_template', view) +
							template('customer-addresses_template', view) +
							template('customer-phones_template', view) +
							template('customer-emails_template', view));
			}
		};

		self.update = function (hash, params) {
			actions[hash](params);
		};

		return self;
	};

	/////////////////////////////////////////////////////////////////////////////
	// VIEW Module
	// -----------
	function view_module(widget_constructors, log) {
		var mod = {},
			mod_widgets,
			jq,
			bbq;

		function widgets_module_constructor(deparam) {
			var self = {}, widgets = {};

			function widget_constructor(widget) {
				var overridden_update = widget.update,
					current_state_string;

				widget.update = function (new_state_string) {
					if (new_state_string === current_state_string) {
						return;
					}
					current_state_string = new_state_string;

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

		function construct_view(key_str, data) {
			var rv = {dict: {}, view: {}};

			function mapper(x, dict, result, parts) {
				var p;
				for (p in x) {
					if (isin(x, p)) {

						parts[p] = parts.slice();
						parts[p].push(p);

						if (isNaN(+p)) {
							result[p] = [];
						}
						else {
							result[p] = {};
						}

						if (typeof x[p] === 'object') {
							arguments.callee(x[p], dict, result[p], parts[p]);
						}
						else {
							result[p] = {};
							result[p].path = parts[p].join('.');
							result[p].value = x[p];

							parts[p].pop();
							dict[parts[p].join('.')] = x;
						}
					}
				}
			}

			mapper(data, rv.dict, rv.view, [key_str]);
			return rv;
		}

		mod.DOM_ready = function(jquery) {
			jq = jquery; bbq = jq.bbq;
			
			// For all links inside a .bbq widget, push the appropriate state onto the
			// history when clicked.
			jq('.bbq a[href^=#]').live('click', function(e){
				var state = {},
					
					// Get the id of this .bbq widget.
					id = jq(this).closest('.bbq').attr('id'),
					
					// Get the url from the link's href attribute, stripping any leading #.
					url = jq(this).attr('href').replace(/^#/, '');

				// Make sure there is a widget object with this id.
				if (!mod_widgets.hasWidget(id)) {
					log.warn('No widget with id "'+ id +'".');
				}
				
				// Set the state.
				state[id] = url;
				bbq.pushState(state);
				
				// And finally, prevent the default link click behavior by returning false.
				return false;
			});

			jq(window).bind('hashchange', function(e) {
				mod_widgets.each(function (widget) {
					widget.update(e.getState(widget.id) || '');
				});
			});
		};

		mod.db = function (db) {
			mod_widgets = (function () {
				var w,

					self = widgets_module_constructor(function (params) {
						return jq.deparam.querystring(params, true);
					});

				for (w in widget_constructors) {
					if (isin(widget_constructors, w)) {
						self.widget(widget_constructors[w](db, construct_view));
					}
				}
				return self;
			}());
		};

		return mod;
	}
	VIEW = view_module(WIDGETS, LOG);

	XXX = (function (data) {
		var mod = {},
			jq,
			bbq,
			views = {},
			html_class = 'bbqpork',
			reflow_selector = ('.'+ html_class),
			mod_widgets,
			construct_view;

		construct_view = (function () {

			function construct(kind, id) {
				var view,
					callbacks = {},
					model = data(kind, id);

				id = model.key();
				view = model.value();

				view.register = function (path, fn) {
					callbacks[path] = callbacks[path] || {};
					callbacks[path][fn] = fn;
				};

				view.update = function (path, value) {
					dump(path +":"+ value +"\n");
					return true;
				};

				dump("construct:"+ id +"\n");
				views[id] = view;
				return view;
			}

			return function (kind, id) {
				if (!id) {
					construct(kind);
				}
				else if (!isin(views, id)) {
					construct(kind, id);
				}
				return views[id];
			};
		}());

		function when_reflow() {
			var elements = {},

				uid = uid_generator(),

				registers = {
					INPUT: function (element) {
						var parts = element.name.split(':'),
							key = parts[0], path = parts[1],
							view = views[key],
							update = view.update,
							el = jq(element), update_val = el.val,

							view_register = function (value) {
								update_val(value);
							};

						el.keyup(function (ev) {
							var me = jq(this), maybe_ok, maybe_invalid;
							maybe_invalid = maybe_ok = update(path, me.val());
							if (maybe_ok !== true) {
								me.addClass('invalid_input');
								// Do something with maybe_invalid message.
							}
						});

						view.register(path, view_register);

						return function () {
							view.ignore(view_register);
						};
					}
				};

			jq(reflow_selector).each(function (idx) {
				dump(this.tagName +":"+ this.id +":"+ this.name +'\n');
				//registers[this.tagName](this);
				var id = this.id;
				if(!id || !isin(elements, id)) {
					id = uid();
					elements[id] = registers[this.tagName](this);
					this.id = id;
				}
			});
		}
	}());

	// Fire it up.
	jQuery(function (jquery) {
		JQ = jquery;
		VIEW.DOM_ready(jquery);
		JQ('#tabs').tabs();
	});

	// TODO: Temporary -- testing.
	function init_db(username, passkey) {
		var m;
		DCUBE
			.debug(true)
			.domain('fireworks-skylight.appspot.com');

		for (m in MODELS) {
			if (isin(MODELS, m)) {
				DCUBE.db.model(m, MODELS[m]);
			}
		}
		DCUBE.db('crown_construction_sandbox', username, passkey)(
			function (x) {
				VIEW.db(x);
				alert('db ready');
			},
			function (x) {
				LOG.error(x);
				alert('db connection error: '+ x);
			});
	}

	// TODO: Temporary -- testing.
	app.start = function () {
		// TODO:
		init_db(JQ('#username').val(), JQ('#passkey').val());
	}

	return app;

}(window));

