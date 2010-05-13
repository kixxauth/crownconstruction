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
regexp: true,
newcap: true,
immed: true,
strict: true,
maxlen: 80
*/

/*global
Components: false,
window: false,
gBrowser: false,
HTMLDocument: false
*/

"use strict";

// Do the whole thing in an enclosure to seal ourselves off
// from that nasty global namespace.
(function () {

  // Create the regex here so we don't have to do it everytime we
  // get a page load event below.
  var baseURI_rx = /chrome:\/\/crownconstruction\/content\//,
  
    // Functions defined later.
    open_channel, get_request_handler;

  // Utility function to import modules.
  function require(id) {
    var m = Components.utils.import(
        "resource://crownconstruction/modules/"+ id +".js", null);
    return ((typeof m.exports === "object") ? m.exports : m);
  }

  // Wait for the chrome window to load before adding the event
  // listener to the gBrowser.
  window.addEventListener('load', function(loadEvent) {

    gBrowser.addEventListener('load', function (gBrowser_load_event) {
      var target = gBrowser_load_event.originalTarget;

      // We're only interested in HTMLDocument load events with a baseURI
      // that matches the regex we created earlier.
      if (target instanceof HTMLDocument && baseURI_rx.test(target.baseURI)) {
        open_channel(target);
      }

    }, true);

  }, false);

  open_channel = function (content_doc) {
    // Create the HTML element we'll be using to pass message events
    // between this privileged code and the un-priviged content page.
    var dom_node = content_doc.createElement('channel'),

      // Create the event we'll use to notify the content page that
      // the channel is open.
      init_event = content_doc.createEvent('Event'),

      // Functions to handle message events -- Defined below.
      message_event_handler, send_response,

      // Define a function to remove attached event listeners to try to avoid
      // memory leaking. It will be attached to the 'beforeunload' event.
      content_unload_handler = function (content_unload) {
        dom_node.removeEventListener(
            'message', message_event_handler, false);
        content_doc.defaultView.removeEventListener(
            'beforeunload', content_unload_handler, false);
      };

    // Handle request messages passed from the unprivileged content page.
    message_event_handler = (function () {
      var request_handler = get_request_handler();
      return function (msg_event) {
        request_handler(
            JSON.parse(dom_node.getAttribute('x-request')),
            send_response);
      };
    }());

    // Send the response back to the unprivileged content page.
    send_response = function (response) {
      var respond_event = content_doc.createEvent('Event');

      // Set the response text on the messaging DOM node we
      // injected into the content page.
      dom_node.setAttribute('x-response', JSON.stringify(response));

      // Init and fire an event to let the content page know that
      // the response is ready.
      respond_event.initEvent('x-response', true, true);
      dom_node.dispatchEvent(respond_event);
    };

    // We add an unload event listener here which removes attached event
    // listeners to try to avoid memory leaking.  The defualtView property of
    // the content document is a reference to the content window object itself. 
    content_doc.defaultView.addEventListener(
      'beforeunload', content_unload_handler, false);

    // Inject the HTML element into the content page and attach our
    // message passing event handler to it.
    content_doc.documentElement.appendChild(dom_node);
    dom_node.addEventListener('x-request', message_event_handler, false);

    // Initialize and fire an event to notify the content page
    // that we're ready for messages.
    init_event.initEvent('x-channelopen', true, true);
    content_doc.defaultView.dispatchEvent(init_event);
  };

  // If there is already a request handler running, return it.
  // Otherwise, create a new one and return it.
  get_request_handler = (function () {
    var request_handler;

    // We only want 1 request handler running at a time, so we memoize by
    // assigning it to the request_handler variable inside this closure.
    return function () {
      if (!request_handler) {
        return (request_handler = require('worker')
          .create(require('handlers').mapping));
      }
      return request_handler;
    };
  }());

}()); // Execute the enclosed function.

