(function () {
  // Our toolbar button ID.
  var button_id = 'fireworks-launcher-toolstrip';

  function add_toolbar_button_listener() {
    var button = document.getElementById(button_id);

    // If the user has removed the button from the toolbar, we will not be
    // able to add our listener.
    if (button) {
      button.addEventListener('command', function (ev) {
        gBrowser.selectedTab = gBrowser.addTab('chrome://fireworks/content/crown_construction.xhtml');
      }, true);
    }
  }

  function install_toolbar_button() {
      // The Firefox toolbar
    var toolbar = document.getElementById('nav-bar')

      // Add our button to the end of the toolbar.
      , new_set = toolbar.currentSet +','+ button_id
      ;

    toolbar.setAttribute('currentset', new_set);
    toolbar.currentSet = new_set;
    document.persist('nav-bar', 'currentset');
    try {
      window.BrowserToolboxCustomizeDone(true);
    }
    catch (e) { }

    // Persist a flag so this script does not get run again.
    window.globalStorage[location.hostname]
      .setItem('fireworks-toolbar-installed', true)

    add_toolbar_button_listener();
  }

  window.addEventListener('load', function (ev) {
    // If this script has run before, we don't want to run it again, possibly
    // re-installing a toolbar button that the user has removed.
    if (window.globalStorage[location.hostname]
        .getItem('fireworks-toolbar-installed')) {
      add_toolbar_button_listener();
    }
    else {
      install_toolbar_button();
    }

    document.getElementById('menuitem-fireworks-sysadmin')
      .addEventListener('command', function (command) {
      gBrowser.selectedTab = gBrowser.addTab('chrome://fireworks/content/shared/admin.xhtml');
      }, false);
  }, false);
}());
