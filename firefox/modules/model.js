let EXPORTED_SYMBOLS = ["model"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://crownconstruction/modules/lib.js");

let kind_Contract =
{
  uri:'http://www.crownconstructioninc.com/rdf#Contract',

  properties:
  {
    Salesperson:'http://www.crownconstructioninc.com/rdf#hasSalesperson',
    Estimator:'http://www.crownconstructioninc.com/rdf#hasEstimator',
    Production:'http://www.crownconstructioninc.com/rdf#hasProduction',
    contractDate:'http://www.fireworksproject.com/rdf#hasDate',
    startDate:'http://www.fireworksproject.com/rdf#hasDate',
    completeDate:'http://www.fireworksproject.com/rdf#hasDate',
    cost:'http://www.fireworksproject.com/rdf#hasAmount',
    estimatedGP:'http://www.fireworksproject.com/rdf#hasAmount',
    taxlabor:'http://www.fireworksproject.com/rdf#hasAmount',
    Customer:'http://www.crownconstructioninc.com/rdf#hasCustomer',
    Job:'http://www.crownconstructioninc.com/rdf#hasJob',
    SpecialOrder:'http://www.crownconstructioninc.com/rdf#hasSpecOrder',
    SubContractor:'http://www.crownconstructioninc.com/rdf#hasSpecOrder',
  }
};

let kind_SubContractor =
{
  uri:'http://www.crownconstructioninc.com/rdf#SubContractor',

  properties:
  {
    name:'http://www.fireworksproject.com/rdf#hasName',
    task:'http://www.fireworksproject.com/rdf#hasDescription',
    phonenumber:'http://www.fireworksproject.com/rdf#hasPhoneNumber',
    quote:'http://www.fireworksproject.com/rdf#hasAmount',
    startDate:'http://www.fireworksproject.com/rdf#hasDate'
  }
};

let kind_SpecialOrder =
{
  uri:'http://www.crownconstructioninc.com/rdf#SpecialOrder',

  properties:
  {
    name:'http://www.fireworksproject.com/rdf#hasName',
    vendor:'http://www.fireworksproject.com/rdf#hasName',
    orderedBy:'http://www.fireworksproject.com/rdf#hasName',
    orderDate:'http://www.fireworksproject.com/rdf#hasDate',
    deliveryDate:'http://www.fireworksproject.com/rdf#hasDate'
  }
};

let kind_Job =
{
  uri:'http://www.crownconstructioninc.com/rdf#Job',

  properties:
  {
    idno:'http://www.fireworksproject.com/rdf#hasName',
    type:'http://www.fireworksproject.com/rdf#hasStringTag',
    retail:'http://www.fireworksproject.com/rdf#hasAmount',
    foreman:'http://www.crownconstructioninc.com/rdf#hasForeman'
  }
};

let kind_Employee =
{
  uri:'http://www.crownconstructioninc.com/rdf#Employee',

  properties:
  {
    firstname:'http://www.fireworksproject.com/rdf#hasFirstName',
    lastname:'http://www.fireworksproject.com/rdf#hasLastName',
    category:'http://www.fireworksproject.com/rdf#hasStringTag'
  }
};

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
    'http://www.fireworksproject.com/rdf#hasName':
    {
      range:'literal',
      cardinal:1
    },
    'http://www.crownconstructioninc.com/rdf#hasSpecOrder':
    {
      range:'http://www.crownconstructioninc.com/rdf#SpecialOrder',
      cardinal:"*"
    },
    'http://www.crownconstructioninc.com/rdf#hasSubContractor':
    {
      range:'http://www.crownconstructioninc.com/rdf#SubContractor',
      cardinal:"*"
    },
    'http://www.fireworksproject.com/rdf#hasDescription':
    {
      range:'literal',
      cardinal:1
    },
    'http://www.crownconstructioninc.com/rdf#hasForeman':
    {
      range:'http://www.crownconstructioninc.com/rdf#Employee',
      cardinal:1
    },
    'http://www.crownconstructioninc.com/rdf#hasJob':
    {
      range:'http://www.crownconstructioninc.com/rdf#Job',
      cardinal:"*"
    },
    'http://www.crownconstructioninc.com/rdf#hasCustomer':
    {
      range:'http://www.crownconstructioninc.com/rdf#Customer',
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasAmount':
    {
      range:'literal',
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasDate':
    {
      range:'literal',
      cardinal:1
    },
    'http://www.crownconstructioninc.com/rdf#hasEstimator':
    {
      range:'http://www.crownconstructioninc.com/rdf#Employee',
      cardinal:1
    },
    'http://www.crownconstructioninc.com/rdf#hasProduction':
    {
      range:'http://www.crownconstructioninc.com/rdf#Employee',
      cardinal:1
    },
    'http://www.crownconstructioninc.com/rdf#hasSalesperson':
    {
      range:'http://www.crownconstructioninc.com/rdf#Employee',
      cardinal:1
    },
    'http://www.fireworksproject.com/rdf#hasStringTag':
    {
      range:'literal',
      cardinal:"*"
    },
    'http://www.fireworksproject.com/rdf#hasPerson':
    {
      range:'http://www.fireworksproject.com/rdf#Person',
      cardinal:"*"
    },
    'http://www.fireworksproject.com/rdf#hasAddress':
    {
      range:'http://www.crownconstructioninc.com/rdf#Address',
      cardinal:"*"
    },
    'http://www.fireworksproject.com/rdf#hasPhone':
    {
      range:'http://www.crownconstructioninc.com/rdf#Phone',
      cardinal:"*"
    },
    'http://www.fireworksproject.com/rdf#hasEmail':
    {
      range:'http://www.crownconstructioninc.com/rdf#Email',
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
  Job: kind_Job,
  Contract: kind_Contract,
  SubContractor: kind_SubContractor,
  SpecialOrder: kind_SpecialOrder,
  Employee: kind_Employee,
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
  assert(model.kinds[kind],
      "expected kind for "+kind+"."+prop+" is "+
      model.kinds[kind]);
  assert(model.kinds[kind].properties[prop],
      "expected predicate ref for "+kind+"."+prop+" is "+
      model.kinds[kind].properties[prop]);
  assert(predicates[model.kinds[kind].properties[prop]],
      "expected predicate for "+model.kinds[kind].properties[prop]
      +" is "+ predicates[model.kinds[kind].properties[prop]]);
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
