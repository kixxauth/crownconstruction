let EXPORTED_SYMBOLS = ["model"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://crownconstruction/modules/lib.js");

let kind_Customer =
{
  uri:'http://www.crownconstructioninc.com/rdf#Customer',

  properties:
  {
    Person:'http://www.fireworksproject.com/rdf#hasPerson',
    Address:'http://www.fireworksproject.com/rdf#hasAddress',
    Phone:'http://www.fireworksproject.com/rdf#hasPhone',
    Email:'http://www.fireworksproject.com/rdf#hasEmail'
  }
};

let kind_Person =
{
  uri:'http://www.fireworksproject.com/rdf#Person',

  properties:
  {
    firstname:'http://www.fireworksproject.com/rdf#hasFirstName',
    lastname:'http://www.fireworksproject.com/rdf#hasLastName'
  }
};

let kind_Address =
{
  uri:'http://www.crownconstructioninc.com/rdf#Address',

  properties:
  {
    label:'http://www.fireworksproject.com/rdf#hasLabel',
    street:'http://www.fireworksproject.com/rdf#hasStreetAddress',
    additional:'http://www.fireworksproject.com/rdf#hasAddtionalAddress',
    city:'http://www.fireworksproject.com/rdf#hasCityAddress',
    state:'http://www.fireworksproject.com/rdf#hasStateAddress',
    zip:'http://www.fireworksproject.com/rdf#hasZipAddress'
  }
};

let kind_Phone =
{
  uri:'http://www.crownconstructioninc.com/rdf#Phone',

  properties:
  {
    label:'http://www.fireworksproject.com/rdf#hasLabel',
    phonenumber:'http://www.fireworksproject.com/rdf#hasPhoneNumber'
  }
};

let kind_Email =
{
  uri:'http://www.crownconstructioninc.com/rdf#Email',

  properties:
  {
    label:'http://www.fireworksproject.com/rdf#hasLabel',
    link:'http://www.fireworksproject.com/rdf#hasEmailLink'
  }
};

let predicates =
{
    'http://www.fireworksproject.com/rdf#hasPerson':
    {
      range:'http://www.fireworksproject.com/rdf#Person',
      cardinal:"*"
    },
    'http://www.fireworksproject.com/rdf#hasAddress':
    {
      range:'http://www.fireworksproject.com/rdf#Address',
      cardinal:"*"
    },
    'http://www.fireworksproject.com/rdf#hasPhone':
    {
      range:'http://www.fireworksproject.com/rdf#Phone',
      cardinal:"*"
    },
    'http://www.fireworksproject.com/rdf#hasEmail':
    {
      range:'http://www.fireworksproject.com/rdf#Email',
      cardinal:"*"
    },
    'http://www.fireworksproject.com/rdf#hasEmailLink':
    {
      range:"literal",
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasPhoneNumber':
    {
      range:"literal",
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasLabel':
    {
      range:"literal",
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasStreetAddress':
    {
      range:"literal",
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasAddtionalAddress':
    {
      range:"literal",
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasCityAddress':
    {
      range:"literal",
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasStateAddress':
    {
      range:"literal",
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasZipAddress':
    {
      range:"literal",
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasFirstName':
    {
      range:"literal",
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasLastName':
    {
      range:"literal",
      cardinal:1
    }
};


let model = {};

model.kinds =
{
  Customer: kind_Customer,
  Person: kind_Person,
  Address: kind_Address,
  Phone: kind_Phone,
  Email: kind_Email
};

model.getClassForKind = function M_getClassForKind(kind)
{
  if(!(kind in model.kinds)) {
    assert(false, "Kind '"+ kind +"' does not exist.");
    throw new Error("Kind '"+ kind +"' does not exist.");
  }

  if(!model.kinds[kind])
    return null;
  return model.kinds[kind].uri;
};

model.getKindForClass = function M_getKindForClass(clas)
{
  rv = null;
  for(let kind in model.kinds) {
    if(model.kinds[kind].uri == clas)
      return kind;
  }
  return null;
};

model.hasKind = function M_hasKind(kind) {
  return (kind in model.kinds);
};

model.hasProperty = function M_hasProperty(kind, property) {
  if(!(kind in model.kinds)) {
    assert(false, "Kind '"+ kind +"' does not exist.");
    throw new Error("Kind '"+ kind +"' does not exist.");
  }
  return (property in model.kinds[kind].properties);
}

model.getProperties = function M_getProperties(kind)
{
  if(!(kind in model.kinds)) {
    assert(false, "Kind '"+ kind +"' does not exist.");
    throw new Error("Kind '"+ kind +"' does not exist.");
  }
  return model.kinds[kind].properties;
};

model.getPropertyName = function M_propertyName(kind, predicate)
{
  if(!kind || !(kind in model.kinds)) {
    assert(false, "Kind '"+ kind +"' does not exist.");
    throw new Error("Kind '"+ kind +"' does not exist.");
  }
  assert(typeof(predicate) == "string",
      "mode.getProperties() was passed predicate: "+ predicate);

  let props =  model.kinds[kind].properties;
  for(let p in props) {
    if(props[p] == predicate)
      return p;
  }
  return null;
};

model.getRange = function M_getRange(kind, prop)
{
  return predicates[model.kinds[kind].properties[prop]].range;
};

model.getCardinal = function M_getCardinal(kind, prop)
{
  return predicates[model.kinds[kind].properties[prop]].cardinal;
};

/*
model.validateProperty = function M_validateProp(kind, prop, value)
{
  if(!(kind in model.kinds)) {
    assert(false, "Kind '"+ kind +"' does not exist.");
    throw new Error("Kind '"+ kind +"' does not exist.");
  }
  return model.kinds[kind].validate(prop, value);
};

model.hasRequiredProperties = function M_requiredProps(kind, props)
{
  if(!(kind in model.kinds)) {
    assert(false, "Kind '"+ kind +"' does not exist.");
    throw new Error("Kind '"+ kind +"' does not exist.");
  }
  return model.kinds[kind].hasRequiredProperties(props);
};
*/
