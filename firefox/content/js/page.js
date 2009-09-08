const Cu = Components.utils;

Cu.import("resource://crownconstruction/modules/ubiquity_utils.js");
Cu.import("resource://crownconstruction/modules/toolkit.js");

let page = {};

page.createRepURL = function P_createRepURL(url, resource)
{
  return url + Utils.paramsToString({uri:resource});
};

page.uriFromURL = function P_uriFromURL(url)
{
  return Utils.urlToParams(url);
};
