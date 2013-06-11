(function(exports){

    function PuzzleTopBar()
    {
        PuzzleTopBar.superclass.constructor.call(this);
        return this;
    }

    PuzzleTopBar.prototype =
    {
        timerBar : null,
        timerMe : null,
        timerOpp : null,
        timeBonus : null,
        timeBonusLabel : null,

        init: function(width,height,srcView,srcPage,owner,proxy)
        {
            var self = this;

            PuzzleTopBar.superclass.init.call(self, width,height,srcView,srcPage,owner,proxy);

            self.timerBar = g_layout.getActorFromArrayByID(self.scene.childrenList,"timerBar");
            self.timerMe = g_layout.getActorFromArrayByID(self.scene.childrenList,"timerMe");
            self.timerOpp = g_layout.getActorFromArrayByID(self.scene.childrenList,"timerOpp");
            self.timeBonus = g_layout.getActorFromArrayByID(self.scene.childrenList,"timeBonus");
            self.timeBonusLabel = g_layout.getActorFromArrayByID(self.scene.childrenList,"timeBonusLabel");

            self.showTimerArea(false);
        },

        showTimerArea : function(show,showOpp)
        {
            var self = this;

            self.timerBar.visible = show;
            self.timerMe.visible = show;
            self.timerOpp.visible = showOpp;
            self.timeBonus.visible = show;
            self.timeBonusLabel.visible = show;
        },

        setOpponentTimer : function(time)
        {
            var self = this;
            self.timerOpp.setTime(time);
        },

        setMyTimer : function(time)
        {
            var self = this;
            self.timerMe.setTime(time);
        },

        startMyTimer : function()
        {
            var self = this;
            self.timerMe.start();
        },

        stopMyTimer : function()
        {
            var self = this;
            self.timerMe.stop();
        },

        getMyTimerMilliseconds : function()
        {
            var self = this;
            return self.timerMe.getElapsedMilliseconds();
        }
    };

    extend(PuzzleTopBar, require('TopBar').TopBar);
    exports.PuzzleTopBar = PuzzleTopBar;

})(typeof exports === 'undefined'? _modules['PuzzleTopBar']={} : exports);
