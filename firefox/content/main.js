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
document: false,
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
		// functions.  As soon as all of the signals have fired, or have already
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
		DECK,
		CACHE = require('cache'),
		CONF = require('configs'),
		DB,
		MODELS,
		WIDGETS = {},
		VIEW,
		customer_index,
		job_index,
		login;

	// Handy utility.
	function isin(x, y) {
		return Object.prototype.hasOwnProperty.call(x, y);
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

	// JUI Progress Bar
	function timed_progress_bar(id, time, cb) {
		var pb = JQ('#'+ id),
			start = new Date().getTime(),
			done = start + time;

		pb.progressbar({value: 0});

		function loopy() {
			window.setTimeout(function () {
				var now = new Date().getTime(); 
				if (now < done) {
					pb.progressbar('value', (100 - Math.floor(((done - now) / time) * 100)));
					loopy();
				}
				else {
					pb.hide();
					cb();
				}
			}, 0);
		}
		loopy();
	}

	DECK = (function () {
		var mod = {}, current_deck;

		mod.swap = function (i) {
			if (i === current_deck) {
				return;
			}
			JQ('#deck-'+ current_deck).hide();
			JQ('#deck-'+ i).show();
			current_deck = i;
		};

		return mod;
	}());

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

		models.job = function (db) {
			return {
				customer: db.str(),
				id: db.str(),
				startdate: db.str(),
				completedate: db.str()
			};
		};

		return models;
	}());

	function customer_index_builder(db) {

		function make_tables(data, tables) {
			var i = 0, len = data.length,
					key;

			tables = tables || {};

			for (; i < len; i +=1) {
				key = data[i]('key');
				tables[key] = {lastname: data[i]('entity').names[0].last, key: key};
			}
			return tables;
		}

		CACHE.atomic('customer_index')(function (txn) {

			function cb(results) {
				txn('set', make_tables(results));
				txn('commit');
			}

			function eb(x) {
				LOG.error(x);
				txn('commit');
				// TODO: Better error handling.
				alert('Error getting customer index:\n'+ x);
			}

			if (!txn('get')) {

				db.query()
					.kind('customer')
					.append(cb)
					.go(eb);
			}
			else {
				txn('commit');
			}
		});

		return function (cb, customer_entity) {
			CACHE.atomic('customer_index')(function (txn) {
				var tables = txn('get');
				if (customer_entity) {
					tables = make_tables([customer_entity], tables);
					txn('set', tables);
				}
				txn('commit');
				cb(tables);
			});
		};
	}

	function job_index_builder(db) {

		function make_tables(data, tables) {
			var i = 0, len = data.length,
					key;

			tables = tables || {};

			for (; i < len; i +=1) {
				key = data[i]('key');
				tables[key] = {key: key, id: data[i]('entity').id};
			}
			return tables;
		}

		CACHE.atomic('job_index')(function (txn) {

			function cb(results) {
				txn('set', make_tables(results));
				txn('commit');
			}

			function eb(x) {
				LOG.error(x);
				txn('commit');
				// TODO: Better error handling.
				alert('Error getting job index:\n'+ x);
			}

			if (!txn('get')) {

				db.query()
					.kind('job')
					.append(cb)
					.go(eb);
			}
			else {
				txn('commit');
			}
		});

		return function (cb, job_entity) {
			CACHE.atomic('job_index')(function (txn) {
				var tables = txn('get');
				if (job_entity) {
					tables = make_tables([job_entity], tables);
					txn('set', tables);
				}
				txn('commit');
				cb(tables);
			});
		};
	}

	/////////////////////////////////////////////////////////////////////////////
	// BBQ Widgets
	// -----------
	WIDGETS.customers_tab_widget = function (db, construct_view) {
		var self = {id: "tab-customers"},
			actions,
			show_customer;

		customer_index = customer_index_builder(db);

		show_customer = (function () {
			var unbind_commit = function () {};

			return function (entity, focus) {
				var bound = false, 
					data = entity('entity'),
					data_view = construct_view(entity('key'), data),
					dict = data_view.dict, view = data_view.view,
					form = JQ('#customer_form')
						.html('<div class="left-col"></div><div class="right-col"></div>');

				JQ('.left-col', form)
					.html(
						template('customer_names-template', view) +
						template('customer_addresses-template', view));
				JQ('.right-col', form)
					.html(
						template('customer_phones-template', view) +
						template('customer_emails-template', view));
				//dump('\nview ->\n'+ JSON.stringify(view) +'\n');

				window.setTimeout(function () {
					switch (focus) {
					case 'names':
						JQ("input[name='"+
							view.names[view.names.length -1].last.path +
							"']").focus();
						break;
					case 'addresses':
						JQ("input[name='"+
							view.addresses[view.addresses.length -1].street.path +
							"']").focus();
						break;
					case 'phones':
						JQ("input[name='"+
							view.phones[view.phones.length -1].phone.path +
							"']").focus();
						break;
					case 'emails':
						JQ("input[name='"+
							view.emails[view.emails.length -1].email.path +
							"']").focus();
						break;
					default:
						JQ("input[name='"+ view.names[0].last.path +"']").focus();
					}
				}, 0);

				function global_commit() {
					entity('update', data);
					unbind_commit();
					db.put(entity, function (x) {
						entity = x;
						customer_index(function (tables) {
							// TODO: Save notifications.
							// There could possibly be more than 1 save event,
							// even on the same entity.
							alert('saved');
						}, entity);
					});
				}

				unbind_commit();
				function bind() {
					JQ(window).bind('global_commit', global_commit);
					unbind_commit = function () {
						JQ(window).unbind('global_commit', global_commit);
						bound = false;
					};
					bound = true;
				}

				//dump('\n'+ JSON.stringify(dict) +'\n');
				function validator_for(path) {
					var data_path = path.split('.'),
						field = data_path.pop();
					data_path = data_path.join('.');

					return function (ev) {
						if (!bound) {
							bind();
						}
						dict[data_path][field] = this.value;
					};

					/*
					if (/.names.[0-9]+.last/.test(path)) {
						return function (ev) {
						};
					}
					if (/.names.[0-9]+.first/.test(path)) {
					}
					if (/.addresses.[0-9]+.street/.test(path)) {
					}
					if (/.addresses.[0-9]+.city/.test(path)) {
					}
					if (/.addresses.[0-9]+.state/.test(path)) {
					}
					if (/.addresses.[0-9]+.zip/.test(path)) {
					}
					*/
				}

				JQ('.bbqpork', form).each(function (i, el) {
					//dump(this.name +'\n');
					JQ(el).bind('keyup', validator_for(el.name));
				});

				JQ('.bbqbeef', form).each(function (i, el) {
					JQ(el).click(function () {
						var name = JQ(this).attr('name');
						//dump('\n # data_type '+ JQ(this).attr('name') +'\n');
						data[name].push(null);
						entity('update', data);
						show_customer(entity, name);
					});
				});
			};
		}());

		actions = {

			'find': function () {
				customer_index(function (tables) {
					JQ('#customer_form')
						.html(
							template('customer_results-template', {customers: tables}));
				});
			},

			'show': function (params) {
				db.get(params.key, function (customer) {
					show_customer(customer);
				}).go(function (x) {
					LOG.error(x);
					LOG.warn('Could not show customer '+ params.key);
				});
			},

			'new': function () {
				show_customer(db.create('customer'));
			}
		};

		self.update = function (hash, params) {
			actions[hash](params);
		};

		return self;
	};

	WIDGETS.jobs_tab_widget = function (db, construct_view) {
		var self = {id: "tab-jobs"},
			actions,
			show_job;

		job_index = job_index_builder(db);

		show_job = (function () {
			var unbind_commit = function () {};

			return function (job) {
			 var job_data = job('entity');
						
				db.get(job_data.customer, function (customer) {
					var bound = false,

						customer_data = customer('entity'),

						job_data_view = construct_view(
							job('key'), job_data),

						customer_data_view = construct_view(
							customer('key'), customer_data),

						job_dict = job_data_view.dict,
						job_view = job_data_view.view,
						customer_dict = customer_data_view.dict,
						customer_view = customer_data_view.view,

						form = JQ('#job_form')
							.html(
									template('job_header-template', job_view) +
									template('customer_names-template', customer_view) +
									template('customer_addresses-template', customer_view) +
									template('customer_phones-template', customer_view) +
									template('customer_emails-template', customer_view));

					//dump('\nview ->\n'+ JSON.stringify(view) +'\n');

					function global_commit() {
						job('update', job_data);
						customer('update', customer_data);
						unbind_commit();
						db.put(customer, function (x) {
							customer = x;
							customer_index(function (tables) {
								// TODO: Save notifications.
								// There could possibly be more than 1 save event,
								// even on the same entity.
								alert('saved customer');
							}, customer);
						});
						db.put(job, function (x) {
							job = x;
							job_index(function (tables) {
								// TODO: Save notifications.
								// There could possibly be more than 1 save event,
								// even on the same entity.
								alert('saved customer');
							}, job);
						});
					}

					unbind_commit();
					function bind() {
						JQ(window).bind('global_commit', global_commit);
						unbind_commit = function () {
							JQ(window).unbind('global_commit', global_commit);
							bound = false;
						};
						bound = true;
					}

					//dump('\n'+ JSON.stringify(dict) +'\n');
					function validator_for(path) {
						var data_path = path.split('.'),
							field = data_path.pop(),
							key = data_path[0],
							dict;

						data_path = data_path.join('.');
						dict = key === job('key') ? job_dict : customer_dict;

						return function (ev) {
							if (!bound) {
								bind();
							}
							dict[data_path][field] = this.value;
						};

						/*
						if (/.names.[0-9]+.last/.test(path)) {
							return function (ev) {
							};
						}
						if (/.names.[0-9]+.first/.test(path)) {
						}
						if (/.addresses.[0-9]+.street/.test(path)) {
						}
						if (/.addresses.[0-9]+.city/.test(path)) {
						}
						if (/.addresses.[0-9]+.state/.test(path)) {
						}
						if (/.addresses.[0-9]+.zip/.test(path)) {
						}
						*/
					}

					

					JQ('.bbqpork', form).each(function (i, el) {
						//dump(this.name +'\n');
						JQ(el).bind('keyup', validator_for(el.name));
					});

					JQ('.bbqbeef', form).each(function (i, el) {
						JQ(el).click(function () {
							//dump('\n # data_type '+ JQ(this).attr('name') +'\n');
							var parts = JQ(this).attr('name').split('.'),
								kind = parts[0], property = parts[1];

							if (kind === 'job') {
								job_data[property].push(null);
								job('update', job_data);
							}
							else if (kind === 'customer') {
								customer_data[property].push(null);
								customer('update', customer_data);
							}
							show_job(job);
						});
					});
				})
				.go(function (x) {
					// TODO: Better error handling.
					LOG.error(x);
					LOG.warn('Could not get customer '+ job_data.customer);
				});
			};
		}());

		actions = {

			'find': function () {
				job_index(function (tables) {
					JQ('#job_form')
						.html(
							template('job_results-template', {jobs: tables}));
				});
			},

			'show': function (params) {
				db.get(params.key, function (job) {
					show_job(job);
				}).go(function (x) {
					// TODO: Better error handling.
					LOG.error(x);
					LOG.warn('Could not show job '+ params.key);
				});
			},

			'new': function (params) {
				var job;

				if (params.key) {
					job = db.create('job');
					job('update', {customer: params.key});
					show_job(job);
				}
				else {
					customer_index(function (tables) {
						JQ('#job_form')
							.html(
								template('new_job_customer_results-template', {customers: tables}));
					});
				}
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
					if (!new_state_string ||
						new_state_string === current_state_string) {
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

				jq(window).bind('make_commit', function (ev) {
					db.go(function (x) {
						LOG.err(x);
						// TODO: proper error handling.
						alert('commit error:\n'+ x);
					});
				});
				
				return self;
			}());
		};

		return mod;
	}
	VIEW = view_module(WIDGETS, LOG);

	DB = (function () {
		var mod = {}, 
			dcube = require('dcube');

		mod.init = function (domain, models, debug) {
			var m;

			dcube
				.debug(debug)
				.domain(domain);

			for (m in models) {
				if (isin(models, m)) {
					dcube.db.model(m, models[m]);
				}
			}
		};

		mod.connect = function (db, username, passkey, cb, eb) {
			dcube.db(db, username, passkey)(cb, eb);
		};

		mod.validate_passkey = function (passkey) {
			return dcube.validatePasskey(passkey);
		};

		mod.validate_username = function (username) {
			return dcube.validateUsername(username);
		};

		return mod;
	}());

	function check_user_cache(cb) {
		CACHE.atomic('current_usrs')(function (txn) {
			var users = txn('get');
			txn('commit');
			cb(users || []);
		});
	}

	login = (function () {
		var mod = {},
			remove_spinner;

		// Tell the user we're working here.
		function busy_spinner(id) {
			var button = JQ('#login-button').hide();
			var spinner = JQ('#login_busy_spinner').show();
			return function () {
				spinner.hide();
				button.show();
			};
		}

		function dialog(id, title) {
			JQ('#'+ id)
				.dialog({
					modal: true,
					draggable: false,
					resizeable: false,
					width: 600,
					title: title,
					buttons: {
						'Quit': function() { 
							JQ(this).dialog('close');
							window.location.href =
								'chrome://crownconstruction/content/quit.html';
						}, 
						'Try Again': function() { 
							JQ(this).dialog('close');
							mod.show();
						}, 
						'Start Over': function() { 
							JQ(this).dialog('close');
							window.location.href =
								'chrome://crownconstruction/content/main.html';
						} 
					}
				});
		}

		function validate_username(un) {
			try {
				DB.validate_username(un);
			} catch (e) {
				switch (e.message) {
				case 'too short':
					JQ('#warn-username')
						.html('A username must have at least one character.')
						.show();
					break;
				case 'too long':
					JQ('#warn-username')
						.html('A username must not contain more than 70 characters.')
						.show();
					break;
				case 'invalid characters':
					JQ('#warn-username')
						.html('A username may only contain the '+
							'characters a-z, A-Z, 0-9, and _.')
						.show();
					break;
				default:
					LOG.warn('Unexpected username validation error '+ e.message);
				}
				return false;
			}
			return un;
		}

		function validate_passkey(pk) {
			try {
				DB.validate_passkey(pk);
			} catch (e) {
				switch (e.message) {
				case 'too short':
					JQ('#warn-passkey')
						.html('A passkey must have at least 4 characters.')
						.show();
					break;
				case 'too long':
					JQ('#warn-passkey')
						.html('A passkey must not contain more than 140 characters.')
						.show();
					break;
				default:
					LOG.warn('Unexpected passkey validation error '+ e.message);
				}
				return false;
			}
			return pk;
		}

		mod.authenticate = function (db_name, username, passkey) {
			var	remove_spinner = busy_spinner();

			DB.connect(db_name, username, passkey,
				function (db) {
					VIEW.db(db);
					CACHE.atomic('current_usrs')(function (txn) {
						var users = txn('get') || [], notin = true, i = 0;

						for (; i < users.length; i += 1) {
							if (username === users[i].username &&
									db_name === users[i].dbname) {
								notin = false;
								break;
							}
						}

						if (notin) {
							users.push({username: username, dbname: db_name});
						}

						txn('set', users);
						txn('commit');
						remove_spinner();
						JQ('#tabs').tabs();
						JQ(window).trigger('hashchange');
						JQ('#init-decks').hide();
						JQ('#main').show();
					});
				},
				function (ex) {
					remove_spinner();

					if (ex.name === 'DCubeOffline') {
						dialog('login_offline-dialog', 'Internet Connection Problem');
						return;
					}

					switch (ex.name +': '+ ex.message) {
					case 'DCubeUserError: user does not exist':
						JQ('#warn-username')
							.html('This username does not exist on this system.')
							.show();
						mod.show();
						break;
					case 'DCubeUserError: database does not exist':
						dialog('login_null_db-dialog', 'Database Error');
						break;
					case 'DCubeUserError: invalid passkey':
						JQ('#warn-login')
							.html('The username or password is invalid. If you think '+
									'this might be an error, please contact a support person.')
							.show();
						mod.show();
						break;
					default:
						LOG.warn('Unexpected exception in main.js::login();'+ ex);
						dialog('login_unexpected-dialog', 'Unexpected Problem');
					}
				});
		};

		mod.show = function (focus) {
			var un_el = JQ('#username'),
				pk_el = JQ('#passkey'),
				watch_keypress,
				do_login;

			un_el.bind('keyup', function (ev) {
				if (ev.keyCode === 13) {
					return false;
				}
				if (validate_username(this.value)) {
					JQ('#warn-username').hide();
				}
			});

			watch_keypress = function (ev) {
				if (ev.keyCode === 13) {
					do_login(ev);
					return false;
				}
			}

			do_login = function (ev) {
				var username = un_el.val(),
					passkey = pk_el.val(),
					db_name;

				JQ('#warn-username').hide();
				JQ('#warn-passkey').hide();
				JQ('#warn-login').hide();

				if (!validate_username(username)) {
					return false;
				}

				if (!validate_passkey(passkey)) {
					return false;
				}

				db_name = db_name || (JQ('#use-fake-db').attr('checked') ?
						CONF.get('sandbox-dbname') : CONF.get('dbname'));

				JQ('#login-button').unbind('click', do_login);
				JQ(window).unbind('keydown', watch_keypress);
				mod.authenticate(db_name, username, passkey);
				return false;
			}

			JQ('#login-button').click(do_login);
			JQ(window).bind('keydown', watch_keypress);

			DECK.swap(2);
			if (focus === 'passkey') {
				pk_el.focus();
			}
			else {
				un_el.focus();
			}
		};

		return mod;
	}());

	// Init the 'loading' message UI.
	SIGS.observe_once('dom_ready', function () {
		DECK.swap(0);
		JQ('#deck-0_message').html('Loading...');

		// The time delay *must always* be longer than the time taken
		// to open the shared user cache.
		timed_progress_bar('init_progress_bar', 1200, function () {
			SIGS.broadcast('init_progress_bar');
		});

		// Init the VIEW DOM
		VIEW.DOM_ready(JQ);
	});

	// Set DB options
	DB.init(CONF.get('data-url'), MODELS, CONF.get('debug'));

	// Check the shared cache for users who are already logged in.
	check_user_cache(function (users) {
		SIGS.broadcast('user_cache', users);
	});

	// Get started after the user cache has been checked and the progress
	// indicator has completed.
	SIGS.observe_once('user_cache', function (users) {
		SIGS.observe_once('init_progress_bar', function () {
			if (!users.length) {
				login.show();
				return;
			}

			var list = JQ('#user_list')
				.html(template('user_list-template', {users: users}));

			window.setTimeout(function () {
				JQ('a', list)
					.each(function (i, el) {
						el = JQ(el);

						var parts = el.attr('href').split('/'),
							dbname = parts[0],
							username = parts[1];

						el.click(function (ev) {
							login.authenticate(dbname, username);
							return false;
						});
					})
					.focus();
			}, 0);

			JQ('#show_login').click(function (ev) {
				login.show();
				return false;
			});
			DECK.swap(1);
		});
	});

	// Fire up jQuery.
	jQuery(function (jquery) {
		JQ = jquery;
		SIGS.broadcast('dom_ready');
	});

	// TODO: Temporary -- testing.
	app.commit = function () {
		JQ(window).trigger('global_commit').trigger('make_commit');
	};

	return app;

}(window));

