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

// TODO:
// =====
//
//  * When to set the cache=true URL param and when not to.
//

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

  return function (name, x) {
    if (arguments.length === 1) {
      x = name;
      name = 'undeclared';
    }
    printd(name, print_object(x));
  };
}());

printd('-> start');

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
        printo('channel response', r);
        response = r;
        // Some channel connections are 'keep-alive'
        if (!keepalive) {
          channel.unbind('x-response', channel_listener);
        }

        cp('broadcasting channel response to '+ len +' handlers');
        // Broadcast the response.
        for (; i < len; i += 1) {
          cp('broadcasting '+ (i +1));
          handlers[i](response);
        }
      }
      return false;
    }

    channel.bind('x-response', channel_listener);

    channel.attr('x-request', JSON.stringify(req));
    ev.initEvent('x-request', true, true);
    printo('channel request', req);
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

// The Application
// ===============
//
// Created in an anonymous closure function for safety and sanity.
//
// So anyway, the Dalai Lama finished his round of golf and I say to him
// "Hey!.. Lama. How 'bout a little somthing? You know?.. For the effort."
// And the Lama says "Oh. There will be no money. But, on your death bed, you
// will recieve total consciousness."
//
// So, I got that going for me. Which is nice.
//
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

  var $F = function () {} // Good to have around.

    , conf = require('configs') // Configs module.

    , debug = conf.get('debug') // Debug directive.

    , jmonad = jMonad.noConflict()() // Monadic JavaScript controller.

    , jq = jQuery.noConflict(true) // Assign jQuery.

    , log // Will be the logging module.

    // More 'globalish' symbols.
    , app = {}
    , channel
    , widget_modules = {}
    , render_template
    , handle_commit
    , customer_view
    , search_panels
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

  // Exception handling constructors.
  // --------------------------------

  // Base exception class.
  function exception (e) {
    var self, msg;

    msg = ((typeof e === 'object') ?
      (e.name || 'Error') +' -- '+ (e.message || 'Unknown.') :
      'Error -- '+ e);

    self = new Error(msg);
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

  // Subclass of `exception` for unexpected exception types.
  function unexpected_exception(e) {
    var self = exception(e);
    self.name = 'unexpected_app_exception';
    self.constructor = arguments.callee;
    return self;
  }

	// Templating.
  // -----------
  // 
  // Uses the .template() function from `underscore.js` and the `<script
  // type="text/html">` document fragments on the main page as templates.
  render_template = (function () {
    var cache = {};

    return function (id, context) {
      if (!cache[id]) {
        cache[id] = document.getElementById(id).innerHTML;
      }
      return _.template(cache[id], context);
    };
  }());

  // Contructor for the 'deck' module.
  // ---------------------------------
  // 
  // 'deck_id' The id string of the deck container.
  //
  // `deck_constructor()` will iterate through all the immediate children of
  // the deck container element and create 'cards' in the deck for each one.
  //
  // Returns a function that can be passed the id string of a 'card' in the
  // deck. When invoked, the function will hide whatever deck is currently
  // showing and show the named deck.
  //
  // A speed (is ms) and a callback function can also be passed in as the
  // second and third parameters. This will cause the card swap to be animated.
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

  // Constructor for BBQ widget controller.
  // --------------------------------------
  function widgets() {
    var self = {}
      , bbq = jq.bbq
      , win_jq = jq(window)
      , current_state = {}
      ;

    win_jq.bind('hashchange', function(ev) {
      var id
        , new_state = ev.getState()
        , parts
        , state
        , params
        ;

      for (id in new_state) {
        if (isin(new_state, id)) {
          if (current_state[id] !== new_state[id]) {
            parts = new_state[id].split('?');
            state = parts[0];
            params = jq.deparam.querystring(parts[1], true);
            cp('triggering '+ id +' in state:'+ state);
            win_jq.triggerHandler('widgetstate.'+ id, [state, params]);
          }
        }
      }
      current_state = new_state;
    });

    function register_widget(listeners) {
      var i = 0, len = listeners.length;
      for (; i < len; i += 1) {
        win_jq.bind('widgetstate.'+ listeners[i].name, listeners[i].handler);
      }
    }

    self.register = function (modules) {
      var name;
      for (name in modules) {
        if (isin(modules, name) && jq.isArray(modules[name].listeners)) {
          register_widget(modules[name].listeners);
        }
      }
    };

    self.start = function (hash) {
      if (hash) {
        window.location.hash = hash;
      }
      jq(window).trigger('hashchange');
    };
			
    // For all .bbq widget links, push the appropriate state onto the
    // history when clicked.
    jq('a.bbq').live('click', function(e){
      var state = {}
        , parts = jq(this).attr('href').replace(/^#/, '').split('/')
        , id = parts[0]
        , url = parts[1]
        ;

      if (!id) {
        return false;
      }
      
      // Set the state.
      state[id] = url;
      bbq.pushState(state);
      
      // Prevent the default link click behavior by returning false.
      return false;
    });

    return self;
  }

  // Main navigation widget
  // ----------------------
  //
  // Listens to the `panels` BBQ widget state.
  //
  // DOM element dependencies:
  //   #navigation    -- Navigation list.
  // , #panels        -- Tab panels collection.
  //    ! All panels must be children of #panel and must have id strings of the
  //    form 'panel-'+ panel_name.
  // , #commit-button -- Button on the menu bar.
  //
  function main_widget_constructor(swap_frame) {
    var self = {}
      , toggle_menu_state
      , toggle_panels
      ;

    // Show a panel if it is not already showing.
    // Will hide the currently showing panel.
    // 'name' The name of the panel to show.
    toggle_panels = (function () {
      var panels = {}, current = {}

        // Cacheable getter for menu DOM objects.
        , get_menu_item = (function () {
            var items = {};

            return function (name) {
              if (!items[name]) {
                items[name] = jq('#navigation>li.'+ name +'>ul.options');
              }
              return items[name];
            };
          }())
        ;

      // Cache the jquery panel objects.
      jq('#panels').children().each(function (i, el) {
        panels[el.id.replace(/panel-/, '')] = jq(el);
      });

      return function (name) {
        if (name === current.name) {
          return;
        }
        if (current.panel) {
          current.panel.hide();
        }
        current.panel = panels[name];
        current.panel.show();
        current.name = name;
        toggle_menu_state(get_menu_item(name), 'open');
      };
    }());

    // Open or close a navigation menu tree section.
    // `menu` The name of the section to operate on.
    // [`state`| 'open' or 'closed'] State string.
    // Will toggle the named menu section if `state` is not given or force it
    // open or closed if the state is given.
    toggle_menu_state = function (menu, state) {
      if (state === 'open') {
        menu.show().data('state', 'open');
        return;
      }
      if (state === 'close') {
        menu.hide().data('state', 'closed');
        return;
      }
      if (menu.data('state') === 'open') {
        menu.hide().data('state', 'closed');
        return;
      }
      menu.show().data('state', 'open');
    };

    // All handler functions get an event, state string, and params object
    // passed to them.
    self.listeners = [
      {
        name: 'panels',

        // States must match panel names of the form 'panel-'+ state.
        handler: function (ev, state, params) {
          toggle_panels(state, open);
        }
      }
    ];

    self.show = function () {
      // Hook into the navigation menu.
      jq('#navigation>li')
        .children('button.section')
        .click(function (ev) {
          toggle_menu_state(jq(this).parent().children('ul.options'));
        })
        .parent()
        .children('a.navigation')
        .click(function (ev) {
          toggle_menu_state(jq(this).parent().children('ul.options'));
        })
        ;

      // Hook in to the command menu bar.
      jq('#commit-button').click(handle_commit);

      // Render.
      swap_frame('frame-app');
      jq('#menu').fadeIn(500);
    };

    return self;
  }

  // Application utilities.
  // ----------------------

  // Only if you're man enough.
  // Triggers a custom jQuery event called 'commit'.
  function handle_commit() {
    channel('commits/', 'put', null)(function (response) {
      if (response.status !== 'ok') {
        unexpected_exception(response.body).raise();
      }
      jq(window).triggerHandler('commit');
    });
  }

  // Send a request down to the DCube module to update a data field.
  function dbupdate(key, path, value) {
    channel('items/'+ key, 'post', {path: path, value: value})(
      function () {/* TODO: Check for errors. */});
  }

  // `path` Is a '.' delimited path string. Most of the time it will only be
  // one word. For example, to append another person onto a customer entity the
  // path would just be 'names'.
  function dbappend(key, path, value, cb) {
    channel('items/'+ key, 'append', {path: path, value: value})(function (response) {
      if (response.status !== 'ok') {
        unexpected_exception(response.body).raise();
      }
      cb(response.body);
    });
  }

  // Send a request to the DCube module to get an entity object by key[s].
  function dbget(keys, cached, cb) {
    var isarr = jq.isArray(keys);
    keys = isarr ? keys : [keys];

    channel('items/', 'get', {keys: keys, cached: !!cached})(function (response) {
      if (response.status !== 'ok') {
        unexpected_exception(response.body).raise();
      }

      if (response.body.length) {
        if (isarr) {
          cb(response.body);
          return;
        }
        cb(response.body[0]);
      }
      else {
        // TODO: Pretty error handling.
        log.debug(JSON.stringify(response));
        log.warn('No entities found for key(s) '+ keys);
      }
    });
  }

  // Ask DCube module to create a new entity of the specified kind.
  function dbcreate(kind, cb) {
    channel('items/', 'put', kind)(function (response) {
      if (response.status !== 'ok') {
        unexpected_exception(response.body).raise();
      }

      if (response.body) {
        cb(response.body);
      }
      else {
        // TODO: Pretty error handling.
        log.debug(JSON.stringify(response));
        log.warn('Could not create a '+ kind +' entity.');
      }
    });
  }

  // Query DCube.
  // `query` is specially formated object:
  // {
  //  "INDEX OPERATOR": VALUE
  // }
  //
  // Where
  // INDEX is the name of the index to query;
  // TYPE is one of 'eq', 'gt', 'lt', or 'range';
  // VALUE is the value to query for;
  //
  // Like this:
  //
  // {'kind eq': 'customer', 'last_name range': 'Foo'}
  //
  function dbquery(query, cb) {
    channel('', 'query', {query: query})(function (response) {
      if (response.status !== 'ok') {
        unexpected_exception(response.body).raise();
      }
      cb(response.body);
    });
  }

  // Show a customer entity.
  customer_view = (function () {
    var form, names, addresses, phones, emails;

    function input_handler(ev) {
      // The path to a field is stored in the name attribute of the input element
      // that points to it. It is formatted like so:
      // `key_string.property.index.field`
      var target_jq = jq(this)
        , path = target_jq.attr('name')
        , parts = path.split('.')
        , key = parts[0]
        , type = parts[1] +':'+ parts[3]
        , val = target_jq.val()
        ;

      switch (type) {
      case 'names:last':
        dbupdate(key, path, val);
        break;
      case 'names:first':
        dbupdate(key, path, val);
        break;
      case 'phones:phone':
        dbupdate(key, path, val);
        break;
      case 'phones:label':
        dbupdate(key, path, val);
        break;
      case 'addresses:street':
        dbupdate(key, path, val);
        break;
      case 'addresses:city':
        dbupdate(key, path, val);
        break;
      case 'addresses:state':
        dbupdate(key, path, val);
        break;
      case 'addresses:zip':
        dbupdate(key, path, val);
        break;
      case 'emails:email':
        dbupdate(key, path, val);
        break;
      case 'emails:label':
        dbupdate(key, path, val);
        break;
      }
    }

    function append_handler(ev) {
      printd('click handled');
      var path = jq(this).attr('href').split('.')
        , key = path[0]
        , path = path[1]
        , new_field
        ;

      dbappend(key, path, null, function (customer) {
        switch(path) {
        case 'names':
          names.html(render_template(
              'customer_names-template', {key: key, names: customer.names}));
          break;
        case 'addresses':
          addresses.html(render_template(
              'customer_addresses-template',
              {key: key, addresses: customer.addresses}));
          break;
        case 'phones':
          phones.html(render_template(
              'customer_phones-template',
              {key: key, phones: customer.phones}));
          break;
        case 'emails':
          emails.html(render_template(
              'customer_emails-template',
              {key: key, emails: customer.emails}));
          break;
        }
      });

      printd('click returned');
      return false;
    }

    function view (customer) {
      var key = customer.names[0].last.path.split('.')[0];

      names.html(render_template(
          'customer_names-template', {key: key, names: customer.names}));
      addresses.html(render_template(
          'customer_addresses-template',
          {key: key, addresses: customer.addresses}));
      phones.html(render_template(
          'customer_phones-template', {key: key, phones: customer.phones}));
      emails.html(render_template(
          'customer_emails-template', {key: key, emails: customer.emails}));
    }

    return function (customer) {
      // Cache the jQuery objects we'll be using to render the customer forms.
      form = jq('#customer-view')[0];
      names = jq('#customer-names');
      addresses = jq('#customer-addresses');
      phones = jq('#customer-phones');
      emails = jq('#customer-emails');

      // Attach the live event handlers once.
      jq('input.fform', form).live('keyup blur', input_handler);
      jq('a.fform.append.button', form).live('click', append_handler);

      customer_view = view;
      view(customer);
    };
  }());

  // Show an employee entity.
  employee_view = (function () {
    var form, name, addresses, phones, groups;

    function input_handler(ev) {
      // The path to a field is stored in the name attribute of the input element
      // that points to it. It is formatted like so:
      // `key_string.property.index.field`
      var target_jq = jq(this)
        , path = target_jq.attr('name')
        , parts = path.split('.')
        , key = parts[0]
        , type
        , val = target_jq.val()
        ;

      // TODO: Groups update is not working.
      printd('path', path);

      if (parts[1] === 'name') {
        type = 'name:'+ parts[2];
      }
      else if (parts[1] === 'groups') {
        type = 'groups';
      }
      else {
        type = parts[1] +':'+ parts[3];
      }
      printd('type', type);

      switch (type) {
      case 'name:last':
        dbupdate(key, path, val);
        break;
      case 'name:first':
        dbupdate(key, path, val);
        break;
      case 'phones:phone':
        dbupdate(key, path, val);
        break;
      case 'phones:label':
        dbupdate(key, path, val);
        break;
      case 'addresses:street':
        dbupdate(key, path, val);
        break;
      case 'addresses:city':
        dbupdate(key, path, val);
        break;
      case 'addresses:state':
        dbupdate(key, path, val);
        break;
      case 'addresses:zip':
        dbupdate(key, path, val);
        break;
      case 'groups':
        cp('updating groups');
        dbupdate(key, path, val);
        break;
      }
    }

    function append_handler(ev) {
      var path = jq(this).attr('href').split('.')
        , key = path[0]
        , path = path[1]
        , new_field
        ;

      dbappend(key, path, null, function (employee) {
        switch(path) {
        case 'addresses':
          addresses.html(render_template(
              'employee_addresses-template',
              {key: key, addresses: employee.addresses}));
          break;
        case 'phones':
          phones.html(render_template(
              'employee_phones-template',
              {key: key, phones: employee.phones}));
          break;
        }
      });

      return false;
    }

    function view (employee) {
      var key = employee.name.last.path.split('.')[0];

      name.html(render_template(
          'employee_name-template', {key: key, name: employee.name}));
      groups.html(render_template(
          'employee_groups-template', {key: key, groups: employee.groups}));
      addresses.html(render_template(
          'employee_addresses-template',
          {key: key, addresses: employee.addresses}));
      phones.html(render_template(
          'employee_phones-template', {key: key, phones: employee.phones}));
    }

    return function (employee) {
      // Cache the jQuery objects we'll be using to render the customer forms.
      form = jq('#personnel-view')[0];
      name = jq('#personnel-name');
      groups = jq('#personnel-groups');
      addresses = jq('#personnel-addresses');
      phones = jq('#personnel-phones');

      // Attach the live event handlers once.
      jq('input.fform', form).live('keyup blur', input_handler);
      jq('a.fform.append.button', form).live('click', append_handler);

      employee_view = view;
      view(employee);
    };
  }());

  // Main application panel widgets.
  // -------------------------------

  search_panels = (function () {
    var self = {};

    function advanced_panel() {
      jq('#advanced-search').show();

      // This is actually an event handler.
      return false;
    }

    function customers_panel() {
      jq('#customer-search-button').click(function () {
        var firstname = jq('#customer-search-firstname').val().toUpperCase()
          , lastname = jq('#customer-search-lastname').val().toUpperCase()
          , query = {
              'kind eq': 'customer'
            , 'last_name range': lastname
            }
          ;

        dbquery(query, function (results) {
          jq('#customer-search-results')
            .html(render_template(
                'customer_results-template', {customers: results}));
          // TODO: Handle no results.
        });
        return false;
      });

      jq('#customer-search').show();

      // This is actually an event handler.
      return false;
    }

    function setup_panel() {
      // TODO: Hook up events and cache jQuery objects the first time through.
      jq('span.search-panel-close-button').click(function (ev) {
          jq(this).parent().parent().hide();
      });

      self.advanced = advanced_panel;
      self.customers = customers_panel;
    }

    self.advanced = (function () {
      return function () {
        setup_panel();
        return self.advanced();
      };
    }());

    self.customers = (function () {
      return function () {
        setup_panel();
        return self.customers();
      };
    }());

    jq(function () {
      jq('#search-customers').click(self.customers);
      jq('#search-advanced').click(self.advanced);

      // Set the handlers for future customer search results.
      jq('a.search-result', jq('#customer-search-results')[0])
        .live('click', function (ev) {
          jq.bbq.pushState({panels: 'customers'});
          jq('#customer-search').hide();
          // Don't return false here, because the BBQ widget handler neeeds to
          // get this URL hash.
          // return false;
        });

      // Set the handlers for future advanced search results.
      jq('a.search-result', jq('#advanced-search-results')[0])
        .live('click', function (ev) {
          jq('#advanced-search').hide();
          // Don't return false here, because the BBQ widget handler neeeds to
          // get this URL hash.
          // return false;
        });
    });

    return self;
  }());

  widget_modules.customers = (function () {
    var self = {}, actions = {};

    actions['view'] = (function (params) {
      var created = {key: null, view: null};

      return function(params) {
        // If there is no key param, create a new customer.
        if (!params.key) {
          dbcreate('customer', function (entity_view) {
            var new_state = {};
            created.key = entity_view.names[0].first.path.split('.')[0];
            created.view = entity_view;
            jq.bbq.pushState({customers: 'view?key='+ created.key});
          }); 
          return;
        }

        // If the customer was just created, use it.
        if (created.key === params.key) {
          customer_view(created.view);
          // We don't want to memoize this view again.
          created.view = null;
          created.key = null;
          return;
        }

        // Get the customer view by the given key.
        dbget(params.key, params.cached, function (entity_view) {
          customer_view(entity_view);
        });
      };
    }());

    self.listeners = [
      {
        name: 'customers',
        handler: function (ev, state, params) {
          actions[state](params);
        }
      },
    ];

    return self;
  }());

  widget_modules.personnel = (function () {
    var self = {}, actions = {};

    actions['view'] = (function (params) {
      var created = {key: null, view: null};

      return function(params) {
        // If there is no key param, create a new employee.
        if (!params.key) {
          // Go to the personnel panel if we are not already there.
          jq.bbq.pushState({panels: 'personnel'});

          dbcreate('employee', function (entity_view) {
            var new_state = {};
            created.key = entity_view.name.first.path.split('.')[0];
            created.view = entity_view;
            jq.bbq.pushState({personnel: 'view?key='+ created.key});
          }); 
          return;
        }

        // If the employee was just created, use it.
        if (created.key === params.key) {
          employee_view(created.view);
          // We don't want to memoize this view again.
          created.view = null;
          created.key = null;
          return;
        }

        // Get the employee view by the given key.
        dbget(params.key, params.cached, function (entity_view) {
          employee_view(entity_view);
        });
      };
    }());

    self.listeners = [
      {
        name: 'personnel',
        handler: function (ev, state, params) {
          actions[state](params);
        }
      },
    ];

    return self;
  }());

  // Login GUI widgets.
  // ------------------

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

  // Monad callbacks.
  // ----------------

  // Called when the init process is done.
  function init_monad_done(monad, retval) {
    var controller = widgets();

    cp('connection id: '+ retval);

    channel = function (ep, method, body) {
      return monad.channel('db/connections/'+ retval +'/'+ ep, method, body);
    }

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

  // Monad functions.
  // ----------------

  app.dom_setup = function (monad, returned) {
    monad.swap_frame = deck_constructor('deck');
  };

  app.dcube_setup = function (monad, returned) {
    var returns = this.returns; 
    monad.channel('db/debug', 'put', debug)(function () {
      monad.channel('db/domain', 'put', conf.get('domain'))(returns);
    });
  };
  app.dcube_setup.blocking = true;

  app.check_connections = function (monad, returned) {
    var m = this;
    monad.channel('db/connections/', 'get')(function (response) {
      m.returns(response.body);
    });
  };
  app.check_connections.blocking = true;

  app.display_login = function (monad, returned) {
    // `returned` is the connections list.
    var m = this, is_array = jq.isArray(returned);

    if (is_array && !returned.length) {
      returned = null;
      is_array = false;
    }

    function handle_login_event(ev, username, passkey, db) {
      monad.login.remove_listener(handle_login_event);
      m.returns({username: username, passkey: passkey, dbname: db});
    }

    function handle_connection_event(ev, connection) {
      monad.connections.remove_listener(handle_connection_event);
      m.returns(connection /* string or null */);
    }

    // Got the connections list.
    if (is_array) {
      monad.connections = connection_list_widget_constructor(monad.swap_frame);
      monad.connections.add_listener(handle_connection_event);
      monad.connections.show(returned);
    }
    // Got null - login request.
    else if (returned === null) {
      monad.login = login_widget_constructor(monad.swap_frame);
      monad.login.add_listener(handle_login_event);
      monad.login.show($F);
    }
    // Got the connection id string or credentials object.
    else {
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

          if (response.body === 'DCubeUserError: user does not exist') {
            monad.login.add_listener(handle_login_event);
            monad.login.user_not_found();
          }

          else if (response.body === 'DCubeUserError: invalid passkey') {
            monad.login.add_listener(handle_login_event);
            monad.login.invalid_passkey();
          }

          else if (response.status === 'exception') {
            unexpected_exception(response.body).raise();
          }

          else if (response.status === 'ok') {
            m.returns(response.body);
          }
        });
    }
    try_login(returned);
  };
  app.maybe_login.blocking = true;

  // This is where the app gets started.
  // -----------------------------------

  // Build the monad.
  jmonad.extend('app', app);

  // Listen for the DOM/channel ready event to start the program.
  jq.channel(function (ch) {
    // Create the monad 'baton'.
    var monad = {
      channel: ch,
      widgets: widget_modules
    };

    // Start the init monad.
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
}(window));

