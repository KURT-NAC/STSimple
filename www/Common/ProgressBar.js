(function(exports){

    function ProgressBar()
    {
        ProgressBar.superclass.constructor.call(this);

        return this;
    }

    ProgressBar.prototype =
    {
        fullImg : null,
        emptyImg : null,
        /*
         config parameter to init function can have the following members:
         "full":    image for a full progress bar
         "empty:    image for an empty progress bar
         */

        init : function(config)
        {
            var self = this;

            self.callback = config.callback || self._emptyEvent();

            self.mouseClick = self._emptyEvent();
            self.mouseDown = self._emptyEvent();
            self.mouseDrag = self._emptyEvent();
            self.mouseUp = self._emptyEvent();
            self.mouseEnter = self._emptyEvent();
            self.mouseExit = self._emptyEvent();
            self.enableEvents(true);

            var ClippedImage = require('ClippedImage').ClippedImage;
            if ("empty" in config)
            {
                self.emptyImg = new ClippedImage().init(config.empty);
                self.emptyImg.setPosition(0, 0);
                self.emptyImg.setVisible(false);
                self.emptyImg.enableEvents(false);
                self.addChild(self.emptyImg);
            }
            if ("full" in config)
            {
                self.fullImg = new ClippedImage().init(config.full);
                self.fullImg.setPosition(0, 0);
                self.fullImg.setVisible(false);
                self.fullImg.enableEvents(false);
                self.addChild(self.fullImg);
            }

            var xBound = config.boundX || Math.max(self.fullImg ? self.fullImg.width : 0, self.emptyImg ? self.emptyImg.width : 0);
            var yBound = config.boundY || Math.max(self.fullImg ? self.fullImg.height : 0, self.emptyImg ? self.emptyImg.height : 0);

            self.setSize(xBound, yBound);
            self.setBounds(0, 0, xBound, yBound);

            if ("value" in config)
                self.setValue(config.value);

            return self;
        },

        _emptyEvent : function()
        {
            var self = this;

            return function(mouseEvent)
            {
            }
        },

        setCallback : function(cb)
        {
            var self = this;
            self.callback = cb || self._emptyEvent();
            return self;
        },

        setValue : function (value)
        {
            var self = this;

            self.value = Math.max(0, Math.min(value, 1.0));
            self._displayValue();
        },

        _displayValue : function()
        {
            var self = this;

            var leftWidth = self.value * self.width;

            self.fullImg.setVisible(self.value > 0);
            if (self.fullImg.visible)
                self.fullImg.setClipInfo(0,0, leftWidth, self.height);
            self.emptyImg.setVisible(self.value < 1);
            if (self.emptyImg.visible)
            {
                self.emptyImg.setClipInfo(leftWidth, 0, self.width - leftWidth, self.height);
            }
        }
    };

    extend(ProgressBar, CAAT.ActorContainer);
    exports.ProgressBar = ProgressBar;

})(typeof exports === 'undefined'? _modules['ProgressBar']={} : exports);