(function(exports){

    function ToggleButton()
    {
        ToggleButton.superclass.constructor.call(this);
        if (require('FancyButton').FancyButton.DEFAULT_BAR.length <= 0)
        {
            var layout = (require("LayoutManager").LayoutManager).getInstance();
            if (layout)
            {
                var el = layout.getUniversalElementInView("main", "stdButtonDefaults");
                if (el)
                {
                    require('FancyButton').FancyButton.setDefaultsLayout.call(this, el);
                    return this;
                }
            }
            console.log("ToggleButton has no defaults and could not set them from the LayoutManager");
        }

        return this;
    }

    ToggleButton.prototype =
    {
        selected:false,
        theButton:null,
        callback:null,
        normalIdx:0,
        selectedIdx:0,
        swipe:false,
        swipeStarted:false,
        swipeHorizontal:true,
        swipeOrigin:0,
        isThreeSliced:false,
        clickAudioID: null,

        /*
         config parameter to init function can have the following members:
         "buttonImage":      image for the button itself (can be a 3-slice)
         "map":              json map data for a 3-slice
         "normalIdx":        index of button's normal state (non 3-slice)
         "overIdx":          index of button's over state (non 3-slice)
         "pressIdx":         index of button's pressed state (non 3-slice)
         "disabledIdx":      index of button's disabled state (non 3-slice)
         "text":             text string for button
         "orientation":      is button oriented horizontal or vertical?
         "callback":         callback function for button's on-click
         "swipe":            can toggle be swipe activated?
         "startSelected":    should button start in selected state?
         "clickAudio":       sound fx to play on click
         */

        init:function(config)
        {
            var self = this;

            config.normalIdx = config.normalIdx || 0;
            config.selectedIdx = config.pressIdx || 1;
            config.startSelected = config.startSelected || false;

            self.normalIdx = config.normalIdx;
            self.selectedIdx = config.selectedIdx;
            self.isThreeSliced = typeof config.map !== 'undefined';
            self.swipeHorizontal = config.orientation === require('FancyButton').FancyButton.ORIENTATION_HORIZONTAL;
            self.swipe = config.swipe || false;
            self.callback = config.callback;
            config.callback = self._emptyEvent();

            ToggleButton.superclass.init.call(self, config);

            self.mouseClick = self._onToggleClicked();
            self.mouseDown = self._onToggleDown();
            self.mouseDrag = self._onToggleDragged();
            self.mouseUp = self._emptyEvent();
            self.mouseEnter = self._emptyEvent();
            self.mouseExit = self._emptyEvent();
            self.enableEvents(true);

            if (config.startSelected)
                self.toggle();

            return self;
        },

        _emptyEvent : function()
        {
            var self = this;

            return function(mouseEvent)
            {
            }
        },

        _onToggleClicked : function()
        {
            var self = this;

            return function(mouseEvent)
            {
                self.swipeStarted = false;

                if (self.isRadioGroup() && self.selected)
                    return;

                self.toggle();

                if (self.isRadioGroup())
                    self.radioGroup.onButtonClicked(self.radioID);

                if (self.callback)
                    self.callback(self.selected);
            }
        },

        _onToggleDown : function()
        {
            var self = this;

            return function(mouseEvent)
            {
                if (self.swipe)
                {
                    self.swipeStarted = true;
                    self.swipeOrigin = self.swipeHorizontal ? mouseEvent.screenPoint.x : mouseEvent.screenPoint.y;
                }
            }
        },

        _onToggleDragged : function()
        {
            var self = this;

            return function(mouseEvent)
            {
                if (self.swipeStarted)
                {
                    if (self.isRadioGroup() && self.selected)
                    {
                        self.swipeStarted = false;
                        return;
                    }

                    var curPoint = self.swipeHorizontal ? mouseEvent.screenPoint.x : mouseEvent.screenPoint.y;

                    if (Math.abs(curPoint - self.swipeOrigin) > 10)
                    {
                        self.swipeStarted = false;
                        self.toggle();

                        if (self.isRadioGroup())
                            self.radioGroup.onButtonClicked(self.radioID);

                        if (self.callback)
                            self.callback(self.selected);
                    }
                }
            }
        },

        toggle : function(silent)
        {
            console.log("Toggling button");
            var self = this;
            self.selected = !self.selected;

            if (self.isThreeSliced)
            {
                self.theButton.setButtonState(self.selected ? require('ThreeSliceActor').ThreeSliceActor.BUTTON_PRESSED :
                    require('ThreeSliceActor').ThreeSliceActor.BUTTON_NORMAL);
            }
            else
            {
                self.theButton.setSpriteIndex(self.selected ? self.selectedIdx : self.normalIdx);
            }

            silent = silent || false;

            if (self.clickAudioID && !silent)
                g_game.audioManager.playSound(self.clickAudioID);

            return self;
        },

        setCallback: function(cb)
        {
            var self = this;
            self.callback = cb;
            return self;
        },

        isSelected: function()
        {
            var self = this;
            return self.selected;
        },

        setSelected: function(bSelected)
        {
            var self = this;
            self.selected = !bSelected;
            self.toggle(true);
            return self;
        },

        rotateBackground: function(angle)
        {
            var self = this;
            self.theButton.setRotationAnchored(angle, 0.5, 0.5);
            return self;
        },

        isRadioGroup: function()
        {
            var self = this;
            return (typeof self.radioGroup !== 'undefined' && typeof self.radioID !== 'undefined');
        },

        onRadioSelection: function(selectedID)
        {
            var self = this;

            if (!self.isRadioGroup())
                return;

            if (selectedID !== self.radioID)
            {
                self.toggle(true);
            }
        }
    };

    extend(ToggleButton, require('FancyButton').FancyButton);
    exports.ToggleButton = ToggleButton;

})(typeof exports === 'undefined'? _modules['ToggleButton']={} : exports);