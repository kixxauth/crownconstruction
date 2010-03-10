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

// For Mozilla JavaScript modules system.
var EXPORTED_SYMBOLS = ["exports"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://crownconstruction/modules/constants.js");

let configs = 
{
  INVALID_CONFIG: "this config key is invalid",

  get: function(a)
  {
    switch(a)
    {
      case "data-url":
        return this.getPreferences().getValue(PREF_DATA_DOMAIN, "");

      case "dbname":
        return this.getPreferences().getValue(PREF_DBNAME, "");

      case "sandbox-dbname":
        return this.getPreferences().getValue(PREF_SANDBOX_DBNAME, "");

      default:
        return this.INVALID_CONFIG;
    }
  },

  getPreferences: function()
  {
    return this.getApplication().prefs;
  },

  getApplication: function()
  {
    return Cc["@mozilla.org/fuel/application;1"]
      .getService(Ci.fuelIApplication);
  }
};

var exports = configs;
