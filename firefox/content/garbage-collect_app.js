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


/*jslint
onevar: true,
undef: true,
nomen: true,
eqeqeq: true,
plusplus: true,
bitwise: true,
strict: true,
immed: true */

/*global
Components: false,
jQuery: false,
require: false,
dump: false,
document: false,
setTimeout: false,
alert: false
*/

"use strict";

var app = (function () {
var self = {};

self.expandForm = function app_expand_form(frag) {
  alert("hi");
};

return self;
    }());

jQuery(
function application() {
  var util = require("util"),
      atomic = require("atomic"),
      worker = require("worker"),
      //dcube = require("dcube"),
      //ASSERT = require("assert"),
      doc = jQuery(document),
      root = jQuery("#root"),

      // The login waiting function
      end_login_gui = function (f, args) { f.apply(null, args); },
      
      swap_deck = (function () {
        var decks = [
              jQuery("#deck_1"),
              jQuery("#deck_2"),
              jQuery("#deck_3")
            ],
            current_deck = decks[0];

        return function (deck, cc) {
            atomic.short_stack("swap_deck", 
              function (done) {
                root.trigger("hide-alert");
                deck -= 1;

                if (!decks[deck] || current_deck === decks[deck]) {
                  if (typeof cc === "function") {
                    cc();
                  }
                  done();
                  return;
                }

                current_deck.hide("fast",
                  function () {
                    current_deck = decks[deck];
                    current_deck.show("fast", 
                      function () {
                        if (typeof cc === "function") {
                          cc();
                        }
                        done();
                      });
                  });
              });
          };
      }()),
      
      show_alert = (function () {
        var box = jQuery("#gen-alert");
        root.bind("hide-alert", function () { box.hide(); });

        return function (msg) {
            box.find(".dynamic-content").replaceWith(
              '<span class="dynamic-content">'+ msg +'</span>');
            box.show().click(function () { box.hide("fast"); });
          };
      }()),
      
      gui_wait = (function () {
        var blockers = [], active = false,
            overlay = jQuery("#waiting"),
            message_box = document.getElementById("waiting-message");

        function update(msg) {
          var len = blockers.length;
          if (msg) {
            message_box.innerHTML = msg;
            if (!active) {
              active = true;
              overlay.show();
            }
          }
          else {
            if (len === 0) {
              active = false;
              overlay.hide();
            }
            else {
              message_box.innerHTML = blockers[len -1].message();
            }
          }
        }

        function blocker_constructor(message) {
          var self = {}, ready = false, complete = false,
              index, continuations = [];

          function execute_continuation(continuation, args, binding) {
            if (typeof binding === "object" || util.isArrayLike(args)) {
              binding = binding || null;
              continuation.apply(binding, args);
            }
            else {
              continuation();
            }
          }

          function try_me() {
            var i;

            if (complete) {
              return true;
            }

            if (ready && continuations.length) {
              complete = true;

              for (i = 0; i < continuations.length; i += 1) {
                execute_continuation(
                    continuations[i].continuation,
                    continuations[i].args,
                    continuations[i].binding);
              }

              blockers.splice(index, 1);
              update();
            }
          }

          self.unblock = function blocker_unblock(callback, args, binding) {
            if (typeof callback === "function") {
              if (complete) {
                execute_continuation(callback, args, binding);
                return;
              }

              continuations.push({
                continuation: callback,
                args: args,
                binding: binding});
              try_me();
            }
            else {
              ready = true;
              try_me();
            }
          };

          self.message = function blocker_message() {
            return message;
          };

          index = blockers.push(self) - 1;
          return self;
        }

        return function (message, tt) {
            var blocker = blocker_constructor(message);

            tt = (typeof tt === "number" && tt >= 0) ? tt : 1500;
            update(message);
            setTimeout(blocker.unblock, tt);
            return blocker.unblock;
          };

      }()),
      
      place_customer_search_widget = (function () {
        var widget = jQuery("#widgets")
                     .children(".customer-search-widget");

        return function (target) {
            var self = widget.clone();
            target.append(self);

            doc.keyup(
              function (ev) {
                if (ev.which !== 13) {
                  return false;
                }

                doc.unbind(ev);

                alert(self.children("input").val());
              });

            return self;
          };
      }());

  function logged_in() {
    dump("logged in\n");
  }

  root.bind({
    "error": function init_error_handler(ev, ex) {
      Components.utils.reportError(ex);

      switch (ex.name +":"+ ex.message) {
      case "Error:invalid database":
        end_login_gui(swap_deck, [1,
          function () {
            show_alert("A database has not been set up for "+
                       "Crown Construction. Please contact your "+
                       "system administrator about this problem.");
          }]);
        break;
      
      default:
        end_login_gui(swap_deck, [1,
          function () {
            show_alert("The system threw an exception that was not "+
                       "recognized: "+ ex.toString());
          }]);
      }
    },

    "login": function init_login_handler(ev, cc, reason) {
      end_login_gui(swap_deck, [2,
          function () {
            // `this` is bound to the deck <div id="deck_2"> element.
            switch (reason) {
            case "username too short":
              show_alert("A username must contain at least 1 character.");
              break;
            case "username too long":
              show_alert("A username may not contain more than "+
                         "144 characters.");
              break;
            case "username has bad characters":
              show_alert("A username may only contain the characters "+
                         "a-z, A-Z, 0-9, and '_'.");
              break;
            case "passkey too short":
              show_alert("A passphrase must contain at least 1 character.");
              break;
            case "passkey too long":
              show_alert("A passphrase may not contain more than "+
                         "144 characters.");
              break;
            case "user does not exist":
              show_alert("That username does not exist. "+
                         "Check for a typo and try again.");
              break;
            case "invalid passkey":
              show_alert("That passphrase was invalid. "+
                         "Check for a typo and try again.");
              break;
            }

            doc.keyup(
              function (ev) {
                if (ev.which !== 13) {
                  return false;
                }

                doc.unbind(ev);

                var username = jQuery("#username").val(),
                    passkey = jQuery("#passphrase").val(),
                    database;

                worker.databaseSandbox(jQuery("#fake-database")
                  .attr("checked"));
                worker.debug(jQuery("#debug-mode").attr("checked"));

                swap_deck(1);
                end_login_gui = gui_wait('<h3 class="wait"><img src="css/images/ui-anim_basic_16x16.gif" /> Logging in...</h3>');
                cc(username, passkey, database);
                return false;
              });
          }]);
    },

    "loading": function init_loading_handler(ev) {
      // pass
    },

    "ready": function init_ready_handler(ev) {
      jQuery("#tabs").tabs({
            selected: 0,
            select: function (ev, ui) {
              dump(ui.index +"\n");
            }
          });
      end_login_gui(swap_deck, [3, logged_in]);
    }
  });

  gui_wait('<h3 class="wait"><img src="css/images/ui-anim_basic_16x16.gif" /> Starting...</h3>')(
      function () {

        worker.init().then(

            // Maybe passed sorted data???
            function init_fulfill(results) {
              root.trigger("ready");
            },

            // Passed a JavaScript Error object.
            function init_exception(ex) {
              root.trigger("error", ex);
            },

            // Passed an event name string as the first param:
            //  - login
            //    - second param is a login callback function
            //  - login-error
            //    - second param is a reason string
            //    - third param is a login callback function
            //  - bad-credentials
            //    - second param is a reason string
            //    - third param is a login callback function
            //  - loading
            //    - no other params
            function init_progress(ev_name) {
              switch (ev_name) {
              case "login":
                root.trigger("login", arguments[1]);
                break;
              case "login-error":
                root.trigger("login", [arguments[2], arguments[1]]);
                break;
              case "bad-credentials":
                root.trigger("login", [arguments[2], arguments[1]]);
                break;
              case "loading":
                root.trigger("loading");
                break;
              }
            });
      });

  jQuery(".ui-ex-hover").hover(
        function() { jQuery(this).addClass('ui-state-hover'); }, 
        function() { jQuery(this).removeClass('ui-state-hover'); }
      );

});
