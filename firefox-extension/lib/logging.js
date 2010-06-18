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

dump('loading logging.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , levels = {
      fatal:  70
    , error:  60
    , warn:   50
    , info:   40
    , config: 30
    , debug:  20
    , trace:  10
    , all:    0

    , DESC: {
        70: 'FATAL'
      , 60: 'ERROR'
      , 50: 'WARN'
      , 40: 'INFO'
      , 30: 'CONFIG'
      , 20: 'DEBUG'
      , 10: 'TRACE'
      , 0:  'ALL'
      }
    }

  , replay_level = levels.error
  , current_level = levels.warn

  , set_current_level = function (level) {
      current_level = ((typeof levels[level] === 'number') ?
                       levels[level] : current_level);
    }

  , set_replay_level = function (level) {
      replay_level = ((typeof levels[level] === 'number') ?
                       levels[level] : replay_level);
    }

  , log_file_name = 'fireworks.log'

  , global_logger

  , console = require('platform').console
  , util = require('util')
  ;

function LoggingError(msg) {
  var self;
  if (msg instanceof Error) {
    self = msg;
  }
  else {
    self = new Error(msg);
  }
  self.name = "LoggingError";
  self.constructor = LoggingError;
  return self;
}

function format(name, level, msg) {
  var d = new Date().toLocaleFormat('%Y-%m-%d %H:%M:%S');
  return d +' '+ name +' '+ levels.DESC[level] +' '+ msg +'\n';
}

function logfile(msg) {
  var file = Cc["@mozilla.org/file/directory_service;1"]
               .getService(Ci.nsIProperties)
               .get("ProfD", Ci.nsIFile)

    , fos = Cc["@mozilla.org/network/file-output-stream;1"]
              .createInstance(Ci.nsIFileOutputStream)

    , flags = 0x02 | 0x08 | 0x10
    ;

  file.append(log_file_name);
  fos.init(file, flags, 0644, 0);
  try {
    fos.write(msg, msg.length);
    fos.close();
    if (file.fileSize < 1024 * 400 /* 400kb */) {
      return;
    }
    file.moveTo(file.parent, file.leafName.replace(/\.log$/, '_2.log'));
  } catch(e) {
    Components.utils.reportError(e);
  }
}

function logconsole(level, msg) {
  if (level >= levels.error) {
    Components.utils.reportError(msg);
  }
  else {
    console.log(msg);
  }
}

function logout(items) {
  var i = 0
    , len = items.length
    , msg = ''
    , formatted_msg
    ;
  for (; i < len; i += 1) {
    formatted_msg = format(items[i][0], items[i][1], items[i][2]);
    logconsole(items[i][1], formatted_msg);
    dump(formatted_msg);
    msg += formatted_msg;
  }
  logfile(msg);
}

global_logger = (function () {
  var rotator = [];

  return function (name, level, msg) {
    if (level >= replay_level) {
      rotator.unshift(['REPLAY', levels.info, 'START']);
      rotator.push(['REPLAY', levels.info, 'END']);
      rotator.push([name, level, msg]);
      logout(rotator);
      rotator = [];
      return;
    }

    rotator.push([name, level, msg]);
    if (rotator.length > 12) {
      rotator.shift();
    }

    if (level >= current_level) {
      logout([[name, level, msg]]);
    }
  };
}());

function logging_function(level) {
  return function (msg) {
    global_logger(this.name, level, msg);
  };
}

function Logger(name) {
  if (!(this instanceof Logger)) {
    return new Logger(name);
  }
  this.name = name;
}

Logger.prototype.fatal = logging_function(levels.fatal);
Logger.prototype.error = logging_function(levels.error);
Logger.prototype.warn = logging_function(levels.warn);
Logger.prototype.info = logging_function(levels.info);
Logger.prototype.config = logging_function(levels.config);
Logger.prototype.debug = logging_function(levels.debug);
Logger.prototype.trace = logging_function(levels.trace);

exports.get = function (name) {
  return Logger(name);
};

exports.dump = function (msg, val) {
  val = typeof val === 'undefined' ? '' : ' : '+ val;
  dump(msg + val +'\n');
};

exports.checkpoint = function (name, val) {
  exports.dump(' -> '+ name, val);
};

exports.inspect = function (name, x) {
  name = name || 'anonymous';
  exports.dump(name, util.prettify(x));
};

function load(cb) {
  require.ensure(['events', 'platform'], function (require) {
    var platform = require('platform')
      , events = require('events')
      , prefs_ready
      , locked = false
      , cached_level = current_level
      ;

    function debug_change(val) {
      if (val === true) {
        locked = val;
        cached_level = current_level;
        current_level = levels.all;
        return;
      }
      current_level = cached_level;
    }

    function level_change(level) {
      if (!locked) {
        current_level = level;
        return;
      }
      cached_level = level;
    }

    function setup(level_pref, debug_pref, replay_pref) {
      set_current_level(level_pref.value());
      set_replay_level(replay_pref.value());
      locked = !!debug_pref.value();

      level_pref.addListener(function () {
        level_change(this.value());
      });
      debug_pref.addListener(function () {
        debug_change(!!this.value());
      });
      replay_pref.addListner(function () {
        set_replay_level(this.value());
      });
    }

    prefs_ready = events.Aggregate(setup);
    try {
      platform.pref('log.level', prefs_ready(['pref']), 'warn');
      platform.pref('debug', prefs_ready(['pref']), false);
      platform.pref('log.replay', prefs_ready(['pref']), 'error');
    }
    catch (e) {
      events.trigger('error', e);
      events.trigger('error',
          LoggingError('Unable to read logging preferences.'));
    }

    cb('logging', exports);
  });
}

dump('loaded logging.js\n');
