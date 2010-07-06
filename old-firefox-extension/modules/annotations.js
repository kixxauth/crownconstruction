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

const SQLITE_SCHEMA =
  "CREATE TABLE annotations(" +
  "  name VARCHAR(256)," +
  "  value MEDIUMTEXT," +
  " PRIMARY KEY (name))";

let anno =
{
  dictionary: {},

  get db()
  {
    let ss = Cc["@mozilla.org/storage/service;1"]
      .getService(Ci.mozIStorageService);
    return ss.openDatabase(this.file);
  },

  setValue: function(aName, aValue)
  {
    if(this.dictionary[aName] != aValue)
    {
      let db = this.db;
      let sql = "INSERT OR REPLACE INTO annotations VALUES (:name, :value)";
      try
      {
        let s = db.createStatement(sql);
        s.params.name = aName;
        s.params.value = aValue;
        s.execute();
        s.finalize();
        db.close();
      }
      catch(e if e.result == Components.results.NS_ERROR_FAILURE)
      {
        throw new Error("annotation service SQL error: " +
                        db.lastErrorString + " in " +
                        sql);
        return false;
      }
      this.dictionary[aName] = aValue;
      return aValue;
    }
    return;
  },

  getValue: function(aName)
  {
    return this.dictionary[aName];
  }
};

anno.file = Cc["@mozilla.org/file/directory_service;1"].
  getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);

anno.file.append("crownconstruction_anno.sqlite");
if(!anno.file.exists())
  anno.file.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0644);

if(!anno.db.tableExists("annotations"))
{
  anno.db.executeSimpleSQL(SQLITE_SCHEMA);
}
else
{
  let s = anno.db.createStatement("SELECT name,value FROM annotations");
  s.executeAsync({
      handleResult:function(results)
      {
        for(let row = results.getNextRow(); row; row = results.getNextRow())
        {
          let key = row.getResultByName("name");
          anno.dictionary[key] = row.getResultByName("value");
        }
      },
      handleError:function(err)
      {
        Cu.reportError(err.message);
      }
    });
}

var exports = anno;
