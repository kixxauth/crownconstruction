(function (require, jq, undefined) {
  var deck = jq.deck(jq('#main').children())
    , platform = require('platform')
    , console = platform.console
    , events = require('events')
    , log = require('logging').get('login')
    , db = require('dcube')
    , system_ready
    ;

  console.log('Start of application instance.');

  function ready() {
    log.info('System ready.');
    platform.addListener('quit', function () {
      log.info('Platform shutdown.');
    });
  }

  system_ready = events.Aggregate(ready);
  events.observeOnce('logging.ready', system_ready());
}(require, jQuery));

