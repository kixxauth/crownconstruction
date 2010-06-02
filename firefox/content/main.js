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

function xxx(window) {

	// Ghetto require function.
	function require(id) {
		var m = Components.utils.import(
				"resource://crownconstruction/modules/"+ id +".js", null);
		return ((typeof m.exports === "object") ? m.exports : m);
	}

	var LOG,
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
		var d = new Date(),
			debug = CONF.get('debug'),
			logging = require("logging"),
			logger;

		if (debug) {
			logging.debug(debug);
		}
		logger = logging.getLogger("CC_ERM_"+
			(d.getMonth() +1) +"-"+
			d.getDate() +"-"+
			d.getHours() +":"+
			d.getMinutes() +":"+
			d.getSeconds());
		return logger;
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

		function index_customer_key(val) {
			return ['customer', val];
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
				customer: db.str({index: index_customer_key}),
				strname: db.str(),
				sale_by: db.str(),
				estimate_by: db.str(),
				production_by: db.str(),
				estimate_date: db.str(),
				roundtrip_miles: db.num(),
				allotted_miles: db.num(),
				startdate: db.str(),
				completedate: db.str(),
				contractdate: db.str(),
				description: db.str(),
				taxlabor: db.num(),
				estimated_profit: db.num(),
				payments: db.list(
					db.dict({
						due: db.str(),
						memo: db.str(),
						amount: db.str()
					})
				),
				jobs: db.list(
					db.dict({
						type: db.str(),
						retail: db.str(),
						amount: db.str(),
						foreman: db.str(),
						mandays: db.num()
					})
				),
				direct_pays: db.list(db.str()),
				handoff: db.dict({scheduled: db.str(), completed: db.str()}),
				walkthrough: db.dict({scheduled: db.str(), completed: db.str()}),
				special_orders: db.list(db.dict({
					description: db.str(),
					vendor: db.str(),
					ordered_by: db.str(),
					order_date: db.str(),
					delivery_date: db.str()
				})),
				sub_contractors: db.list(db.dict({
					description: db.str(),
					task: db.str(),
					phone: db.str(),
					quote: db.str(),
					startdate: db.str()
				})),
				siding: db.dict({
					squares: db.num(),
					type: db.str(),
					style: db.str(),
					brand: db.str(),
					color: db.str(),
					trim_color: db.str()
				}),
				roofing: db.dict({
					squares: db.num(),
					type: db.str(),
					style: db.str(),
					brand: db.str(),
					color: db.str(),
					tearoff: db.bool()
				}),
				ufpo: db.str(),
				permits: db.list(db.dict({
					type: db.str(), date_received: db.str(), phone: db.str()
				}))
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
				tables[key] = {key: key, id: data[i]('entity').strname};
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
	WIDGETS.tabs_widget = function (db, construct_view) {
		var self = {id: "tabs"},
				tabs = JQ('#tabs>ul>li>a'),
				tab_panels = JQ('#tabs>div'),
				deselect = function () {};

		tab_panels.hide();

		self.update = function (hash, params) {
			var tab = tabs.filter("[href='#"+ hash +"']"),
				tab_panel = tab_panels.filter("[id$='"+ hash +"']");

			deselect();
			tab.addClass('selected');
			tab_panel.show();

			deselect = function () {
				tab.removeClass('selected');
				tab_panel.hide();
			};
		};

		return self;
	};

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
					diff = JSON.stringify(dict), mutated,
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
					mutated(true);
					db.put(entity, function (x) {
						entity = x;
						customer_index(function (tables) {
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

				mutated = (function () {
					var showing = false;
					return function (hide){
						if (hide) {
							JQ('#notify-unsaved').slideUp();
						}
						else if (diff !== JSON.stringify(dict)) {
							JQ('#notify-unsaved').slideDown();
							return true;
						}
						JQ('#notify-unsaved').slideUp();
					};
				}());

				//dump('\n'+ JSON.stringify(dict) +'\n');
				function validator_for(path) {
					var data_path = path.split('.'),
						field = data_path.pop();
					data_path = data_path.join('.');

					return function (ev) {
						dict[data_path][field] = this.value;
						var changed = mutated();
						if (!bound && changed) {
							bind();
						}
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
						job_dict = job_data_view.dict,
						job_view = job_data_view.view,
						diff = JSON.stringify(job_dict), mutated,

						form = JQ('#job_form')
							.html('<div class="left-col"></div><div class="right-col"></div>');

					dump('\nview ->\n'+ JSON.stringify(job_view) +'\n');

					function global_commit() {
						job('update', job_data);
						unbind_commit();
						mutated(true);
						db.put(job, function (x) {
							job = x;
							job_index(function (tables) {}, job);
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

					mutated = (function () {
						var showing = false;
						return function (hide){
							if (hide) {
								JQ('#notify-unsaved').slideUp();
							}
							else if (diff !== JSON.stringify(dict)) {
								JQ('#notify-unsaved').slideDown();
								return true;
							}
							JQ('#notify-unsaved').slideUp();
						};
					}());

					//dump('\n'+ JSON.stringify(dict) +'\n');
					function validator_for(path) {
						var data_path = path.split('.'),
							field = data_path.pop();
						data_path = data_path.join('.');


						return function (ev) {
							dict[data_path][field] = this.value;
							var changed = mutated();
							if (!bound && changed) {
								bind();
							}
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
							job_data[property].push(null);
							job('update', job_data);
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

						function commit() {
							JQ(window)
								.trigger('global_commit')
								.trigger('make_commit');
						}

						JQ('#notify-unsaved').click(commit);
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

}

function printd(msg, val) {
  val = typeof val === 'undefined' ? '' : ' : '+ val;
  dump(msg + val +'\n');
}

function cp(msg) {
  printd(' -> CHECK POINT', msg);
}

var printo = (function () {

  function print_object(x, ident) {
    var r = ''
      , i = 0
      , len
      , op
      ;

    ident = ident || '';

    if (typeof x === 'string') {
      return ident +'"'+ x +'"';
    }
    else if (typeof x === 'number' || typeof x === 'boolean') {
      return ident + x;
    }
    else if (x === null) {
      return ident +'null';
    }
    else if (typeof x === 'undefined') {
      return ident +'undefined';
    }
    else if (typeof x === 'function') {
      return ident +'function () { ... code ... }';
    }

    else if (Object.prototype.toString.call(x) === '[object Array]') {
      r = ident +'[';
      len = x.length;

      for (; i < len; i += 1) {
        r += '\n'+ arguments.callee(x[i], ident +'  ') +',';
      }
      if (len) {
        r = r.slice(0, (r.length -1)) +'\n';
      }
      return r + ident +']\n';
    }

    r = ident +'{';
    for (i in x) {
      op = arguments.callee(x[i], ident +'  ');
      r += '\n'+ ident +'  "'+ i +'": '+ op.slice((ident +'  ').length) +',';
    }
    r = r.slice(0, (r.length -1)) +'\n';
    return r + ident +'}\n';
  }

  return function printo(name, x) {
    if (arguments.length === 1) {
      x = name;
      name = 'undeclared';
    }
    printd(name, print_object(x));
  }
}());

// Contruct the `channel` plugin for jQuery
(function (jq, undef) {
  var self
    , channel
    , observers = []
    , uid
    , request
    ;

  // The channel plugin function is just a listener registration function for
  // the channel ready event, and concequently the DOM ready event.
  self = function (fn) {
    if (channel) {
      fn(request);
    }
    else {
      observers.push(fn);
    }
    return jq;
  };

  // Explicity bind the channel plugin to jQuery without clobbering the
  // namespace.
  self.noConflict = (function () {
    var name, value;

    return function (new_name) {
      if (name && value) {
        jq[name] = value;
      }
      name = new_name;
      value = jq[new_name];
      jq[name] = self;
      return self;
    };
  }());

  // UID generation utility.
  uid = (function () {
    var counter = 0;

    return function () {
      return (counter += 1);
    };
  }());

  // Construct a request promise function.
  request = function (resource, method, body, keepalive) {
    var response = null
      , handlers = []
      , req =
        { id: uid()
        , resource: resource
        , method: method
        , body: body
        }
      , ev = document.createEvent('Event')
      ;

    // Handle channel events.
    function channel_listener() {
      var i = 0
        , len = handlers.length
        , r = JSON.parse(channel.attr('x-response'))
        ;

      // We need to check the request id to make sure this is a
      // request / response pair.
      if (r.id === req.id) {
        printo('got response ', r);
        response = r;
        // Some channel connections are 'keep-alive'
        if (!keepalive) {
          channel.unbind('x-response', channel_listener);
        }

        printd('broadcasting channel response to '+ len +' handlers');
        // Broadcast the response.
        for (; i < len; i += 1) {
          printd('broadcasting');
          handlers[i](response);
        }
      }
      return false;
    }

    channel.bind('x-response', channel_listener);

    channel.attr('x-request', JSON.stringify(req));
    ev.initEvent('x-request', true, true);
    printo("sending request ->", req);
    channel[0].dispatchEvent(ev);

    // Promise constructor function.
    function promise(fn) {
      handlers.push(fn);
      if (response) {
        fn(response);
      }
      return promise;
    }

    return promise;
  };

  // Bind the channel to jQuery.channel
  self.noConflict('channel');

  // Plugin init.
  function init(channel_id) {
    var i = 0, len = observers.length;

    // Set the channel object and notify observers.
    channel = jq('#'+ channel_id);
    for (; i < len; i += 1) {
      observers[i](request);
    }
  }

  // Setup the channel on page load.
  jq(function () {

    // Channel open event handler.
    function handler(ev) {
      jq(this).unbind('x-channelopen', handler);
      init(document.documentElement.getAttribute('x-channelid'));
      return false;
    }

    // Listen for the channel open event from browser chrome.
    jq(document).bind('x-channelopen', handler);
  });
}(jQuery)); 

  function setdb(type, val, callback) {
    channel('db/'+ type, 'put', val)(function (response) {
      callback(response.body);
    });
  }

  login_monad = (function () {
    var self = {};

    self.dcube_debug = function (monad, val) {
      printd('db()');
      var me = this;

      setdb('domain', conf.get('debug'), function (response) {
        log.info('DCube debugging: '+ response);
        me.returns();
      });
    };
    self.dcube_debug.blocking = true;

    self.dcube_domain = function (monad, val) {
      printd('db()');
      var me = this;

      setdb('domain', conf.get('domain'), function (response) {
        log.info('DCube domain '+ response);
        me.returns();
      });
    };
    self.dcube_domain.blocking = true;

    self.connections = function (monad, val) {
      printd('connections()');
      channel('db/connections/', 'get')(function (response) {
        printo('connections', response);
        this.returns();
      });
    };
    self.connections.blocking = true;

    self.display = function (monad, val) {
      printd('display()');
    };

    return self;
  }());

(function (window, undefined) {

  // Ghetto require function.
  function require(id) {
    var m = Components.utils.import(
        "resource://crownconstruction/modules/"+ id +".js", null);
    return ((typeof m.exports === "object") ? m.exports : m);
  }

	// Handy utility.
	function isin(x, y) {
		return Object.prototype.hasOwnProperty.call(x, y);
	}

  var $F = function () {}
    , conf = require('configs')
    , debug = conf.get('debug')
    , jmonad = jMonad.noConflict()()
    , jq = jQuery.noConflict(true)
    , log
    , app = {}
    , widget_modules = {}
    ;

  // Ghetto logger.
  log = (function () {
    var d = new Date(),
      logging = require("logging"),
      logger;

    if (debug) {
      logging.debug(debug);
    }
    logger = logging.getLogger("CCERM_"+
      (d.getMonth() +1) +"-"+
      d.getDate() +"-"+
      d.getHours() +":"+
      d.getMinutes() +":"+
      d.getSeconds());
    return logger;
  }());

  // Exception handling.
  function exception (e) {
    var self = new Error(msg)

      , msg = ((typeof e === 'object') ?
          (e.name || 'Error') +' -- '+ (e.message || 'Unknown.') :
          'Error -- '+ e)
      ;

    self.name = "app_exception";
    self.lineNumber = typeof e === 'object' ? (e.lineNumber || 0) : 0;
    self.fileName = typeof e === 'object' ? (e.fileName || 'na') : 'na';
    self.constructor = arguments.callee;

    self.raise = function () {
      log.error(self);
      // TODO: Nice error dialog.
      alert(self);
      throw self;
    };

    return self;
  }

  function unexpected_exception(e) {
    var self = exception(e);
    self.name = 'unexpected_app_exception';
    self.constructor = arguments.callee;
    return self;
  }

	// Templating.
	function render_template(id, context) {
		return _.template(document.getElementById(id).innerHTML, context);
	}

  // Contructor for the 'deck' module.
  function deck_constructor(deck_id) {
    var deck = jq('#'+ deck_id)
      , current
      , frames = {}
      ;

    deck.children().each(function (i) {
      frames[this.id] = jq('#'+ this.id);
    });

    function fade_switch(frame_name, speed, callback) {
      if (current) {
        current.hide(speed, function () {
          current = jq(this);
          current.show(speed, callback);
        });
      }
      else {
        current = frames[frame_name];
        current.show(speed, callback);
      }
    }

    return function (frame_name, speed, callback) {
      if (speed) {
        fade_switch(frame_name, speed, callback);
        return;
      }

      if (current) {
        current.hide();
      }

      if (frame_name) {
        current = frames[frame_name];
        current.show();
      }
    };
  }

  function widgets() {
    var self = {}
      , bbq = jq.bbq
      , widget_dict = {}
      ;

    function maybe_update(new_state, current_state) {
      if (!new_state || new_state === current_state) {
        return;
      }

      var parts = new_state.split('?');
      return [parts[0], jq.deparam.querystring(parts[1], true)];
      // Return the hash and query string as an object.
    }

    jq(window).bind('hashchange', function(ev) {
      var id, w, update, new_state;

      for (id in widget_dict) {
        if (isin(widget_dict, id)) {
          w = widget_dict[id];
          new_state = ev.getState(id);
          update = maybe_update(new_state, w.current_state);
          if (update) {
            w.current_state = new_state;
            // tuple (hash, params)
            w.update(update[0], update[1]);
          }
        }
      }
    });

    self.register = function (modules) {
      var name, mod;
      for (name in modules) {
        if (isin(modules, name)) {
          mod = modules[name];
          widget_dict[mod.id] = mod;
        }
      }
    };

    self.start = function (hash) {
      if (hash) {
        window.location.hash = hash;
      }
      jq(window).trigger('hashchange');
    };
			
    // For all links inside a .bbq widget, push the appropriate state onto the
    // history when clicked.
    jq('.bbq a[href^=#]').live('click', function(e){
      var state = {}
        , href_jq = jq(this)
        
          // Get the id of this .bbq widget.
        , id = href_jq.closest('.bbq').attr('id')
        
          // Get the url from the link's href attribute,
          // stripping any leading #.
        , hash = href_jq.attr('href').replace(/^#/, '')
        ;

      // Make sure there is a widget object with this id.
      if (!widget_dict[id]) {
        log.warn('No widget with referenced id "'+ id +'".');
      }
      
      // Set the state.
      state[id] = hash;
      bbq.pushState(state);
      
      // Prevent the default link click behavior by returning false.
      return false;
    });

    return self;
  }

  function main_widget_constructor(swap_frame) {
    var self = {id: 'main-navigation'}
      , toggle_menu_state
      , toggle_tabs
      ;

    toggle_panels = (function () {
      var current_panel;

      return function (panel) {
        cp('toggle_tab() to: '+ panel +', from: '+ current_panel);
        toggle_menu_state(current_panel, 'close');
        toggle_menu_state(panel, 'open');
        if (current_panel === panel) {
          return;
        }
        jq('#panel-'+ current_panel).hide();
        jq('#panel-'+ panel).show();
        current_panel = panel;
      };
    }());

    toggle_menu_state = (function () {
      var current_states = {}
        , get_menu_item
        ;

      
      get_menu_item = (function () {
        var items = {};

        return function (name) {
          if (!items[name]) {
            items[name] = jq(
              "#main-navigation>li>a[href='#"+ name +"']").next();
          }
          return items[name];
        };
      }());

      function open(name) {
        get_menu_item(name).show();
        current_states[name] = 'open';
      }

      function close(name) {
        get_menu_item(name).hide();
        current_states[name] = 'close';
      }

      return function (name, state) {
        if (!name) {
          return;
        }

        if (state) {
          if (current_states[name] === state) {
            return;
          }
          if (state === 'open') {
            open(name);
          }
          if (state === 'close') {
            close(name);
          }
          return;
        }

        if (current_states[name] === 'open') {
          close(name);
          return;
        }

        open(name);
      };
    }());

    self.update = function (hash, params /* params is an object */) {
      cp('update(): '+ hash);
      if (/customer/.test(hash)) {
        toggle_panels('customers');
      }
    };

    self.show = function () {
      jq('#main-navigation>li.navigation>button.navigation')
        .click(function (ev) {
          toggle_menu_state(jq(this).next().attr('href').replace(/^#/, ''));
        });

      swap_frame('main-navigation');
    };

    return self;
  }

  // Construct the login widget frame.
  function login_widget_constructor(swap_frame) {
    var self = {}
      , validate_passkey = require('dcube').validatePasskey
      , validate_username = require('dcube').validateUsername
      , form_jq
      , username_jq
      , passkey_jq
      , username
      , passkey
      , show_username_warning
      , show_passkey_warning
      , show_spinner
      , show_button
      ;

    function set_form_jq() {
      if (!form_jq) {
        form_jq = jq('#login');
      }
    }

    function set_username_jq() {
      if (!username_jq) {
        username_jq = jq('#username');
      }
    }

    function set_passkey_jq() {
      if (!passkey_jq) {
        passkey_jq = jq('#passkey');
      }
    }

    username = function () {
      set_username_jq();

      username = function () {
        var x = username_jq.val()
          , rv = {error: null, val: null}
          ;

        try {
          rv.val = validate_username(x);
        } catch (e) {
          if (e.name === 'usernameValidationError') {
            rv.error = e;
          }
          else {
            // Stops execution.
            unexpected_exception(e).raise();
          }
        }

        return rv;
      };

      return username();
    };

    passkey = function () {
      set_passkey_jq();

      passkey = function () {
        var x = passkey_jq.val()
          , rv = {error: null, val: null}
          ;

        try {
          rv.val = validate_passkey(x);
        } catch (e) {
          if (e.name === 'passkeyValidationError') {
            rv.error = e;
          }
          else {
            // Stops execution.
            unexpected_exception(e).raise();
          }
        }

        return rv;
      };

      return passkey();
    };

    show_username_warning = function (ex) {
      var target = jq('#username')
        , offsets = target.offset()
        , target_width = target.width()
        , warn_box = jq('#login-username-warning')
        , content_box = warn_box.find('.content')
        , change_content
        ;

      warn_box.css({
          'top': offsets.top - target.height(),
          'left': offsets.left + (target_width + (target_width * 0.07))});

      change_content = (function () {
        var current;
        return function (exception) {
          var msg;

          if (exception.message === current) {
            return;
          }

          current = exception.message;
          switch (current) {
          case 'too short':
            msg = 'A username must have at least one character.';
            break;
          case 'too long':
            msg = 'A username cannot contain more than 70 characters.';
            break;
          case 'invalid characters':
            msg = ('A username may only contain the '+
                'characters "a" - "z", "A" - "Z", "0" - "9", and "_".');
            break;
          case 'username not found':
            msg = 'This username does not exist.';
            break;
          default:
            msg = 'Invalid username.';
          }

          content_box.text(msg);
        };
      }());

      function show(exception) {
        change_content(exception);
        warn_box.show();

        function hide() {
          self.remove_listener(hide);
          warn_box.hide();
          show_username_warning = show;
        }

        function handle_keyup(ev) {
          var x = username();
          if (x.error) {
            change_content(x.error);
          }
          else {
            target.unbind('keyup', handle_keyup);
            hide();
          }
        }

        target.keyup(handle_keyup);
        self.add_listener(hide);
        show_username_warning = change_content;
      };

      show(ex);
    };

    show_passkey_warning = function (ex) {
      var target = jq('#passkey')
        , offsets = target.offset()
        , target_width = target.width()
        , warn_box = jq('#login-passkey-warning')
        , content_box = warn_box.find('.content')
        , change_content
        ;

      warn_box.css({
          'top': offsets.top - target.height(),
          'left': offsets.left + (target_width + (target_width * 0.07))});

      change_content = (function () {
        var current;
        return function (exception) {
          var msg;

          if (exception.message === current) {
            return;
          }

          current = exception.message
          switch (current) {
          case 'too short':
            msg = 'A passkey must have at least 4 characters.'
            break;
          case 'too long':
            msg = 'A passkey cannot contain more than 140 characters.'
            break;
          case 'invalid characters':
            msg = 'A passkey may only contain visible characters.';
            break;
          default:
            msg = 'Invalid passkey.';
          }

          content_box.text(msg);
        };
      }());

      function show(exception) {
        change_content(exception);
        warn_box.show();

        function hide() {
          self.remove_listener(hide);
          warn_box.hide();
          show_passkey_warning = show;
        }

        function handle_keyup(ev) {
          var x = passkey();
          if (x.error) {
            change_content(x.error);
          }
          else {
            target.unbind('keyup', handle_keyup);
            hide();
          }
        }

        target.keyup(handle_keyup);
        self.add_listener(hide);
        show_passkey_warning = change_content;
      };

      show(ex);
    };

    self.show = function (cb) {
      var button = jq('#login-button')
        , button_css = {
            'background-color': button.css('background-color')
          }
        ;

      function handle_click(ev) {
        var u = username()
          , p = passkey()
          , db = (jq('#use-fake-db').attr('checked') ?
              conf.get('sandbox-dbname') : conf.get('dbname'))
          ;

        if (u.error) {
          setTimeout(function () {
            username_jq.focus();
          }, 0);
          show_username_warning(u.error);
          return false;
        }
        if (p.error) {
          setTimeout(function () {
            passkey_jq.focus();
          }, 0);
          show_passkey_warning(p.error);
          return false;
        }

        show_spinner();
        set_form_jq();
        form_jq.trigger('login', [u.val, p.val, db]);
        return false;
      }

      show_spinner = function () {
        button
          .unbind('click', handle_click)
          .css('background-color', '#eee')
          .html('<img width="16" height="16" '+
            'src="css/images/ui-anim_basic_16x16.gif" />')
          ;
      };

      show_button = function () {
        button
          .click(handle_click)
          .css('background-color', button_css['background-color'])
          .html('Login')
          ;
      };

      button.click(handle_click);
      swap_frame('frame-login');
    };

    self.add_listener = function (fn) {
      set_form_jq();

      function bind (f) {
        form_jq.bind('login', f);
      }

      self.add_listener = bind;
      bind(fn);
    };

    self.remove_listener = function (fn) {
      set_form_jq();

      function unbind (f) {
        form_jq.unbind('login', f);
      }

      self.remove_listener = unbind;
      unbind(fn);
    };

    self.user_not_found = function () {
      show_button();
      username_jq.focus();
      show_username_warning({message: 'username not found'});
    };

    self.invalid_passkey = function () {
      show_button();
      passkey_jq.focus();
      show_passkey_warning({message: 'Invalid passkey.'});
    };

    return self;
  }

  // Construct the connection list widget frame.
  function connection_list_widget_constructor(swap_frame) {
    var self = {}
      , bind
      , unbind = $F
      , handle_selection
      , handle_login
      , frame_jq
      ;

    frame_jq = function () {
      frame = jq('#frame-connections');
      frame_jq = function () {
        return frame;
      };
      return frame;
    };

    bind = function () {
      var list_jq = jq('a.connection-list')
        , login_jq = jq('#create-new-connection>a')
        ;

      function unbind_fn() {
        list_jq.unbind('click', handle_selection);
        login_jq.unbind('click', handle_login);
        unbind = $F;
        bind = bind_fn;
      }

      function bind_fn() {
        list_jq.click(handle_selection);
        login_jq.click(handle_login);
        unbind = unbind_fn;
        bind = $F;
      }

      bind_fn();
    };

    handle_selection = function (ev) {
      unbind();
      frame_jq().trigger('login', [jq(this).attr('href')]);
      return false;
    };

    handle_login = function (ev) {
      unbind();
      frame_jq().trigger('login', [null]);
      return false;
    }

    function show(list) {
      var cxns;

      cxns = jq.map(list, function (item, i) {
        return {
          id: item.id,
          username: item.username,
          dbname: (item.dbname === 'crown_construction' ? 'Live' : 'Sandbox')
        };
      });

      frame_jq().html(render_template('connection_list-template', {connections: cxns}));
      bind();
      swap_frame('frame-connections');
      self.show = $F;
    }

    self.add_listener = function (fn) {
      frame_jq().bind('login', fn);
    };

    self.remove_listener = function (fn) {
      frame_jq().unbind('login', fn);
    };

    self.show = show;
    return self;
  }

  // Called when the init process is done.
  function init_monad_done(monad, retval) {
    var controller = widgets();

    printd('connected to ', retval);
    monad.widgets.main = main_widget_constructor(monad.swap_frame);
    controller.register(monad.widgets);
    controller.start(/* could give a hash string */);
    monad.widgets.main.show();
  }

  // Called when an error is thrown from the init process.
  function init_monad_exception(ex) {
    printd('init monad error', ex);
    log.error(ex);
    Components.utils.reportError(ex);
  }

  app.dom_setup = function (monad, returned) {
    monad.swap_frame = deck_constructor('deck');
  };

  app.dcube_setup = function (monad, returned) {
    printd('dcube_setup()');
    var returns = this.returns; 
    monad.channel('db/debug', 'put', debug)(function () {
      monad.channel('db/domain', 'put', conf.get('domain'))(returns);
    });
  };
  app.dcube_setup.blocking = true;

  app.check_connections = function (monad, returned) {
    printd('check_connections()');
    var m = this;
    monad.channel('db/connections/', 'get')(function (response) {
      m.returns(response.body);
    });
  };
  app.check_connections.blocking = true;

  app.display_login = function (monad, returned) {
    // `returned` is the connections list.
    var m = this, is_array = jq.isArray(returned);
    cp('display_login');
    printo('returned', returned);

    if (is_array && !returned.length) {
      returned = null;
      is_array = false;
    }

    function handle_login_event(ev, username, passkey, db) {
      cp('login '+ username);
      monad.login.remove_listener(handle_login_event);
      m.returns({username: username, passkey: passkey, dbname: db});
    }

    function handle_connection_event(ev, connection) {
      cp('select connection '+ connection);
      monad.connections.remove_listener(handle_connection_event);
      m.returns(connection /* string or null */);
    }

    // Got the connections list.
    if (is_array) {
      cp('got connections list');
      monad.connections = connection_list_widget_constructor(monad.swap_frame);
      monad.connections.add_listener(handle_connection_event);
      monad.connections.show(returned);
    }
    // Got null - login request.
    else if (returned === null) {
      cp('got null -- login request');
      monad.login = login_widget_constructor(monad.swap_frame);
      monad.login.add_listener(handle_login_event);
      monad.login.show($F);
    }
    // Got the connection id string or credentials object.
    else {
      cp('got connection id');
      m.returns(returned);
    }
  };
  app.display_login.blocking = true;

  app.maybe_login = function (monad, returned) {
    // If a connection id is passed, we already have a connection.
    if (typeof returned === 'string') {
      this.returns(returned);
      return;
    }

    var m = this, handle_login_event, try_login;

    handle_login_event = function (ev, u, p, d) {
        monad.login.remove_listener(handle_login_event);
        try_login({username: u, passkey: p, dbname: d});
    }

    try_login = function (creds) {
      monad.channel('db/connections/', 'put', creds)(
        function (response) {
          printo('response', response);

          if (response.body === 'DCubeUserError: user does not exist') {
            monad.login.add_listener(handle_login_event);
            monad.login.user_not_found();
          }

          else if (response.body === 'DCubeUserError: invalid passkey') {
            monad.login.add_listener(handle_login_event);
            monad.login.invalid_passkey();
          }

          else if (response.status === 'exception') {
            unexpected_exception(new Error(response.body)).raise();
          }

          else if (response.status === 'ok') {
            m.returns(response.body);
          }
        });
    }
    try_login(returned);
  };
  app.maybe_login.blocking = true;

  // Build the monad.
  jmonad.extend('app', app);

  // Listen for the DOM/channel ready event to start the program.
  jq.channel(function (ch) {
    var monad = {
      channel: ch,
      widgets: widget_modules
    };

    jmonad('app', monad)
      .dom_setup()
      .dcube_setup()
      .check_connections()
      .display_login()
      .display_login()
      .maybe_login()
      (init_monad_done, init_monad_exception)
      ;
  });

  printd('-> start');
}(window));

