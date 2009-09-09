Components.utils.import("resource://crownconstruction/modules/toolkit.js");
Components.utils.import("resource://crownconstruction/modules/launch.js");
Components.utils.import("resource://crownconstruction/modules/db.js");

function onWindowLoad(e)
{
  // global init
  launch();
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
