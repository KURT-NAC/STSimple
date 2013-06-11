(function(exports){

    function TimerActor()
    {
        TimerActor.superclass.constructor.call(this);
        return this;
    }

    TimerActor.prototype =
    {
        timeStart : null,
        timeEnd : null,
        lastSeconds : null,

        text : null,

        init : function(config)
        {
            var self = this;

            // background actor
            var background = new CAAT.Actor();
            background.setBackgroundImage(g_loader.getResult(config.backgroundImg),true);
            background.setPosition(0,0);
            self.addChild(background);

            // container bounds to background image size
            self.setSize(background.width,background.height);

            // time text actor
            self.text = new CAAT.TextActor();
            self.text.setText( self.getElapsedString(0, true) );
            self.text.setFont(config.font);
            self.text.setTextFillStyle(config.fill);
            self.text.setTextAlign('center');
            self.text.setTextBaseline('middle');
            self.text.setPosition( self.width/2, self.height/2);
            self.addChild(self.text);

            self.timeEnd = null;
            self.timeStart = null;
            self.lastSeconds = 0;

            return self;
        },

        animate : function(director,time)
        {
            var self = this;

            var delta = self.getElapsedSeconds();
            if (delta != self.lastSeconds)
            {
                self.lastSeconds = delta;
                self.text.setText( self.getElapsedString(delta, true) );
            }
            return TimerActor.superclass.animate.call(this,director,time);
        },

        start : function()
        {
            var self = this;

            self.timeEnd = null;
            self.timeStart = new Date();
        },

        stop : function()
        {
            var self = this;
            self.timeEnd = new Date();
        },

        setTime : function(milliseconds)
        {
            var self = this;
            self.timeStart = new Date();
            self.timeEnd = new Date( self.timeStart.getTime() + milliseconds );
        },

        getElapsedMilliseconds : function()
        {
            var self = this;

            if (!self.timeStart)
                return 0;
            else if (self.timeEnd)
                return self.timeEnd.getTime() - self.timeStart.getTime();
            else
                return (new Date()).getTime() - self.timeStart.getTime();
        },

        getElapsedSeconds : function()
        {
            var self = this;
            return Math.floor( self.getElapsedMilliseconds() / 1000);
        },

        getElapsedString : function(secs, useSpaces)
        {
            var self = this;

            var HOUR_TO_SEC = 3600;
            var MIN_TO_SEC = 60;

            var minutes = Math.floor(secs/MIN_TO_SEC);
            secs -= minutes * MIN_TO_SEC;

            var txt = "";

            if (minutes < 10)
                txt += "0" + minutes;
            else
                txt += "" + minutes;

            if (secs < 10)
                txt += (useSpaces ? " : 0" : ":0") + secs;
            else
                txt += (useSpaces ? " : " : ":") + secs;

            return txt;
        }
    }

    extend(TimerActor, CAAT.ActorContainer);
    exports.TimerActor = TimerActor;

})(typeof exports === 'undefined'? _modules['TimerActor']={} : exports);