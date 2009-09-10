let crownconstruction =
{
  onWindowLoad: function(e)
  {
   window.removeEventListener("load", arguments.callee, false);
   
   // add the toolbar button
   try {
     var firefoxnav = document.getElementById("nav-bar");
     var curSet = firefoxnav.currentSet;
     if (curSet.indexOf("crownconstruction-toolbarbutton") == -1)
     {
       var set;
       // Place the button before the urlbar
       if (curSet.indexOf("urlbar-container") != -1)
         set = curSet.replace(/urlbar-container/,
           "crownconstruction-toolbarbutton,urlbar-container");
       else  // at the end
         set = curSet + ",crownconstruction-toolbarbutton";
       firefoxnav.setAttribute("currentset", set);
       firefoxnav.currentSet = set;
       document.persist("nav-bar", "currentset");
       // If you don't do the following call, funny things happen
       try {
         BrowserToolboxCustomizeDone(true);
       }
       catch (e) { }
     }
   }
   catch(e) { }
  },

  onToolbarButton: function()
  {
    this.showLoginPanel();
  },

  showLoginPanel: function()
  {
    document.getElementById("crownconstruction-login-panel")
      .openPopupAtScreen(200, 300);
    window.setTimeout(function(){
          document.getElementById("crownconstruction-username-input").focus();
        }, 1);
    window.addEventListener("keydown", crownconstruction.onKeydown, false);
  },

  hideLoginPanel: function()
  {
    window.removeEventListener("keydown", crownconstruction.onKeydown, false);
    document.getElementById("crownconstruction-login-panel").
      hidePopup();
  },

  onKeydown: function(e)
  {
    if(e.keyCode != 13) return true;
    window.removeEventListener("keydown", crownconstruction.onKeydown, false);
    crownconstruction.submitLogin();
    return true;
  },

  submitLogin: function()
  {
    let username_input = document.getElementById(
        "crownconstruction-username-input").value;
    let passphrase_input = document.getElementById(
        "crownconstruction-password-input").value;

    // username does not exist
    if(username_input != "testpilot")
    {
      window.addEventListener("keydown", crownconstruction.onKeydown, false);
      username_input.value = '';
      crownconstruction.warnUser("no-username");
      username_input.select();
      username_input.focus();
    }
    // invalid password
    else if(passphrase_input != "pass")
    {
      window.addEventListener("keydown", crownconstruction.onKeydown, false);
      passphrase_input.value = '';
      crownconstruction.warnUser("invalid-password");
      passphrase_input.select();
      passphrase_input.focus();
    }
    // authenticated
    else
    {
      crownconstruction.hideLoginPanel();
      gBrowser.selectedTab =
        gBrowser.addTab("chrome://crownconstruction/content/menu.xhtml");
    }
  },

  warnUser: function(warning)
  {
    let message = '';
    if(warning == "no-username")
    {
      message = "That username does not exist.\n"+
        "Maybe there is a typo?";
    }
    if(warning == "invalid-password")
    {
      message = "That password was incorrect.\n"+
        "Maybe there is a typo?";
    }
    document.getElementById("crownconstruction-warnbox-content")
      .innerHTML = '<p>'+ message +'</p>';
    document.getElementById("crownconstruction-warnbox").setAttribute(
        "style", "display: block;");
    window.setTimeout(function() {
        document.getElementById("crownconstruction-warnbox").setAttribute(
          "style", "display: none;");
      }, 2500);
  },

  onUserSetup: function()
  {
    this.hideLoginPanel();
    gBrowser.selectedTab =
      gBrowser.addTab("chrome://crownconstruction/content/newuser.xhtml");
  }
};

Components.utils.import(
    "resource://crownconstruction/modules/authentication.js",
    crownconstruction);
window.addEventListener("load", crownconstruction.onWindowLoad, false);
