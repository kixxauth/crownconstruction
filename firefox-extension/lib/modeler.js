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
Components: false
*/

"use strict";

dump(' ... modeler.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , util = require('util')
  , events = require('events')
  , md5 = require('hashlib').md5

  , confirmObject = util.confirmObject
  , isArray = util.isArray
  , isObject = util.isObject
  , has = util.has

  , property_constructors
  , map_model
  ;

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

property_constructors = {
  str: function string_property(opt) {
    opt = confirmObject(opt);
    return  {
      type: 'string'
    , def: (typeof opt.def === 'string') ? opt.def : ''
    , index: (typeof opt.index === 'function') ? opt.index : undefined
    };
  },

  num: function (opt) {
    opt = confirmObject(opt);
    var def = ((typeof opt.def === 'number' && !isNaN(opt.def)) ?
      opt.def : 0);
    return {
      type: 'number'
    , def: def
    , index: (typeof opt.index === 'function') ? opt.index : undefined
    };
  },

  bool: function (opt) {
    opt = confirmObject(opt);
    return {
      type: 'boolean'
    , def: (typeof opt.def === 'boolean') ? opt.def : false
    , index: (typeof opt.index === 'function') ? opt.index : undefined
    };
  },

  list: function (prop, opt) {
    opt = confirmObject(opt);
    return {
      type: 'list'
    , tree: prop
    , def: []
    , index: ((typeof opt.index === 'function') ? opt.index : null)
    };
  },

  dict: function (props, opt) {
    opt = isObject(opt) ? opt : {};
    return {
      type: 'dict'
    , def: {}
    , tree: props
    , index: ((typeof opt.index === 'function') ? opt.index : null)
    };
  }
};

// Returns a mutation function that takes the following params:
//   * `m` {object} The model object.
//   * `x` {object} The data object to model.
//   * `idx` {object} The index object to be updated.
//
// The data object will be mutated in place according to the model object
// definition.  The index object will also be mutated in place according to
// registered index functions.
map_model = (function () {
  var map_list, map_dict, gen_map, map_it;

  map_list = function (m, x, idx) {
    x = isArray(x) ? x : m.def;
    if (!x.length) {
      x[0] = m.tree.def;
    }

    return x.map(function (item) {
      return gen_map(m.tree, item, idx);
    });
  };

  map_dict = function (m, x, idx) {
    x = isObject(x) ? x : m.def;
    var p;

    for (p in m.tree) {
      if (has(m.tree, p)) {
        x[p] = gen_map(m.tree[p], x[p], idx);
      }
    }
    return x;
  };

  gen_map = function (m, x, idx) {
    var type = m.type, index_to;

    if (type === 'dict') {
      x = map_dict(m, x, idx);
    }
    else if (type === 'list') {
      x = map_list(m, x, idx);
    }
    else if (type === 'number') {
      x = (typeof x === 'number' ? x : m.def);
    }
    else if (type === 'string') {
      x = (typeof x === 'string' ? x : m.def);
    }
    else if (type === 'boolean') {
      x = (typeof x === 'boolean' ? x : m.def);
    }

    if (typeof m.index === 'function') {
      idx[index_to[0]] = idx[index_to[1]];
    }
    return x;
  };

  map_it = function (m, x, idx) {
    x = confirmObject(x);
    var p;
    for (p in m) {
      if (has(m, p)) {
        x[p] = gen_map(m[p], x[p], idx);
      }
    }
    return x;
  };

  return map_it;
}());

function Model(kind, constructor, username) {
  var model = constructor(property_constructors)
    , uid = uid_generator(username, md5)
    ;

  function mapper(data, index) {
    return map_model(model, data, index);
  }

  return function (key, ent, idx) {
    key = (typeof key === 'string') ? key : uid();
    ent = confirmObject(ent);
    idx = confirmObject(idx);
    idx.kind = kind;
    ent = map_model(model, ent, idx);

    return {key: key, data: ent, indexes: idx, mapper: mapper};
  };
}

exports.register = function(username, models) {
  var name, rv = {};

  for (name in models) {
    if (has(models, name)) {
      rv[name] = Model(name, models[name], username);
    }
  }
  return rv;
};


function load(cb) {
  events.enqueue(function () {
    cb('modeler', exports);
  }, 0);
}

