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

dump(' ... hashlib.js\n');

var EXPORTED_SYMBOLS = ['exports', 'load']

  , Cc = Components.classes
  , Ci = Components.interfaces
  , Cu = Components.utils

  , exports = {}

  , require = Cu.import('resource://fireworks/lib/require.js', null).require

  , events = require('events')
  ;


// Hashing function.
//
// #### Params
//  * `target` {string} The target string to hash.
//  * `algo` {string} Only 'SHA1' and 'MD5' are supported.
exports.hash = function (target, algo /*TODO: charset */) {
	var uc = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
			       .createInstance(Ci.nsIScriptableUnicodeConverter)

    , hasher = Cc["@mozilla.org/security/hash;1"]
			           .createInstance(Ci.nsICryptoHash)
		, data, hash;

	uc.charset = 'UTF-8';
	data = uc.convertToByteArray(target, {});

  algo = algo +'';
  if (algo.toUpperCase() === 'SHA1') {
	  hasher.init(hasher.SHA1);
  }
  else {
	  hasher.init(hasher.MD5);
  }
	hasher.update(data, data.length);
	hash = hasher.finish(false);

	function toHexString(charCode) {
		return ('0' + charCode.toString(16)).slice(-2);
	}

	return Array.prototype
		.map.call(hash, function (x){ return x.charCodeAt(0); })
		.map(toHexString)
		.join('');
};

// Make a sha1 hash of the target string.
exports.sha1 = function (target) {
  return exports.hash(target, 'SHA1');
};

// Make an md5 hash of the target string.
exports.md5 = function (target) {
  return exports.hash(target, 'MD5');
};

function load(cb) {
  events.enqueue(function () {
    cb('hashlib', exports);
  }, 0);
}

