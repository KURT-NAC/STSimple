(function(exports){

    function NavigationButton()
    {
        NavigationButton.superclass.constructor.call(this);
        if (!NavigationButton.DEFAULT_SPRITE)
        {
            var el = g_layout.getUniversalElementInView("main", "stdButtonDefaults");
            if (el)
            {
                NavigationButton.setDefaultsLayout(el);
                return this;
            }

            console.log("NavigationButton has no defaults and could not set them from the LayoutManager");
        }
        return this;
    }

    NavigationButton.DEFAULT_SPRITE = false;
    NavigationButton.DEFAULT_MAP = "";
    NavigationButton.DEFAULT_ADJUST = 0;

    NavigationButton.setDefaults = function(spriteSheet, map, cap_left, bar, cap_right, adjust)
    {
        NavigationButton.DEFAULT_SPRITE = spriteSheet;
        NavigationButton.DEFAULT_MAP = map;
        NavigationButton.DEFAULT_ADJUST = adjust;
        NavigationButton.superclass.setDefaults.call(this, cap_left, bar, cap_right, adjust)
    };

    NavigationButton.setDefaultsLayout = function(layoutElement)
    {
        NavigationButton.DEFAULT_SPRITE = layoutElement['img'];
        NavigationButton.DEFAULT_MAP = layoutElement['map'];
        NavigationButton.DEFAULT_ADJUST = layoutElement['adjust'];
        require('FancyButton').FancyButton.setDefaultsLayout.call(this, layoutElement)
    };


    NavigationButton.prototype =
    {
        init: function(text, callback, adjust, font)
        {
            var self = this;

            adjust = adjust||NavigationButton.DEFAULT_ADJUST;
            font = font||null;

            var config = new Object();
            config.buttonImage = g_loader.getResult(NavigationButton.DEFAULT_SPRITE);
            config.map = g_loader.getResult(NavigationButton.DEFAULT_MAP);
            config.text = text;
            config.callback = callback;

            if (self.orientation === require('FancyButton').FancyButton.ORIENTATION_HORIZONTAL)
                NavigationButton.superclass.setVerticalAdjust(adjust);
            else
                NavigationButton.superclass.setHorizontalAdjust(adjust);

            NavigationButton.superclass.init.call(self, config);

            if (font)
                NavigationButton.superclass.setFont.call(self, font);

            return self;
        },

        decorate: function(iconName, element)
        {
            var self = this;

            NavigationButton.superclass.positionText.call(self, 0, element['textPos'], "center");
            if (iconName)
                NavigationButton.superclass.addImage.call(self, g_loader.getResult(iconName), element['iconPos'], true);

            return self;
        },

        setText: function(text)
        {
            var self = this;
            NavigationButton.superclass.setText.call(self, text);
            return self;
        }
    }

    extend( NavigationButton, require('FancyButton').FancyButton);
    exports.NavigationButton = NavigationButton;

})(typeof exports === 'undefined'? _modules['NavigationButton']={} : exports);