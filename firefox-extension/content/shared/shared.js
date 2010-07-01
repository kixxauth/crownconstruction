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

SHARED.throw_error = function (log) {
  return function (e) {
    log.error(e);
    alert(e);
    throw e;
  };
};

SHARED.CommandControl = function (jQuery, throw_error) {
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
      try {
      registry[namespace][command][i].call(null, args);
      }
      catch (e) {
        throw_error(e);
      }
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
      try {
        observers[i](command_state);
      }
      catch (e) {
        throw_error(e);
      }
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
function ViewControl(connection, cache, mapview, cache_expiration, logging) {
  if(!(this instanceof ViewControl)) {
    return new ViewControl(
      connection, cache, mapview, cache_expiration, logging);
  }

  this.connection = connection;
  this.connection_id = connection('id');
  this.log = logging.get('View_Control');
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
  this.log.trace('called start_timer()');
  if (typeof this.timer_id === 'number') {
    this.log.trace('NOT starting timer');
    return;
  }

  this.log.trace('starting timer');
  var self = this;
  this.timer_id = window.setTimeout(function () {
    self.log.trace('expired');
    self.timer_id = false;
    self.refresh();
  }, 22000);
};

ViewControl.prototype.reset_timer = function () {
  this.log.trace('called reset_timer()');
  this.stop_timer();
  this.start_timer();
};

ViewControl.prototype.stop_timer = function () {
  this.log.trace('called stop_timer()');
  window.clearTimeout(this.timer_id);
  this.timer_id = false;
};

ViewControl.prototype.receive_entity = function (entity) {
  this.log.trace('called receive_entity()');
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

ViewControl.prototype.refresh = function() {
  this.log.trace('called refresh()');
  if (!this.key) {
    this.log.trace('no key');
  }

  var self = this;
  this.cache(this.connection_id, function(transaction) {
    var entity = transaction.get(self.key);
    if (entity) {
      self.log.trace('got entity from cache');
      self.start_timer();
      transaction.close();
      return;
    }

    self.connection('get', self.key, function (entity) {
      try {
        self.log.trace('got remote response: '+
          Object.prototype.toString.call(entity));
        if (entity && entity[0]) {
          transaction.put(self.key, entity[0], self.cache_expiration);
          if (entity[0]('original') !== self.entity.original) {
            self.log.trace('resetting entity');
            self.receive_entity(entity[0]);
            self.show(self.key, self.entity.view);
          }
          else {
            self.log.trace('entity has not changed');
          }
        }
        else {
          self.log.trace('entity does not exist');
          self.show(self.key, null);
        }
        self.start_timer();
      }
      catch (e) {
        self.log.error(e);
      }
      finally {
        transaction.close();
      }
    });
  });
};

ViewControl.prototype.open = function (key) {
  this.log.trace('called open()');
  this.stop_timer();
  this.key = null;
  this.entity = {};
  this.in_focus = true;

  var self = this;

  this.cache(this.connection_id, function(transaction) {
    var entity = transaction.get(key);
    if (entity) {
      self.log.trace('got entity from cache');
      self.receive_entity(entity);
      self.show(self.key, self.entity.view);
      self.start_timer();
      transaction.close();
      return
    }
    self.log.trace('getting entity remotely');
    self.connection('get', key, function (entity) {
      try {
        self.log.trace('got remote response: '+
          Object.prototype.toString.call(entity));
        if (entity && entity[0]) {
          self.log.trace('resetting entity');
          self.receive_entity(entity[0]);
          self.show(self.key, self.entity.view);
          transaction.put(
              key
            , self.entity.fn
            , self.cache_expiration
          );
        }
        else {
          self.log.trace('entity does not exist');
          self.show(self.key, null);
        }
        self.start_timer();
      }
      catch (e) {
        self.log.error(e);
      }
      finally {
        transaction.close();
      }
    });
    self.busy();
  });
};

ViewControl.prototype.focus = function () {
  this.log.trace('called focus()');
  if (this.in_focus || !this.key) {
    return;
  }
  this.stop_timer();
  this.refresh(this.key);
  this.in_focus = true;
};

ViewControl.prototype.blur = function () {
  this.log.trace('called blur()');
  if (!this.in_focus) {
    return;
  }
  this.stop_timer();
  this.in_focus = false;
};

ViewControl.prototype.update = function (path, val) {
  this.log.trace('called update()');
  var parts = path.split('.'), field = parts.pop();
  this.entity.pointer[parts.join('.')][field] = val;
  this.entity.fn('update', this.entity.data);
};

ViewControl.prototype.commit = function () {
  var self = this;
  return function (info) {
    self.log.trace('called commit() info.keys '+ info.keys);
    if (info.keys.indexOf(self.key) !== -1) {
      self.reset_timer();
    }
    else {
      self.log.trace('Current entity is not in changeset.');
    }
  };
};

return ViewControl;
}(window));


