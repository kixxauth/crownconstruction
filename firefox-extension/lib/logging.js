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
Components: false,
dump: false
*/

"use strict";

dump(' ... logging.js\n');

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
  , current_level = levels.info

  , set_current_level
  , set_replay_level

  , log_file_name = 'fireworks.log'

  , global_logger

  , console = require('platform').console
  , util = require('util')

  , LoggingError = require('errors')
                     .ErrorConstructor('LoggingError', 'logging')

    // Temporary logging until the module is loaded.
  , log = {
      trace: function (msg) {
               dump('> Booting Logger: '+ msg +'\n');
             }
    , error: function (msg) {
               dump('> Booting Logger: '+ msg +'\n');
             }
    }
  ;

// Format a log line.
function format(name, level, msg) {
  var d = new Date().toLocaleFormat('%Y-%m-%d %H:%M:%S');
  return d +' '+ name +' '+ levels.DESC[level] +' '+ msg +'\n';
}

// Log to a log file.
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
    log.trace('Writing to log file "'+ file.leafName +'"');
    fos.write(msg, msg.length);
    fos.close();
    if (file.fileSize < 1024 * 400 /* 400kb */) {
      return;
    }
    file.moveTo(file.parent, file.leafName.replace(/\.log$/, '_2.log'));
  } catch(e) {
    log.error(e);
    log.error('Problem with log file "'+ file.leafName +'"');
  }
}

// Log to the browser console.
function logconsole(level, msg) {
  if (level >= levels.error) {
    Components.utils.reportError(msg);
  }
  else {
    console.log(msg);
  }
}

// Write out the log.
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
  // The rotator contains a cache of log message that will be replayed if a log
  // level is triggered which is greate that replay_level.
  var rotator = [];

  return function (name, level, msg) {
    msg = util.isError(msg) ? exports.formatError(msg) : msg;

    if (level >= replay_level) {
      rotator.unshift(['REPLAY', levels.info, 'START']);
      rotator.push(['REPLAY', levels.info, 'END']);
      rotator.push([name, level, msg]);
      logout(rotator);
      rotator = [];
      return;
    }

    rotator.push([name, level, msg]);
    if (rotator.length > 24) {
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

// Logger object constructor.
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

// Get a new logger object.
exports.get = function (name) {
  return Logger(name);
};

// Dump utilities.
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

// Pretty print an error.
exports.formatError = function (e) {
  if (typeof e === 'string') {
    return e;
  }
  return (e.name +': '+ e.message +'; file: '+
          e.fileName +'; line: '+ e.lineNumber +'; trace: '+ e.stack);
};

log = exports.get('Logging');

set_current_level = function (level) {
  current_level = ((typeof level === 'string') ?
           (isNaN(+level) ? level : +level) :
           ((typeof levels[level] === 'number') ?
                   levels[level] : current_level));
  log.trace('Set log level to "'+ levels.DESC[current_level] +'".');
};

set_replay_level = function (level) {
  replay_level = ((typeof level === 'string') ?
           (isNaN(+level) ? level : +level) :
           ((typeof levels[level] === 'number') ?
                   levels[level] : current_level));
  log.trace('Set log replay level to "'+ levels.DESC[replay_level] +'".');
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
        log.trace('Going into debug mode.');
        locked = val;
        cached_level = current_level;
        set_current_level('all');
        return;
      }
      log.trace('Going out of debug mode.');
      set_current_level(cached_level);
    }

    function level_change(level) {
      if (!locked) {
        set_current_level(level);
        return;
      }
      cached_level = level;
    }

    function setup(level_pref, debug_pref, replay_pref) {
      log.trace('Setup.');
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
      log.debug(e);
      log.warn(LoggingError(new Error('Unable to read logging preferences.')));
    }

    cb('logging', exports);
  });
}

