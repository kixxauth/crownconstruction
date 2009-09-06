/** get entity instance(s) from the datastore by uri(s) */

/** Transaction */

/** Query */
function Query()
{
}
Query.prototype=
{
  /** Execute the query and return results async */
  fetch: function(complete, results, error)
  {
    // construct the SQL statement
  },

  _createStatement: function()
  {
  }
};
