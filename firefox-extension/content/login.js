jQuery(function (jq) {
  var db = require('dcube')
    , connections = db.connections()
    ;

  if (!connections || !connections.length) {
    dump('login: no connections\n');
  }
  else {
    dump('login: has connections\n');
  }
    /*
  jq('#login')
    .load('login-frag.xhtml', function (text, stat) {
    });
    */
});
