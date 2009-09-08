let EXPORTED_SYMBOLS = ["launch"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://crownconstruction/modules/toolkit.js");
Cu.import("resource://crownconstruction/modules/log.js");
Cu.import("resource://crownconstruction/modules/configs.js");

let _burning = false;

function launch()
{
  if(_burning)
    return;

  log.initLogging();
}
