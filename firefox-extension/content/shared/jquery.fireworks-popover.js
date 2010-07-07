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
window: false,
jQuery: false,
*/

"use strict";

(function (jq) {
  // spec {object} Options specification object.
  // spec.container {string | jQuery collection} The popover panel.
  // spec.message {string} The message to insert into the popover.
  // spec.offsets {object}
  // spec.offsets.top {number}
  // spec.offsets.left {number}
  // spec.animate {object}
  // spec.animate.show {number | string} Use jQuery .show()
  // spec.animate.fadIn {number | string} Use jQuery .fadeIn()
  // spec.animate.hide {number | string} Use jQuery .hide()
  // spec.animate.fadOut {number | string} Use jQuery .fadeOut()
  jq.fn.popover = function (spec, callback) {
    spec = spec || {};

    var target = (this.length === 1 ? this : jq(this[0]))
      , coords = target.offset()
      , container = (typeof spec.container === 'string' ?
                     jq(spec.container) : spec.container)
      , offsets = spec.offsets || {}
      , animate = spec.animate || {}
      , show = (typeof animate.show !== 'undefined')
      , fadeIn = (typeof animate.fadeIn !== 'undefined')
      , hide = (typeof animate.hide !== 'undefined')
      ;

    if (show || fadeIn) {
      container
        .css({
            position: 'absolute'
          , 'top': coords.top + (offsets.top || 0)
          , 'left': coords.left + (offsets.left || 0)
          })
        .text(spec.message || '')
        ;

      if (show) {
        container.show(animate.show, callback);
        return this;
      }
      container.fadeIn(animate.fadeIn, callback);
      return this;
    }

    if (hide) {
      container.hide(animate.hide, callback);
      return this;
    }
    container.fadeOut(animate.fadeOut, callback);
    return this;
  };
}(jQuery));
