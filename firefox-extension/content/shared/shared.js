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

SHARED.spinner = (function () {
  var opened = {};

  return function (name, target, spinner) {
    if (!target || !spinner) {
      opened[name].target.css('opacity', 1);
      opened[name].spinner.hide();
      return;
    }

    var coords = target.offset()
      , x = (target.width() / 2) + coords.left
      , y = (target.height() / 2) + coords.top
      ;

    target.css('opacity', 0);
    spinner
      .css({
          position: 'absolute'
        , top: y - 8
        , left: x - 8
      })
      .show()
      ;
    opened[name] = {target: target, spinner: spinner};
  };
}());

SHARED.ViewControl = (function (window) {
function ViewControl(spec) {
  if(!(this instanceof ViewControl)) {
    return new ViewControl(spec);
  }

  this.connection = spec.connection;
  this.connection_id = spec.connection('id');
  this.log = spec.logging.get('View_Control:'+ spec.name);
  this.cache = spec.cache;
  this.cache_expiration = spec.cache_expiration;
  this.mapview = spec.mapview;
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

    self.connection('get', self.key, function (entity, err) {
      try {
        self.log.trace('got remote response: '+
          Object.prototype.toString.call(entity));
        if (entity && entity[0]) {
          transaction.put(self.key, entity[0], self.cache_expiration);
          if (entity[0]('original') !== self.entity.fn('original')) {
            self.log.trace('resetting entity');
            self.receive_entity(entity[0]);
            self.show(self.key, self.entity.view);
          }
          else {
            self.log.trace('entity has not changed');
          }
        }
        else if (entity && entity[0] === null) {
          self.log.trace('entity does not exist');
          self.log.error('This is an unexpected situation.');
        }
        else {
          self.log.trace('connection error');
          self.log.debug(err);
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
      return;
    }
    self.log.trace('getting entity remotely');
    self.connection('get', key, function (entity, err) {
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
        else if (entity && entity[0] === null) {
          self.log.trace('entity does not exist');
          self.show(self.key, null);
        }
        else {
          self.log.trace('connection error');
          self.log.debug(err);
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

ViewControl.prototype.create = function (kind, data) {
  this.log.trace('called create()');
  this.stop_timer();
  this.key = null;
  this.entity = {};
  this.in_focus = true;

  var self = this
    , entity = this.connection('create', kind);

  if (data) {
    entity('update', data);
  }
  this.receive_entity(entity);

  this.cache(this.connection_id, function(transaction) {
    try {
      transaction.put(self.key, self.entity.fn, self.cache_expiration);
      self.newly_created = true;
      self.show(self.key, self.entity.view);
    }
    catch (e) {
      self.log.error(e);
    }
    finally {
      transaction.close();
    }
  });
};

ViewControl.prototype.focus = function () {
  this.log.trace('called focus()');
  if (this.in_focus || !this.key) {
    return;
  }
  if (!this.newly_created) {
    this.start_timer();
  }
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

ViewControl.prototype.append = function (field) {
  this.entity.fn('update', field);
  this.receive_entity(this.entity.fn);
  return this.entity.view;
};

ViewControl.prototype.commit = function () {
  var self = this;
  return function (info) {
    self.log.trace('called commit(); info.keys '+ info.keys);
    if (info.keys.indexOf(self.key) !== -1 && self.in_focus) {
      self.reset_timer();
      self.newly_created = false;
    }
  };
};

return ViewControl;
}(window));

/*
function ViewModule(spec) {
  if (!(this instanceof ViewModule)) {
    return new ViewModule(spec);
  }
  this.name = spec.name;
  this.jq = spec.jQuery;
  this.cache = spec.db.cache;
  this.cache_exp = spec.db.expiration;
  this.logging = spec.logging;
  this.log = this.logging.get(this.name +'_ViewModule')
  this.viewControl = ViewControl(spec.db.connection
                           , this.cache
                           , spec.db.mapview
                           , this.cache_exp
                           , this.logging);
  spec.eventsMod.addListener('db.committed', this.viewControl.commit());
  this.commands = spec.commands;
  this.tabset = spec.tabset;
  this.panels = spec.panels;
}

ViewModule.prototype = {};

ViewModule.prototype.init = function (spec) {
  var self = this
    , currently_showing
    ;

  this.jq_tabpanel = jq('#'+ spec.tabpanel);
  this.jq_view = jq('#'+ spec.tabpanel +'-view');

  this.jq('input.fform', jq_view[0])
    .live('keyup', function (ev) {
      // TODO: Validation
      self.viewControl.update(this.name, this.value);
    });

  this.jq('a.fform.append', jq_view[0])
    .live('click', function (ev) {
      var field = {}
        , name = jq(this).attr('href')
        , view
        ;

      field[name] = control.entity.data[name];
      field[name].push({});
      view = self.viewControl.append(field);
      self.template[name](view[name]);
      return false;
    });

  spec.commandSet.bind('commandstate', function (state) {
    var panel = (state.panels || $N).state
      , state = (state.customers || $N).state
      ;

    if (panel === self.name && state === 'view') {
      self.log.trace('focus viewControl');
      self.viewControl.focus();
    }
    else {
      self.log.trace('blur viewControl');
      self.viewControl.blur();
    }
  });

  jq.commandControl.bind(this.name, function (command, params) {
    self.log.trace('got command "'+ command +'"');
    switch (command) {
    case 'view':
      if (params.key !== currently_showing) {
        self.viewControl.show = show;
        self.viewControl.open(params.key);
      }
      self.tabset.show(self.name);
      self.panels(self.name +'-view');
      break;
    case 'create':
      break;
    }
  });
};
*/

