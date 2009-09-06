/** get entity instance(s) from the datastore by key(s) */
  // if the entity is in the cache, return it
  // get the model of the entity using the key
  // construct the SQL statement
  // create an empty entity object
  // execute the statment asyc
  // collect results, handle errors, construct setters and getters, put into
  // the cache and return the entity to the callback, all within a closure

/** create an new entity instance by class */
  // get the model of the entity using the key
  // for each property in the model:
    // construct setters and getters
    // if required properties are not passed; raise exception
    // put into the cache and return the entity to the caller

/** construct an SQL select statement */
  // start the statement string
  // build each property string
  // append the "FROM tablename" clause
  // build and append required JOIN clauses

/** Create and store a transaction */
  // For each entity in the cache:
    // if the updated attribute is true:
      // create and normalize operations on the entity
      // append each operation to the operations list
  // if there are no items in the operations list, return false;
  // create a new thread
    // create and store the transaction locally
    // return the normalized transaction to the callback

/** create a transaction and store locally with the given operation list */
  // create an SQL statement from each operation type 
  // start an SQLite transaction
  // for each entity in the transcation content:
    // assert that the entity does not already exist
    // for each operation:
      // if update operation:
        // if 1 to 1 relationship; add change to the update statement
        // if 1 to many [??? or many to many]; create and execute update
      // if remove operation:
        // if 1 to 1 relationship; add null change to the update statement
        // if 1 to many or many to many; create and execute delete
      // if append operation:
        // if 1 to 1 relationship; add change to the insert statement
        // if 1 to many or many to many; create and execute insert
  // create the SQL transaction record statement
  // bind the parameters, setting state to 1
  // insert the transaction record
  // commit the SQLite transaction

/** Entity */
  // init stored property value dict
  // init the key object

/** Key */
  // init the realm, kind, and uri
