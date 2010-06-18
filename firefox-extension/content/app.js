(function (jq, undefined) {
  var deck = jq.deck(jq('#main').children())
    , Cu = Components.utils
    , require = Cu.import('resource://fireworks/lib/require.js', null).require

    , events = require('events')
    , platform = require('platform')
    , logging = require('logging')
    , log = logging.get('fireworks-boot')
    , console = platform.console
    ;

  console.log('Start Fireworks application instance.');

  function formatErr(e) {
    if (typeof e === 'string') {
      return e;
    }
    return (e.name +': '+ e.message +'\nfile: '+
            e.fileName +'\nline: '+ e.lineNumber +'\n');
  }

  events.addListener('error', function (err) {
    Cu.reportError(err);
    log.error(formatErr(err));
  });

  require.ensure(['logging', 'environ'], function (require) {
    var env = require('environ')
      , logging = require('logging')
      ;

    log = logging.get('fireworks' || env.LOG_NAME)
    log.info('Module system bootstrapped.');
  });
}(jQuery));

