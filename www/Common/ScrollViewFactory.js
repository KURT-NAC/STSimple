(function(exports){

    var ScrollView = require('ScrollView').ScrollView;
    var PageView = require('PageView').PageView;

    // PhoneGap / iOS doesn't expose detailed model info
    // so using resolution as a proxy.
    function iPhone4orLower()
    {
        if (g_game.onDevice && window.innerHeight <= 960)
            return true;
        else
            return false;
    }

    function ScrollViewFactory()
    {
        if (iPhone4orLower())
        {
            console.log("creating a page view");
            return new PageView();
        }
        else
        {
            console.log("creating a scroll view");
            return new ScrollView();
        }
    }

    exports.ScrollViewFactory = ScrollViewFactory;

})(typeof exports === 'undefined'? _modules['ScrollViewFactory']={} : exports);