let EXPORTED_SYMBOLS = ["tk"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

let tk =
{
  isarray: function(a)
  {
    if(!a || a == null || typeof(a) != "object")
      return false;

    if(typeof(a.length) != "number" ||
        typeof(a.push) != "function" ||
        typeof(a.pop) != "function")
    {
      return false;
    }
    return true;
  },

  dump: function(name, msg)
  {
    dump("-dump- "+ name +": "+ msg +"\n");
  },

  dumpObject: function(obj, indent)
  {
    var result = "";
    if (indent == null) indent = "";

    for (var property in obj)
    {
      var value = obj[property];
      if (typeof value == 'string')
        value = "'" + value + "'";
      else if (typeof value == 'object')
      {
        if (value instanceof Array)
        {
          // Just let JS convert the Array to a string!
          value = "[ " + value + " ]";
        }
        else
        {
          // Recursive dump
          // (replace "  " by "\t" or something else if you prefer)
          var od = DumpObjectIndented(value, indent + "  ");
          // If you like { on the same line as the key
          //value = "{\n" + od + "\n" + indent + "}";
          // If you prefer { and } to be aligned
          value = "\n" + indent + "{\n" + od + "\n" + indent + "}";
        }
      }
      result += indent + "'" + property + "' : " + value + ",\n";
    }
    return result.replace(/,\n$/, "");
  }
};
/*

function debugObject(a, limit, skip)
{
  gProbeSafetyCount = 0;
  return "\n"+probe(a, limit, skip)+"\n";
}
function probe(a, aLimit, aSkip)
{
  // check params and set defaults
  if(!arguments.length || arguments.length < 1)
    throw new Error("debugKit.probe() needs at least one argument");
  aLimit = aLimit || 96;
  aSkip = aSkip || "";
  if(typeof(aLimit) == "string") {
    aSkip = aLimit;
    aLimit = 96;
  }

  if(typeof(a) == "string")
    return "{string} '"+ a +"'";
  if(typeof(a) == "number")
    return "{number} '"+ a +"'";
  if(typeof(a) == "boolean")
    return "{boolean} '"+ a +"'";
  if(a == null)
    return "{object} '"+ a +"'";
  if(typeof(a) == "undefined")
    return "{undefined}";
  if(typeof(a) == "function")
    return "{function}";

  if(typeof(a) == "object")
  {
    var str;
    if(a.length && a.pop && a.push) {
      str = "{array} --";
      for(var i = 0; i < a.length; i++) {
        if(gProbeSafetyCount < aLimit) {
          str += "\n    ["+i+"] = "+ arguments.callee(a[i], aLimit, aSkip);
          gProbeSafetyCount++;
        } else { 
          str += "\n    ["+i+"] = TOO MUCH RECURSION";
        }
      }
      return str;
    }
    str = "{object} --";
    for(var p in a) {
      if(gProbeSafetyCount < aLimit && p != aSkip) {
        str += "\n    ["+p+"] = "+ arguments.callee(a[p], aLimit, aSkip);
        gProbeSafetyCount++;
      } else { 
        str += "\n    ["+p+"] = TOO MUCH RECURSION or SKIPPED";
      }
    }
    return str;
  }
  return "{unknown}";
}
let gProbeSafetyCount = 0;
*/
