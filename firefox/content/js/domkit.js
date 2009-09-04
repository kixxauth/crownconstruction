function $(a)
{
  return document.getElementById(a);
}

function makeDOM(aName, aAttrs, aChildren)
{
  // see if aAttrs is a DOM node, or array of DOM nodes.
  let ta = typeof(aAttrs);
  if(ta == "string" || (ta == "object" &&
      (typeof(aAttrs.tagName) == "string" || typeof(aAttrs.indexOf) == "function")))
  {
    aChildren = aAttrs;
    aAttrs = false;
  }
  if(typeof(aName) == "string")
    var e = document.createElement(aName);
  // if the first argument is not a string, then the caller goofed
  else
    throw new Error("makeDOM() needs a string parameter to create an element");

  // if we have attributes, we set them with this loop
  if(aAttrs)
    for(var name in aAttrs) e.setAttribute(name, aAttrs[name]);

  // if we have no children to append, we're done
  if(typeof(aChildren) == "undefined")
    return e;

  // if we do have children...
  if(typeof(aChildren) == "object" && aChildren.push && aChildren.pop)
  {
    // and the children were passed as an array, we use a loop to append them
    var child;
    for(var i=0; i < aChildren.length; i++) {
      child = aChildren[i];
      if(typeof(child) == "string")
        child = document.createTextNode(child);
      e.appendChild(child);
    }
  }
  else if(typeof(aChildren) == "string")
  {
    // if the child argument is a string,
    // the caller intended us to make a text node
    e.appendChild(document.createTextNode(aChildren));
  }
  else if(typeof(aChildren) == "object"
      && typeof(aChildren.tagName) == "string")
  {
    // lastly, we just append the child argument,
    // since we can now be sure it is a single node
    e.appendChild(aChildren);
  }
  return e;
}

function A(aAttrs, aChildren) { return makeDOM("a", aAttrs, aChildren); }
function BR(aAttrs, aChildren) { return makeDOM("br", aAttrs, aChildren); }
function BUTTON(aAttrs, aChildren) { return makeDOM("button", aAttrs, aChildren); }
function DIV(aAttrs, aChildren) { return makeDOM("div", aAttrs, aChildren); }
function IMG(aAttrs, aChildren) { return makeDOM("img", aAttrs, aChildren); }
function INPUT(aAttrs, aChildren) { return makeDOM("input", aAttrs, aChildren); }
function LI(aAttrs, aChildren) { return makeDOM("li", aAttrs, aChildren); }
function OL(aAttrs, aChildren) { return makeDOM("ol", aAttrs, aChildren); }
function OPTION(aAttrs, aChildren) { return makeDOM("option", aAttrs, aChildren); }
function P(aAttrs, aChildren) { return makeDOM("p", aAttrs, aChildren); }
function SPAN(aAttrs, aChildren) { return makeDOM("span", aAttrs, aChildren); }
function TABLE(aAttrs, aChildren) { return makeDOM("table", aAttrs, aChildren); }
function TD(aAttrs, aChildren) { return makeDOM("td", aAttrs, aChildren); }
function TH(aAttrs, aChildren) { return makeDOM("th", aAttrs, aChildren); }
function TR(aAttrs, aChildren) { return makeDOM("tr", aAttrs, aChildren); }
function UL(aAttrs, aChildren) { return makeDOM("ul", aAttrs, aChildren); }
