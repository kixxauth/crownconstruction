/**
 */
function Entity()
{
}
Entity.prototype=
{
};

/**
 * Define setters and getters for a given property.
 */

/** getter */
  // returns value from property dict

/** setter */
  // calls validator and throws exception for bad input
  // set the value in the propery dict

function defineProperty(entity, propname, validator)
{
  entity.__defineGetter__(propname, function()
      {
        return entity.__propertyDict[propname]
      });

  entity.__defineSetter__(propname, function(value)
      {
        entity.__propertyDict[propname] = validator(value);
      });
}
