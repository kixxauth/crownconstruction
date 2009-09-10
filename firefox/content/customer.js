Components.utils.import("resource://crownconstruction/modules/toolkit.js");
Components.utils.import("resource://crownconstruction/modules/db.js");

let Customer = null;
let People = [];
let Addresses = [];
let Phones = [];
let Emails = [];

const WARNING_PERSON_LASTNAME = "We can't save a person to a customer "+
  "file without a last name. If you don't intend to save this person, "+
  "then just erase the first name and try saving again.";

const WARN_NO_PEOPLE = "We can't save a customer file without any "+
  "people attached to it.  We'll need at least one last name to save.";

const WARNING_TRANSACTION_FAILED = "Well, this is embarassing, but there "+
  "has been an error while processing your save request. First, copy "+
  "all of your changes down to paper (or you can print this page), "+
  "because we will not be able to save them as they are. Then, go back "+
  "to the main menu, and press the refresh button before trying to "+
  "resubmit your changes.";

const OK_TRANSACTION = "Saved.";

function onWindowLoad(e)
{
  let uri = page.uriFromURL(window.location.href).uri;

  Customer = db.getKey(uri);
  let customer = db.get(Customer);
  addPeople(customer.Person);
  if(customer.Address)
    addAddresses(customer.Address);
  if(customer.Phone)
    addPhones(customer.Phone);
  if(customer.Email)
    addEmails(customer.Email);

  return true;
}

function onCancel()
{
  // todo: fix this so it returns user to the menu
  window.close();
}

function onClose()
{
  // todo: fix this so it returns user to the menu
  window.close();
}

function onSave()
{
  let people = collectPeople();
  //tk.dump("people", tk.dumpObject(people));
  if(!people || !people.length)
    return true;

  function apply(ent) {
    let k = ent.key;
    for(let p in ent) {
      if(p != "key")
        db.setattr(k, p, ent[p]);
    }
    return k;
  }

  db.setattr(Customer, "Person", [apply(i) for each(i in people)]);

  let addresses = collectAddresses();
  //tk.dump("addresses", tk.dumpObject(addresses));
  db.setattr(Customer, "Address", [apply(i) for each(i in addresses)]);

  let phones = collectPhones();
  //tk.dump("phones", tk.dumpObject(phones));
  db.setattr(Customer, "Phone", [apply(i) for each(i in phones)]);

  let emails = collectEmails();
  //tk.dump("email", tk.dumpObject(emails));
  db.setattr(Customer, "Email", [apply(i) for each(i in emails)]);

  //tk.dump("catch", tk.dumpObject(db.cache));
  db.commit("testPilot", "save customer", function(r)
    {
      if(!r) {
        warnUser(WARNING_TRANSACTION_FAILED, function() {
            // todo: this should bring the user back to the menu
            window.close();
          });
        return true;
      }
      warnUser(OK_TRANSACTION, function() {
          // todo: this should bring the user back to the menu
          window.close();
        });
      //tk.dump("transaction", tk.dumpObject(r));
    });
  return true;
}

function onAddPerson()
{
  addPerson(null);
}

function onAddAddress()
{
  addAddress(null);
}

function onAddPhone()
{
  addPhone(null);
}

function onAddEmail()
{
  addEmail(null);
}

function addPeople(people)
{
  people = people || [null];
  people.forEach(addPerson);
}

function addAddresses(addresses)
{
  addresses = addresses || [null];
  addresses.forEach(addAddress);
}

function addPhones(phones)
{
  phones = phones || [null];
  phones.forEach(addPhone);
}

function addEmails(emails)
{
  emails = emails || [null];
  emails.forEach(addEmails);
}

function addPerson(person)
{
  person = person ? db.get(person) : db.get(db.createNew("Person"));
  let lastname = person.lastname || "";
  let firstname = person.firstname || "";

  let fn = INPUT({class:"input", type: "text", value:firstname});
  let ln = INPUT({class:"input", type: "text", value:lastname});
  $("people").appendChild(DIV(P([
        SPAN({class:"label"}, "Firstname: "),
        fn,
        SPAN({class:"label"}, "Lastname: "),
        ln
      ])));
  People.push({key: person.key(), firstname: fn, lastname: ln});
}

function addAddress(address)
{
  address = address ? db.get(address) : db.get(db.createNew("Address"));
  let label = address.label || "";
  let street = address.street || "";
  let addStreet = address.additional || "";
  let city = address.city || "";
  let state = address.state || "";
  let zip = address.zip || "";

  let l = INPUT({class:"input", type: "text", value:label});
  let str = INPUT({class:"input", type: "text", value:street});
  let ast = INPUT({class:"input", type: "text", value:addStreet});
  let cty = INPUT({class:"input", type: "text", value:city});
  let st = INPUT({class:"input", size:10, type: "text", value:state});
  let z =  INPUT({class:"input", size:10, type: "text", value:zip});

  $("addresses").appendChild(DIV(
    [
      P([SPAN({class:"label"}, "Street:"), str]),
      P([SPAN({class:"label"}, "Apt/Suite:"), ast]),
      P([SPAN({class:"label"}, "City:"), cty,
        SPAN({class:"label"}, "State:"), st,
        SPAN({class:"label"}, "Zip:"), z]),
      P([SPAN({class:"label"}, "Description:"), l])
    ]));

  Addresses.push({
      key: address.key(),
      label: l,
      street: str,
      addStreet: ast,
      city: cty,
      state: st,
      zip: z
    });
}

function addPhone(phone)
{
  phone = phone ? db.get(phone) : db.get(db.createNew("Phone"));
  let label = phone.label || "";
  let num = phone.phonenumber || "";

  let l = INPUT({class:"input", type: "text", value:label});
  let n = INPUT({class:"input", type: "text", value:num});

  $("phones").appendChild(DIV(P([
      SPAN({class:"label"}, "Label: "),
      l,
      SPAN({class:"label"}, "Number: "),
      n
    ])));
  Phones.push({key: phone.key(), label: l, phonenumber: n});
}

function addEmail(email)
{
  email = email ? db.get(email) : db.get(db.createNew("Email"));
  let label = email.label || "";
  let link = email.link || "";

  let l = INPUT({class:"input", type: "text", value:label});
  let lnk = INPUT({class:"input", type: "text", value:link});

  $("emails").appendChild(DIV(P([
      SPAN({class:"label"}, "Label: "),
      l,
      SPAN({class:"label"}, "Email: "),
      lnk 
    ])));
  Emails.push({key: email.key(), label: l, link: lnk});
}

function collectPeople()
{
  var warned = false;
  function validate(p) {
    if(p.lastname.value)
      return true;

    else if(!p.firstname.value)
      return false;

    warnUser(WARNING_PERSON_LASTNAME, function() {
        highlightError(p.lastname);
      });
    warned = true;
    return false;
  }

  function extract(person) {
    return {key: person.key,
      firstname: person.firstname.value,
      lastname: person.lastname.value};
  }

  let rv = [extract(p) for each(p in People) if(validate(p))];
  if(!rv || !rv.length) {
    warnUser(WARN_NO_PEOPLE, function() {
        highlightError(People[0].lastname);
      });
  }
  return rv;
}

function collectAddresses()
{
  function validate(a) {
    if(a.street.value || a.addStreet.value
        || a.city.value || a.state.value || a.zip.value)
    {
      return true;
    }
    return false;
  }

  function extract(address) {
    return {key: address.key,
      label: address.label.value,
      street: address.street.value,
      additional: address.addStreet.value,
      city: address.city.value,
      state: address.state.value,
      zip: address.zip.value
    };
  }

  return [extract(a) for each(a in Addresses) if(validate(a))];
}

function collectPhones()
{
  function validate(phone) {
    if(!phone.label.value && !phone.phonenumber.value)
      return false;
    return true;
  }

  function extract(phone) {
    return {key: phone.key,
      label: phone.label.value,
      phonenumber: phone.phonenumber.value};
  }

  return [extract(p) for each(p in Phones) if(validate(p))];
}

function collectEmails()
{
  function validate(email) {
    if(!email.label.value && !email.link.value)
      return false;
    return true;
  }

  function extract(email) {
    return {key: email.key,
      label: email.label.value,
      link: email.link.value};
  }

  return [extract(e) for each(e in Emails) if(validate(e))];
}

function warnUser(msg, callback)
{
  $("inner-message").innerHTML = msg;

  var box = $("warning");
  box.setAttribute("style", "display:block;");

  $("close-warning").onclick = function onCloseWarning(e) {
    box.setAttribute("style", "display:none;");
    if(callback)
      callback();
  };
}

function highlightError(e)
{
  e.select();
  e.focus();
}

window.addEventListener("load", onWindowLoad, false);
