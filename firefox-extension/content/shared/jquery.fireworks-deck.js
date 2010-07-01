(function (jq, window, undefined) {
  jq.deck = function (jq_collection) {
    if (!jq_collection.jquery) {
      return;
    }

    var cards = {}, current_card, current_id;

    jq_collection.each(function (i, dom_element) {
      if (dom_element.id) {
        current_card = cards[dom_element.id] = jq(dom_element).hide();
      }
    });


    return function (card_id) {
      if (cards[card_id] && card_id !== current_id) {
        current_card.hide();
        current_card = cards[card_id];
        current_card.show();
        current_id = card_id;
      }
    };
  };
}(jQuery, window));
