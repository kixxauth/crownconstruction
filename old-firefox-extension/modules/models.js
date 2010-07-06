/*
Licensed under The MIT License
==============================

Copyright (c) 2009 - 2010 Fireworks Technology Projects Inc.
[www.fireworksproject.com](http://www.fireworksproject.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */

/*jslint
onevar: true,
undef: true,
nomen: true,
eqeqeq: true,
plusplus: true,
bitwise: true,
regexp: true,
newcap: true,
immed: true,
strict: true,
maxlen: 80
*/

/*global
*/

"use strict";

// For Mozilla JavaScript modules system.
var EXPORTED_SYMBOLS = ["exports"],
  exports = {};

function index_last_name(val) {
  return ['last_name', val.toUpperCase()];
}

exports.customer = function (db) {
  return {
    names: db.list(
      db.dict({
        first: db.str(),
        last: db.str({index: index_last_name})
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

var index_groups = (function () {
	var rtrim = /^\s+|\s+$/g;

  return function (val) {
    var rv = [],
      i = 0,
      groups = (val || '').split(',');

    for (; i < groups.length; i += 1) {
      groups[i] = groups[i].replace(rtrim, '').toUpperCase();
    }

    return ['groups', groups];
  };
}());

exports.employee = function (db) {
  return {
    name: db.dict({
      first: db.str(),
      last: db.str({index: index_last_name})
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
    groups: db.str({index: index_groups})
  };
};

function index_customer_key(val) {
  return ['ref_customer', val];
}

exports.job = function (db) {
  return {
    customer: db.str({index: index_customer_key}),
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

