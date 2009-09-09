Components.utils.import("resource://crownconstruction/modules/toolkit.js");
Components.utils.import("resource://crownconstruction/modules/launch.js");
Components.utils.import("resource://crownconstruction/modules/db.js");
Components.utils.import("resource://crownconstruction/modules/log.js");

function onWindowLoad(e)
{
  // global init
  try {
    launch();
  } catch(e) {
    Cu.reportError(e);
    alert("Fatal: Could not initialize Crown Construction ERM."+
        " Please contact Kris to fix this problem.");
    return true;
  }

  logger = log.getLogger("main_menu");

  try {
    db.loadCache();
  } catch(e) {
    Cu.reportError(e);
    logger.error(e);
    alert("Fatal: Could not load the Crown Construction ERM database."+
        " Please contact Kris to fix this problem.");
    return true;
  }

  $("new-customer").onclick = onNewCustomer;
  $("new-employee").onclick = onNewEmployee;
}

function onNewCustomer(e)
{
  e.preventDefault();

  let customer = db.createNew("Customer");
  let url = page.createRepURL(e.target.href, customer.uri);
  tk.openNewTab(url);
}

function onNewEmployee(e)
{
  e.preventDefault();

  let employee = db.createNew("Employee");
  let url = page.createRepURL(e.target.href, employee.uri);
  tk.openNewTab(url);
}

window.addEventListener("load", onWindowLoad, false);
