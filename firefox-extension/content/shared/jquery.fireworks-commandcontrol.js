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
window: false,
jQuery: false,
*/

"use strict";

(function (jq, window, Object) {
  var command_state = {}
    , jq_parent = jq(window)
    , jq_elements = {}

    , has = Object.prototype.hasOwnProperty

    , options = {
        prefix: 'cmd-'
      }
    ;

  jq.fn.commandSet = function (selector) {
    var index = options.prefix.length;
    jq_parent = this;
    jq_elements = {};
    this.children(selector).each(function () {
      var id = typeof this.id === 'string' ? this.id : options.prefix;
      jq_elements[id.slice(index)] = jq(this);
    });
    return this;
  };

  function update_state(key, val) {
    var parts = val.split('?')
      , state = parts[0]
      , params = jq.deparam.querystring(parts[1], true)
      ;
    command_state[key] = {state:state, params:params, encoded: val};
    return [state, params, val];
  }

  function confirm_object(x) {
    if (jq.isPlainObject(x)) {
      return x;
    }
    var key = x;
    x = {};
    x[key] = arguments[1];
    return x;
  }

  function pushState(state, url) {
    jq.bbq.pushState(confirm_object(state, url));
  }

  function get() {
    var rv = {};
    // Return a copy.
    jq.extend(true, rv, command_state);
    return rv;
  }

  function broadcast(state) {
    dump('broadcast command state\n');
    state = confirm_object(state, arguments[1]);
    var key, val, new_state, changes = [];

    for (key in state) {
      if (has.call(state, key)) {
        val = state[key];
        dump('command: '+ key +'\n');
        dump('value: '+ val +'\n');

        command_state[key] = command_state[key] || {};
        if (command_state[key].encoded !== val) {
          changes.push(key);
          new_state = update_state(key, val);
          dump('dispatching: '+ new_state[0] +'\n');
          if (jq_elements[key]) {
            dump('triggering commandcontrol\n');
            jq_elements[key]
              .triggerHandler('commandcontrol', new_state)
              ;
          }
        }
      }
    }
    jq_parent.triggerHandler('commandstate', [command_state, changes]);
  }

  function settings(spec, val) {
    jq.extend(options, confirm_object(spec, val));
  }

  function bind(command, fn) {
    if (typeof fn === 'function' && jq_elements[command]) {
      jq_elements[command].bind('commandcontrol', fn);
    }
  }

  function unbind(command, fn) {
    if (typeof fn === 'function' && jq_elements[command]) {
      jq_elements[command].unbind('commandcontrol', fn);
    }
  }

  jq.commandControl = {
      broadcast: broadcast
    , get: get
    , push: pushState
    , settings: settings
    , bind: bind
    , unbind: unbind
  };

  jq(function (jq) {
    jQuery(window).bind('hashchange', function(ev) {
      dump('!hashchange event:'+ window.location.hash +'\n');
      broadcast(ev.getState());
    });
  });
}(jQuery, window, Object));
