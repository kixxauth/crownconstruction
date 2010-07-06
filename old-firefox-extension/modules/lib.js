let EXPORTED_SYMBOLS = [
    "assert",
    "getUUID",
    "getUTCDateTime"
  ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://crownconstruction/modules/configs.js");
Cu.import("resource://crownconstruction/modules/log.js");

function assert(condition, message)
{
  if(condition)
    return;

  let logger = log.getLogger("ASSERT");

  if(!configs.get("debug")) {
    logger.fatal(message);
    return;
  }

  let caller = arguments.callee.caller;
  let stackText = "Stack Trace: \n";
  let count = 0;
  while(caller)
  {
    stackText += count++ + ":" + caller.name + "(";
    for(let i = 0; i < caller.arguments.length; ++i) {
      let arg = caller.arguments[i];
      stackText += arg;
      if(i < caller.arguments.length - 1)
        stackText += ",";
    }
    stackText += ")\n";
    caller = caller.arguments.callee.caller;
  }

  var source = null;
  if (this.window)
    source = this.window;
  var ps = Cc["@mozilla.org/embedcomp/prompt-service;1"].
           getService(Ci.nsIPromptService);
  ps.alert(source, "Assertion Failed", message);
  dump("\n! ASSERTION FAILED:\n"+ stackText +"\n");

  throw new Error("ASSERTION FAILED: "+ message);
}

function getUUID()
{
  let gen = Cc["@mozilla.org/uuid-generator;1"]
      .getService(Ci.nsIUUIDGenerator);
  return gen.generateUUID().toString();
}

function getUTCDateTime()
{
  let d = new Date();
  let dt = [d.getUTCFullYear(),
      (d.getUTCMonth()+1).toString(),
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds()];
  return dt.join(":");
}
