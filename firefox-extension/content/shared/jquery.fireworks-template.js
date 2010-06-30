(function (jq, un, window, undefined) {
  if (typeof un === 'undefined') {
    throw ('jquery.fireworks-template.js depends on '+
          'the presence of underscore.js as `_`.');
  }

  jq.fn.template = function (data, index) {
    var nodes = [], node;

    this.each(function () {
      var i = 0, children = this.childNodes;

      for (; i < children.length; i += 1) {
        if (children[i].nodeName === '#cdata-section') {
          nodes.push(children[i]);
        }
      }
    });

    node = nodes[(typeof index === 'number') ? index : 0];

    if (node) {
      return un.template(node.nodeValue, data);
    }
  };
}(jQuery, _, window));
