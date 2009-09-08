Components.utils.import("resource://crownconstruction/modules/toolkit.js");
Components.utils.import("resource://crownconstruction/modules/db.js");

function onWindowLoad(e)
{
  $("new-customer").onclick = onNewCustomer;
}

function onNewCustomer(e)
{
  e.preventDefault();

  let customer = db.createNew("Customer");
  let url = page.createRepURL(e.target.href, customer.uri);
  tk.openNewTab(url);
}

window.addEventListener("load", onWindowLoad, false);
