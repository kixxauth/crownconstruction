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
newcap: true,
immed: true */

/*members "@mozilla.org\/file\/directory_service;1", All, 
    ConsoleAppender, Debug, DumpAppender, Error, Formatter, Level, 
    NORMAL_FILE_TYPE, RotatingFileAppender, Warn, addAppender, append, 
    callee, classes, constructor, create, debug, exists, format, get, 
    getLogger, getService, hasOwnProperty, id, import, interfaces, join, 
    length, level, levelDesc, loggerName, max, message, nsIFile, 
    nsIProperties, removeAppender, repository, require, rootLogger, 
    setLevel, time, toLocaleFormat, utils
*/

/*global
Components: false
*/

"use strict";

// For Mozilla JavaScript modules system.
var EXPORTED_SYMBOLS = ["exports"];

// If we are in the Mozilla module system we need to add some boilerplate to be
// CommonJS complient. This is obviously an ugly hack to allow integration with
// legacy code that uses the Mozilla module system.
if (Components) {
  var require = Components.utils.import(
        "resource://crownconstruction/modules/boot.js", null).require;
  var exports = {};
  var module = {id: "logging"};
}

var Cc = Components.classes,
    Ci = Components.interfaces,
    Cu = Components.utils,
    LOG_FILE = "crownconstruction.log",
    log4moz = Cu.import(
        "resource://crownconstruction/modules/log4moz.js", null),
    LOGGERS = {},
    LEVEL = log4moz.Level.Error,
    SET_LEVEL,
    ROOT_LOGGER = log4moz.repository.rootLogger,
    DUMP_APPENDER;

function formatter_constructor(dateFormat) {
  var self = new log4moz.Formatter();

  dateFormat = dateFormat || "%Y-%m-%d %H:%M:%S";

  function pad(str, len, chr) {
    var parts = new Array(Math.max((len || 14) - str.length + 1, 0));
    return str + parts.join(chr || " ");
  }

  self.format = function formatter_format(message) {
    var d = new Date(message.time);

    return d.toLocaleFormat(dateFormat) +"  "+
      pad(message.levelDesc, 6) +"  "+
      pad(message.loggerName) +"  "+
      message.message +"\n";
  };

  self.constructor = arguments.callee;
  return self;
}

// Fatal, Error, Warn, Info, Config, Debug, Trace, All
exports.getLogger = function pub_get_logger(name, level) {
  var logger = log4moz.repository.getLogger(name);

  if (LOGGERS[name]) {
    return LOGGERS[name];
  }

  level = level || "All";
  logger.level = log4moz.Level[level];
  LOGGERS[name] = logger;
  return logger;
};

exports.setLevel = function pub_set_level(level) {
  if (!log4moz.Level.hasOwnProperty(level)) {
    throw new Error("Logging level '"+ level +"' is not supported.");
  }
  LEVEL = log4moz.Level[level];
  SET_LEVEL = LEVEL;
};

exports.debug = function pub_debug(debug) {
  if (debug) {
    ROOT_LOGGER.addAppender(DUMP_APPENDER);
    SET_LEVEL = LEVEL;
    LEVEL = log4moz.Level.All;
  }
  else {
    ROOT_LOGGER.removeAppender(DUMP_APPENDER);
    LEVEL = SET_LEVEL;
  }
};

function init() {
  var formatter = formatter_constructor(),

      // A console appender outputs to the JS Error Console
      capp = new log4moz.ConsoleAppender(formatter),

      fapp,

      // A dump appender outputs to standard out
      DUMP_APPENDER = new log4moz.DumpAppender(formatter),

      log_file = Cc["@mozilla.org/file/directory_service;1"].
        getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);

  log_file.append(LOG_FILE);
  if(!log_file.exists()) {
    log_file.create(Ci.nsIFile.NORMAL_FILE_TYPE, 420);
  }

  // A rotating file appender outputs to a rotating file on disk 
  // This is for a 200kb file
  fapp = new log4moz.RotatingFileAppender(log_file, formatter, 1024 * 200);
  fapp.level = log4moz.Level.All;

  capp.level = log4moz.Level.Warn;
  DUMP_APPENDER.level = log4moz.Level.Debug;

  ROOT_LOGGER.level = LEVEL;
  ROOT_LOGGER.addAppender(capp);
  ROOT_LOGGER.addAppender(fapp);
}

init();

