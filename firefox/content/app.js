jQuery(
function application() {
  var worker = require("worker"),
      dcube = require("dcube"),
      ASSERT = require("assert"),
      doc = jQuery(document),
      root = jQuery("#root"),
      
      swap_deck = (function () {
        var decks = [
              jQuery("#deck_1"),
              jQuery("#deck_2"),
              jQuery("#deck_3"),
              jQuery("#deck_4")
            ],
            current_deck = decks[0];

        return function (deck, cc) {
            deck -= 1;
            dump("swap "+ deck +"\n");
            current_deck.hide("fast",
              function () {
                current_deck = decks[deck];
                current_deck.show("fast", cc);
              });
          };
      }());

  root.bind({
    "error": function init_error_handler(spec) {
    },
    "login": function init_login_handler(spec) {
      swap_deck(2,
        function () {
          // `this` is bound to the deck <div id="deck_2"> element.
          doc.keyup(
            function (ev) {
              if (ev.which !== 13) {
                return true;
              }
              var username = jQuery("#username").val(),
                  passkey = jQuery("#passphrase").val();

              try {
                username = dcube.validateUsername(username);
              } catch (usernameEx) {
                switch (usernameEx.message) {
                case "too short":
                  break;
                case "too long":
                  break;
                case "invalid characters":
                  break;
                }
              }
              try {
                passkey = dcube.validatePasskey(passkey);
              } catch (usernameEx) {
              }
            });
        });
    },
    "loading": function init_loading_handler(spec) {
    },
    "ready": function init_ready_handler(spec) {
    }
    });

  worker.init(
    function init(stat, spec) {
      root.trigger(stat, [spec]);
    });
});
