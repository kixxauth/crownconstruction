let EXPORTED_SYMBOLS = ["log"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://crownconstruction/modules/toolkit.js");
Cu.import("resource://crownconstruction/modules/log4moz.js");
Cu.import("resource://crownconstruction/modules/configs.js");

const LOG_FILE = "crownconstruction.log";

let _loggers = {};
let _burning = false;

let log =
{
  getLogger: function(name)
  {
    if(!_burning) {
      throw new Error("log.initLogging() was not called before a call"+
          " to log.getLogger().");
    }

    if(name in _loggers)
      return _loggers[name];

    let logger = Log4Moz.repository.getLogger(name);
    logger.level = Log4Moz.Level["All"];
    _loggers[name] = logger;
    return logger;
  },

  initLogging: function()
  {
    if(_burning)
      return;

    let formatter = new BasicFormatter();
    let root = Log4Moz.repository.rootLogger;

    let debug = configs.get("debug");

    let level = null;

    if(debug)
      level = "All";
    else
      level = configs.get("log-level");

    //tk.dump("loglevel", level);

    if(!(level in Log4Moz.Level))
    {
      Cu.reportError("Logging level '"+ level +"' is not supported;"+
          " Falling to default level 'Error'.");
      Cc["@mozilla.org/consoleservice;1"].
        getService(Ci.nsIConsoleService).
        logStringMessage("Recommending reset log level in preferences.");

      level = "Error";
    }

    root.level = Log4Moz.Level[level];

    // A console appender outputs to the JS Error Console
    let capp = new Log4Moz.ConsoleAppender(formatter);
    capp.level = Log4Moz.Level["Warn"];
    root.addAppender(capp);

    if(debug)
    {
      // A dump appender outputs to standard out
      let dapp = new Log4Moz.DumpAppender(formatter);
      dapp.level = Log4Moz.Level["Debug"];
      root.addAppender(dapp);
    }

    let _logFile = Cc["@mozilla.org/file/directory_service;1"].
      getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
    _logFile.append(LOG_FILE);
    if(!_logFile.exists())
      _logFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0644);

    // A rotating file appender outputs to a rotating file on disk 
    // This is for a 200kb file
    let fapp = new Log4Moz.RotatingFileAppender(_logFile,
        formatter, 1024 * 200);
    fapp.level = Log4Moz.Level["All"];
    root.addAppender(fapp);

    _burning = true;
  }
};

function BasicFormatter(dateFormat) {
  if (dateFormat)
    this.dateFormat = dateFormat;
}
BasicFormatter.prototype = {

  _dateFormat: null,

  get dateFormat() {
    if (!this._dateFormat)
      this._dateFormat = "%Y-%m-%d %H:%M:%S";
    return this._dateFormat;
  },

  set dateFormat(format) {
    this._dateFormat = format;
  },

  format: function BF_format(message) {
    let date = new Date(message.time);

    // Pad a string to a certain length (12) with a character (space)
    let pad = function BF__pad(str, len, chr) str +
      new Array(Math.max((len || 14) - str.length + 1, 0)).join(chr || " ");

    return date.toLocaleFormat(this.dateFormat) + "  " +
      pad(message.levelDesc, 6) +"  "+ pad(message.loggerName) +
      "  "+ message.message + "\n";
  }
};
