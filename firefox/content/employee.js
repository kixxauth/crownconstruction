Components.utils.import("resource://crownconstruction/modules/toolkit.js");
Components.utils.import("resource://crownconstruction/modules/db.js");

const WARNING_FIRSTNAME = "We need a firstname for an employee before "+
  "we can save them."

const WARNING_LASTNAME = "We need a lastname for an employee before "+
  "we can save them."

const WARNING_TRANSACTION_FAILED = "Well, this is embarassing, but there "+
  "has been an error while processing your save request. First, copy "+
  "all of your changes down to paper (or you can print this page), "+
  "because we will not be able to save them as they are. Then, go back "+
  "to the main menu, and press the refresh button before trying to "+
  "resubmit your changes.";

const OK_TRANSACTION = "Saved.";

let Employee = null;
let tags = [];

function onWindowLoad(e)
{
  let uri = page.uriFromURL(window.location.href).uri;

  Employee = db.getKey(uri);
  let employee = db.get(Employee);
  addTags(employee.category);

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
  let names = collectNames();
  if(!names || !names.firstname || !names.lastname)
    return true;

  db.setattr(Employee, "firstname", names.firstname);
  db.setattr(Employee, "lastname", names.lastname);

  //tk.dump("key", Employee.constructor.name);
  db.setattr(Employee, "category", collectTags());

  db.commit("testPilot", "save employee", function(r)
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

function onAddCategory()
{
  addTags(null);
}

function addTags(tags)
{
  tags = tags || [null];
  tags.forEach(addTag);
}

function addTag(tag)
{
  tag = tag || "";

  let t = INPUT({type: "text", value:tag});
  $("categories").appendChild(P([
        SPAN("Category: "),
        t
      ]));
  tags.push(t);
}

function collectNames()
{
  var warned = false;
  function validate() {
    if(!$("lastname").value) {
      warnUser(WARNING_LASTNAME, function() {
          highlightError($("lastname"));
        });
      warned = true;
      return false;
    }
    if(!$("firstname").value) {
      if(warned)
        return false;
      warnUser(WARNING_FIRSTNAME, function() {
          highlightError($("firstname"));
        });
      warned = true;
      return false;
    }
    return true;
  }

  if(!validate())
    return false;

  return {firstname: $("firstname").value,
    lastname: $("lastname").value};
}

function collectTags()
{
  function validate(tag) {
    if(!tag.value)
      return false;
    return true;
  }

  return [t.value for each(t in tags) if(validate(t))];
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
