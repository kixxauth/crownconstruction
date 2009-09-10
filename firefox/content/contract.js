Components.utils.import("resource://crownconstruction/modules/toolkit.js");
Components.utils.import("resource://crownconstruction/modules/db.js");

function onWindowLoad(e)
{
  createEmployeeSelectList({
    salesperson:[$("salesperson")],
    estimator:[$("estimator")],
    production:[$("production")]
  });
}

function onAddJob(payment)
{
}

function onAddSpecialOrder()
{
}

function onAddContractor()
{
}

function onAddPermit()
{
}

function buildHeader(contract)
{
  if(contract.Salesperson)
    setEmployeeSelectList($("salesperson"), contract.Salesperson.uri);

  if(contract.Estimator)
    setEmployeeSelectList($("estimator"), contract.Estimator.uri);

  if(contract.Production)
    setEmployeeSelectList($("production"), contract.Production.uri);
}

function setContractInfo(contract)
{
  setCustomerInfo(contract);
  setContractDates(contract);
  setCosts(contract);
}

function setJobInfo(contract)
{
  if(!contract.Job)
    return;
}

function setSpecialOrders(contract)
{
  if(!contract.SpecialOrder)
    return;
}

function setSubContractors(contract)
{
  if(!contract.SubContractor)
    return;
}

function setPermits(contract)
{
}

function setEstimateInfo(contract)
{
}

function setCustomerInfo(contract)
{
  let customer = db.get(contract.customer);
}

function setCustomerPeople(customer)
{
  if(customer.Person) {
    customer.Person.forEach(function setAddress(key) {
        let ent = db.get(key);
        $("customer-people").appendChild(P([
            SPAN(ent.firstname || ""), BR(),
            SPAN(ent.lastname || ""), BR()
          ]));
      });
  }
}

function setCustomerAddresses(customer)
{
  if(customer.Address) {
    customer.Address.forEach(function setAddress(key) {
        let ent = db.get(key);
        $("customer-addresses").appendChild(P([
            SPAN(ent.label || ""), BR(),
            SPAN(ent.street || ""), BR(),
            SPAN(ent.addStreet || ""), BR(),
            SPAN(ent.city || ""), BR(),
            SPAN(ent.state || ""), BR(),
            SPAN(ent.zip || ""), BR()
          ]));
      });
  }
}

function setCustomerContacts(customer)
{
  if(customer.Phone) {
    $("customer-contacts").appendChild(P("Phone numbers:"));
    customer.Phone.forEach(function setPhone(key) {
        let phone = db.get(key);
        $("customer-contacts").appendChild(P([
            SPAN(phone.label || ""),
            SPAN(phone.phonenumber || "")
          ]));
      });
  }

  if(customer.Email) {
    $("customer-contacts").appendChild(P("Email addresses:"));
    customer.Email.forEach(function setEmail(key) {
        let email = db.get(key);
        $("customer-contacts").appendChild(P([
            SPAN(email.label || ""),
            SPAN(email.email || "")
          ]));
      });
  }
}

function setContractDates(contract)
{
  $("contractDate").value = contract.contractDate || "";
  $("startDate").value = contract.startDate || "";
  $("completeDate").value = contract.completeDate || "";
}

function setCosts(contract)
{
  $("contractCost").value = contract.cost || "";
  $("estimatedGP").value = contract.estimatedGP || "";
  $("taxLabor").value = contract.taxlabor || "";
}

// element is the select element and key is the key().uri
function setEmployeeSelectList(element, key)
{
  let opts = Iterator(element.getOptions());
  for(let [i, op] in opts) {
    if(op.value == key) {
      element.setSelectedIndex(i);
      return;
    }
  }
}

// lists is an object of the form:
// {'categoryName':[element,..],...}
function createEmployeeSelectList(lists)
{
  function query(ent, key)
  {
    if(key.kind != "Employee")
      return;
    if(!ent.category || !ent.category.length)
      return;

    ent.category.forEach(function queryCategory(cat)
      {
        if(!(cat in lists))
          return;

        lists[cat].forEach(function setItem(element)
          {
            let item = OPTION({value: key.uri},
              ent.firstname +" "+ ent.lastname);
            element.appendChild(item);
          });
      });
  }
  iterDBCache(query);
}

function iterDBCache(callback)
{
  let cache = Iterator(db.cache);
  for(let [i, ent] in cache)
    callback(ent, ent.key());
}

window.addEventListener("load", onWindowLoad, false);

/* Handle window load event */
  // get the contract entity uri from URL
  // call routine to construct the form

/* Construct this page/form */
  // get the entity from db by uri
  // Build form header -> pass contract entity
  // Build contract info section -> pass contract entity
  // Build job info section -> pass contract entity
  // Build events section -> pass contract entity
  // Build special orders section -> pass contract entity
  // Build subcontractors section -> pass contract entity
  // Build descriptions section -> pass contract entity
  // Build permits section -> pass contract entity
  // Build estimate info section -> pass contract entity

/* Build form header section */
  // get DOM element and result set for salesperson input
  // set auto complete text field for salesperson
  // get DOM element and result set for estimator input
  // set auto complete text field for estimator
  // get DOM element and result set for production input
  // set auto complete text field for production

/* Build contract info section */
  // build customer info subsection -> pass customer entity
  // build payment schedule subsection -> pass paymentSchedule array
  // set contract date with string input factory function
  // set contract start by date with string input factory function
  // set contract complete by date with string input factory function
  // set contract cost with string input factory function
  // set labor cost todo: calculated?
  // set estimated GP with string input factory function
  // set tax labor with string input factory function

/* Build customer info subsection */
  // for each person in customer entity:
    // build person subsection -> pass person
    // append person DOM to person DOM root
  // for each address in customer entity:
    // build address subsection -> pass address
    // append address DOM to address DOM root.
  // for each phone in customer entity:
    // build phone subsection -> pass phone
    // append phone DOM to contacts DOM root
  // for each email in customer entity:
    // build email subsection -> pass email
    // append email DOM to contacts DOM root

/* Build person subsection */
  // create a root DOM entity
  // create static text nodes for lastname and firstname
  // and append them to the root person DOM entity
  // return the root person DOM entity

/* Build address subsection */
  // create a root DOM entity
  // create static text nodes for street, additional, city, state and zip
  // with proper fomatting and append them to the root address DOM element 
  // return the root address DOM element

/* Build phone subsection */
  // create a root DOM entity
  // create static text nodes for number and desc
  // with formatting and append them to the root phone DOM element
  // return the root phone DOM element

/* Build email subsection */
  // create a root DOM entity
  // create static text nodes for email and desc
  // with formatting and append them to the root email DOM element
  // return the root email DOM element

/* Build payment schedule subsection */
  // for each passed paymentSchedule item:
    // create the DOM root element with static text DOM nodes appended
    // for memo and amount properties;
    // append element to paymentSchedule root node

/* Build job info section */
  // for each job in the passed contract entity:
    // create the DOM root element with static text DOM nodes appended
    // for number, type, retail, foreman, manDays
    // append element to jobs root node

/* Build events section */
  // if there is a handoff event:
    // set scheduled date with string input factory function
    // if there is a completion date:
      // set completion date with string input factory function
  // if there is a walkthrough event:
    // set scheduled date with string input factory function
    // if there is a completion date:
      // set completion date with string input factory function

/* Build special orders section */
  // for each special order on contract entity:
    // build special order element
    // set string input with input factory function for each special order property
    // append special order element to root special orders element

/* Build subcontractors section */
  // for each subcontractor order on contract entity:
    // build subcontractor order element
    // set string input with input factory function for each special order property
    // append subcontractor order element to root subcontractor orders element

/* Build descriptions section */
  // if there is a siding job description:
    // for each siding job description property:
      // set string input with input factory function
  // if there is a roofing job description:
    // for each roofing job description property:
      // set string input with input factory function

/* Build permits section */
  // set string input with factory functin for t/o
  // set string input with factory functin for ufpo
  // set string input with factory functin for building
  // set string input with factory functin for electrical 
  // set string input with factory functin for plumbing 

/* Build estimate info section */
  // set string input with factory functin for each estimate info property
