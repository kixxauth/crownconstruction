let EXPORTED_SYMBOLS = ["configs"];

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
        var p = this.getPreferences();
        var domain = p.getValue(PREF_DATA_DOMAIN, "");
        var users = p.getValue(PREF_DATA_URL, "");
        return domain+users;
        break;

      case "realm":
        return this.getPreferences().getValue(PREF_REALM, "");
        break;

      case "log-level":
        return this.getPreferences().getValue(PREF_LOGLEVEL, "");
        break;

      case "debug":
        return this.getPreferences().getValue(PREF_DEBUG, false);
        break;

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
