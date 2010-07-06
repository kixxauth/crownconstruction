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
Components: false
*/

"use strict";

dump(' ... util.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , events = require('events')

  , $F = function () {}
  , $N = {}
  ;

/*
    json.js
    2006-04-28
    2006-05-27 added prettyPrint argument

    This file adds these methods to JavaScript:

        object.toJSONString(prettyPrint)

            This method produces a JSON text from an object. The
            object must not contain any cyclical references.

        array.toJSONString(prettyPrint)

            This method produces a JSON text from an array. The
            array must not contain any cyclical references.

        string.parseJSON()

            This method parses a JSON text to produce an object or
            array. It will return false if there is an error.

+           added prettyPrint argument
            prettyPrint ... if set to true the resulting string will be formated
                            with tabs and returns to be more human readable.
                            by Matthias.Platzer@knallgrau.at

*/
/* 
Distributed under the MIT License :
Visit http://javascript.neyric.com/inputex for more informations

Copyright (c) 2007-2010, Eric Abouaf <eric.abouaf at gmail.com>

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

// This was dropped into this module as is.
// Is is not lint free.
(function () {
    var INTEND = "\t";
    var NEWLINE = "\n";
    var pPr = true;
    var intendLevel = 0;
    var intend = function(a) {
        if (!pPr) return a;
        for (var l=0; l<intendLevel; l++) {
            a[a.length] = INTEND;
        }
        return a;
    };

    var newline = function(a) {
        if (pPr) a[a.length] = NEWLINE;
        return a;
    };

    var m = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        s = {
            array: function (x) {
                var a = ['['], b, f, i, l = x.length, v;
                a = newline(a);
                intendLevel++;
                for (i = 0; i < l; i += 1) {
                    v = x[i];
                    f = s[typeof v];
                    if (f) {
                        v = f(v);
                        if (typeof v == 'string') {
                            if (b) {
                                a[a.length] = ',';
                                a = newline(a);
                            }
                            a = intend(a);
                            a[a.length] = v;
                            b = true;
                        }
                    }
                }
                intendLevel--;
                a = newline(a);
                a = intend(a);
                a[a.length] = ']';
                return a.join('');
            },
            'boolean': function (x) {
                return String(x);
            },
            'null': function (x) {
                return "null";
            },
            number: function (x) {
                return isFinite(x) ? String(x) : 'null';
            },
            object: function (x, formatedOutput) {
                if (x) {
                    if (x instanceof Array) {
                        return s.array(x);
                    }
                    var a = ['{'], b, f, i, v;
                    a = newline(a);
                    intendLevel++;
                    for (i in x) {
                        v = x[i];
                        f = s[typeof v];
                        if (f) {
                            v = f(v);
                            if (typeof v == 'string') {
                                if (b) {
                                    a[a.length] = ',';
                                    a = newline(a);
                                }
                                a = intend(a);
                                a.push(s.string(i), ((pPr) ? ' : ' : ':'), v);
                                b = true;
                            }
                        }
                    }
                    intendLevel--;
                    a = newline(a);
                    a = intend(a);
                    a[a.length] = '}';
                    return a.join('');
                }
                return 'null';
            },
            string: function (x) {
                if (/["\\\x00-\x1f]/.test(x)) {
                    x = x.replace(/([\x00-\x1f\\"])/g, function(a, b) {
                        var c = m[b];
                        if (c) {
                            return c;
                        }
                        c = b.charCodeAt();
                        return '\\u00' +
                            Math.floor(c / 16).toString(16) +
                            (c % 16).toString(16);
                    });
                }
                return '"' + x + '"';
            }
        };

    Object.prototype.toPrettyJSONString = function () {
        //pPr = prettyPrint;
        return s.object(this);
    };

    Array.prototype.toPrettyJSONString = function () {
        //pPr = prettyPrint;
        return s.array(this);
    };
})();

exports.prettify = function (x) {
  if (x === null) {
    return 'null';
  }
  if (typeof x === 'undefined') {
    return 'undefined';
  }
  if (typeof x === 'object') {
    return exports.isArray(x) ?
      Array.prototype.toPrettyJSONString.call(x):
      Object.prototype.toPrettyJSONString.call(x);
  }
  return x +'';
};

exports.isObject = function (x) {
	return !!(x && Object.prototype.toString.call(x) === "[object Object]");
};

exports.isArray = function (x) {
  return !!(x && Object.prototype.toString.call(x) === '[object Array]');
};

exports.isError = function (x) {
  return !!(x && Object.prototype.toString.call(x) === '[object Error]');
}

exports.has = function (owner, propname) {
  return Object.prototype.hasOwnProperty.call(owner, propname);
};

exports.confirmObject = function confirmObject(x) {
	return exports.isObject(x) ? x : {};
};

exports.confirmArray = function confirmArray(x) {
	return exports.isArray(x) ? x : [];
};

exports.confirmFunc = function confirmFunc(x) {
	return typeof x === "function" ? x : $F;
};

exports.confirmInt = function (x, def) {
  x = +x;
  return isNaN(x) ? ((typeof def === 'undefined') ? 0 : def) : x;
};

exports.curry = function (fn) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function () {
    if (arguments.length) {
      fn.apply($N, args.concat(Array.prototype.slice.call(arguments)));
    }
    else {
      fn.apply($N, args);
    }
  };
};

function load(cb) {
  events.enqueue(function () {
    cb('util', exports);
  }, 0);
}

