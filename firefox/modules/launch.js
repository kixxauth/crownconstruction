let EXPORTED_SYMBOLS = ["launch"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://crownconstruction/modules/toolkit.js");
Cu.import("resource://crownconstruction/modules/log.js");
Cu.import("resource://crownconstruction/modules/configs.js");
Cu.import("resource://crownconstruction/modules/db.js");

let _burning = false;

function launch()
{
  if(_burning)
    return;

  log.initLogging();

  let logger = log.getLogger("launch");

  try {
    db.launch();
  } catch(e) {
    logger.error(e);
    throw e;
  }
}
