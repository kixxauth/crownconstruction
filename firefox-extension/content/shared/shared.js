/*jslint
onevar: true,
undef: true,
nomen: true,
eqeqeq: true,
plusplus: true,
bitwise: true,
regexp: true,
immed: true,
strict: true,
laxbreak: true
*/

/*global
window: false
*/

"use strict";

var SHARED = {};

SHARED.validateString = function (str, short, long, reg) {
  str = (typeof str === 'string') ? str : '';
  var len = str.length;

  if (len < short) {
    throw 'too short';
  }
  if (len > long) {
    throw 'too long';
  }
  if (reg.test(str)) {
    throw 'invalid characters';
  }
  return str;
};

SHARED.CommandControl = function (jQuery) {
  var self = {}
    , command_state = {}
    , registry = {}
    , observers = []
    ;

  self.register = function (namespace, command, fn) {
    if (typeof fn === 'function') {
      registry[namespace] = registry[namespace] || {};
      registry[namespace][command] = registry[namespace][command] || [];
      registry[namespace][command].push(fn);
    }
  };

  function dispatch(namespace, command, args) {
    // TODO DEBUG REMOVE
    dump('dispatching state "'+ command +'" for "'+ namespace +'"\n');
    if (!(registry[namespace] || {})[command]) {
      return;
    }

    var i = 0, len = registry[namespace][command].length;

    for (; i < len; i += 1) {
      registry[namespace][command][i].call(null, args);
    }
  }

  self.observe = function (fn) {
    if (typeof fn === 'function') {
      observers.push(fn);
    }
  };

  self.broadcast = function (changes) {
    var i = 0, key;

    for (; i < changes.length; i += 1) {
      key = changes[i];
      dispatch(key, command_state[key].state, command_state[key].params);
    }
    // The state MUST be broadcast AFTER the commands are dispatched.
    for (i = 0; i < observers.length; i += 1) {
      observers[i](command_state);
    }
  };

  function update_state(key, val) {
    var parts = val.split('?')
      , state = parts[0]
      , params = jQuery.deparam.querystring(parts[1], true)
      ;
    command_state[key] = {state:state, params:params, encoded: val};
    return key;
  }

  jQuery(window).bind('hashchange', function(ev) {
    // TODO DEBUG REMOVE
    dump('--->>> hashchange event\n');
    dump('window.location.hash = '+ window.location.hash +'\n');
    var key, val
      , new_state = ev.getState()
      , changes = []
      ;

    for (key in new_state) {
      if (Object.prototype.hasOwnProperty.call(new_state, key)) {
        val = new_state[key];

        // TODO DEBUG REMOVE
        dump(key +' : '+ val +'\n');

        if (!command_state[key]) {
          // TODO DEBUG REMOVE
          dump('updating state "'+ key +'"\n');
          command_state[key] = {};
          changes.push(update_state(key, val));
        }
        else if (command_state[key].encoded !== val) {
          // TODO DEBUG REMOVE
          dump('updating state "'+ key +'"\n');
          changes.push(update_state(key, val));
        }
      }
    }

    self.broadcast(changes);
  });

  return self;
};

SHARED.ViewControl = (function (window) {
function ViewControl(connection, cache, mapview, cache_expiration) {
  if(!(this instanceof ViewControl)) {
    return new ViewControl(connection, cache, mapview, cache_expiration);
  }

  this.connection = connection;
  this.cache = cache;
  this.cache_expiration = cache_expiration;
  this.mapview = mapview;
}

ViewControl.prototype = {};

// Override event handler.
ViewControl.prototype.show = function (entity) {
};

// Override event handler.
ViewControl.prototype.busy = function () {
};

ViewControl.prototype.start_timer = function () {
  if (typeof this.timer_id === 'number' || !this.key) {
    return;
  }

  var self = this;
  this.timer_id = window.setTimeout(function () {
    self.fetch(self.key);
  }, 22000);
};

ViewControl.prototype.reset_timer = function () {
  this.stop_timer();
  this.start_timer();
};

ViewControl.prototype.stop_timer = function () {
  window.clearTimeout(this.timer_id);
  this.timer_id = false;
};

ViewControl.prototype.receive_entity = function (entity) {
  var view = this.mapview(entity('key'), entity('entity'));
  this.entity = {
      fn: entity
    , data: view.entity
    , view: view.view
    , pointer: view.pointer
    , original: entity('original')
  };
  this.key = entity('key');
};

ViewControl.prototype.fetch = function (key) {
  var self = this;
  this.cache(this.connection('id'), function(transaction) {
    var entity = transaction.get(key);
    if (entity) {
      if (entity('original') !== self.entity.orginal &&
          entity('key') === self.requested_key) {
        self.receive_entity(entity);
        self.show(self.entity.view);
      }
      self.start_timer();
      transaction.close();
      return;
    }
    self.busy();
    self.connection('get', key, function (entity) {
      if (entity && entity[0]) {
        if (entity[0]('original') !== self.entity.orginal &&
            entity[0]('key') === self.requested_key) {
          self.receive_entity(entity[0]);
          self.show(self.entity.view);
          transaction.put(key, self.entity.fn, self.cache_expiration);
        }
      }
      else {
        self.show(null);
      }
      self.start_timer();
      transaction.close();
    });
  });
};

ViewControl.prototype.open = function (key) {
  this.stop_timer();
  this.key = null;
  this.requested_key = key;
  this.entity = {};
  this.fetch(key);
  this.in_focus = true;
};

ViewControl.prototype.focus = function () {
  if (this.in_focus || !this.key) {
    return;
  }
  this.stop_timer();
  this.fetch(this.key);
};

ViewControl.prototype.blur = function () {
  if (!this.in_focus) {
    return;
  }
  this.stop_timer();
  this.in_focus = false;
};

ViewControl.prototype.update = function (path, val) {
  var parts = path.split('.'), field = parts.pop();
  this.entity.pointer[parts.join('.')][field] = val;
  this.entity.fn('update', this.entity.data);
  this.reset_timer();
};

return ViewControl;
}(window));


