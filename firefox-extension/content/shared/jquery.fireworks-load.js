(function (jq, window, undefined) {
  jq.fn.load = function (url, callback) {
    if (!this.length) {
      return this;
    }

		var self = this;

		// Request the remote document
		jq.ajax({
			url: url,
			type: 'GET',
			dataType: 'xml',
			complete: function(res, status) {
				// If successful, inject the HTML into all the matched elements
				if (status === "success" || status === "notmodified") {
          var overlay = jq('<div />').append(res.responseText);
          self.each(function (i, node) {
            // Locate the specified elements
            self.html(overlay.find('#'+ this.id).html());
          });
				}

				if (typeof callback === 'function') {
          callback(self);
				}
			}
		});

    return this;
  };
}(jQuery, window));
