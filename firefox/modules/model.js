let EXPORTED_SYMBOLS = ["model"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

let model = {};

model.getClassForKind = function M_getClassForKind(kind)
{
  if(!(kind in model.kinds)) {
    assert(false, "Kind '"+ kind "' does not exist.");
    throw new Error("Kind '"+ kind "' does not exist.");
  }

  if(!model.kinds[kind])
    return null;
  return model.kinds[kind].uri;
};

model.hasKind = function M_hasKind(kind) {
  return (kind in model.kinds);
};

model.hasProperty = function M_hasProperty(kind, property) {
  if(!(kind in model.kinds)) {
    assert(false, "Kind '"+ kind "' does not exist.");
    throw new Error("Kind '"+ kind "' does not exist.");
  }
  return (property in model.kinds[kind].properties);
}

model.getProperties = function M_getProperties(kind)
{
  if(!(kind in model.kinds)) {
    assert(false, "Kind '"+ kind "' does not exist.");
    throw new Error("Kind '"+ kind "' does not exist.");
  }

  if(!model.kinds[kind])
    return null;
  return model.kinds[kind].properties;
};

let kind_Person =
{
  uri:'http://www.fireworksproject.com/rdf#Person',

  properties:
  {
  }
};

let kind_Customer =
{
  uri:'http://www.crownconstructioninc.com/rdf#Customer',

  properties:
  {
  }
};

model.kinds =
{
  Person: kind_Person,
  Customer: kind_Customer
};
