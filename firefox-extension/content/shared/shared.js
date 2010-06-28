var SHARED = {};

SHARED.validateString = function (str, short, long, reg) {
  str = (typeof str === 'string') ? str : '';
  var len = str.length;

  if (len < short) {
    throw 'too short';
  }
  if (len > long) {
    throw 'too long';
  }
  if (reg.test(str)) {
    throw 'invalid characters';
  }
  return str;
};

