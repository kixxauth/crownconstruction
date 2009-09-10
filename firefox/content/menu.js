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

  loadCustomerList();
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

function onNewContract(e)
{
  e.preventDefault();

  let contract = db.createNew("Contract");
  let url = page.createRepURL(e.target.href, contract.uri);
  tk.openNewTab(url);
}

function onOpenCustomer(e)
{
  e.preventDefault();
  let uri = e.target.getAttribute("value");
  let url = page.createRepURL(e.target.href, uri);
  tk.openNewTab(url);
}

function onCreateContract(e)
{
  let uri = e.target.getAttribute("value");
  alert(uri);
}

function loadCustomerList()
{
  let customers = [];
  iterDBCache(function(key) {
      if(key.kind != "Customer")
        return;

      let customer = db.get(key);
      let person = db.get(customer.Person[0]);

      customers.push({
          name: person.lastname +", "+ person.firstname,
          uri: key.uri
        });
    });

  customers.sort(function(a, b) {
      if(a.name.toUpperCase() > b.name.toUpperCase())
        return 1;
      return -1;
    });

  let list = $("customer-list");
  list.innerHTML = "";
  let cust = Iterator(customers);
  for(let [i, customer] in cust)
  {
    let name = A(
        {href:"chrome://crownconstruction/content/customer.xhtml",
        value: customer.uri},
        customer.name);
    name.onclick = onOpenCustomer;

    let contract = SPAN({class: "clickme little",
        value: customer.uri}, "create contract");
    contract.onclick = onCreateContract;

    let li = LI([name, contract]);
    list.appendChild(li);
  }
}

function iterDBCache(callback)
{
  let cache = Iterator(db.cache);
  for(let [i, ent] in cache) {
    callback(ent.key());
  }
}

window.addEventListener("load", onWindowLoad, false);
