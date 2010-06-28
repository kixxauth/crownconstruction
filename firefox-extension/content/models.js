/*jslint
onevar: true,
undef: true,
nomen: true,
eqeqeq: true,
plusplus: true,
bitwise: true,
regexp: true,
immed: true,
strict: true,
laxbreak: true
*/

/*global
*/

"use strict";

var MODELS = {}, INDEXES = {};

INDEXES.index_last_name = function (val) {
  return ['last_name', val.toUpperCase()];
};

INDEXES.index_groups = (function () {
	var rtrim = /^\s+|\s+$/g;

  return function (val) {
    var i = 0
      , groups = (val || '').split(',')
      ;

    for (; i < groups.length; i += 1) {
      groups[i] = groups[i].replace(rtrim, '').toUpperCase();
    }

    return ['groups', groups];
  };
}());

INDEXES.index_customer_key = function (val) {
  return ['ref_customer', val];
};

MODELS.customer = function (db) {
  return {
    names: db.list(
      db.dict({
        first: db.str(),
        last: db.str({index: INDEXES.index_last_name})
      })
    ),
    addresses: db.list(
      db.dict({
        street: db.str(),
        city: db.str(),
        state: db.str(),
        zip: db.str()
      })
    ),
    phones: db.list(
      db.dict({
        phone: db.str(),
        label: db.str()
      })
    ),
    emails: db.list(
      db.dict({
        email: db.str(),
        label: db.str()
      })
    )
  };
};

MODELS.employee = function (db) {
  return {
    name: db.dict({
      first: db.str(),
      last: db.str({index: INDEXES.index_last_name})
    }),
    addresses: db.list(
      db.dict({
        street: db.str(),
        city: db.str(),
        state: db.str(),
        zip: db.str()
      })
    ),
    phones: db.list(
      db.dict({
        phone: db.str(),
        label: db.str()
      })
    ),
    groups: db.str({index: INDEXES.index_groups})
  };
};

MODELS.job = function (db) {
  return {
    customer: db.str({index: INDEXES.index_customer_key}),
    strname: db.str(),
    sale_by: db.str(),
    estimate_by: db.str(),
    production_by: db.str(),
    estimate_date: db.str(),
    roundtrip_miles: db.num(),
    allotted_miles: db.num(),
    startdate: db.str(),
    completedate: db.str(),
    contractdate: db.str(),
    description: db.str(),
    taxlabor: db.num(),
    estimated_profit: db.num(),
    payments: db.list(
      db.dict({
        due: db.str(),
        memo: db.str(),
        amount: db.str()
      })
    ),
    jobs: db.list(
      db.dict({
        type: db.str(),
        amount: db.str(),
        foreman: db.str(),
        mandays: db.num()
      })
    ),
    direct_pays: db.list(db.str()),
    handoff: db.dict({scheduled: db.str(), completed: db.str()}),
    walkthrough: db.dict({scheduled: db.str(), completed: db.str()}),
    special_orders: db.list(db.dict({
      description: db.str(),
      vendor: db.str(),
      ordered_by: db.str(),
      order_date: db.str(),
      delivery_date: db.str()
    })),
    sub_contractors: db.list(db.dict({
      contractor: db.str(),
      description: db.str(),
      phone: db.str(),
      quote: db.str(),
      startdate: db.str()
    })),
    siding: db.dict({
      squares: db.num(),
      type: db.str(),
      style: db.str(),
      brand: db.str(),
      color: db.str(),
      trim_color: db.str()
    }),
    roofing: db.dict({
      squares: db.num(),
      type: db.str(),
      style: db.str(),
      brand: db.str(),
      color: db.str(),
      tearoff: db.bool()
    }),
    permits: db.list(db.dict({
      type: db.str(),
      date_received: db.str(),
      permit_num: db.str(),
      phone: db.str()
    }))
  };
};

