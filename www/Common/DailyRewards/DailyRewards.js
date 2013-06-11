(function(exports){

    function DailyRewards()
    {
        DailyRewards.superclass.constructor.call(this);
        return this;
    }

    DailyRewards.prototype =
    {
        scene: null,
        div: null,
        visible: false,

        bg: null,
        callback: null,

        timer: null,

        NUM_DAYS: 5,
        NUM_BUTTON_ICONS: 9,
        POP_IN_TIME: 400,
        POP_OUT_TIME: 100,
        BASIC_PRIZE: 1,
        MEGA_PRIZE: 6,

        prizePopup:null,

        daysCompleted: 0,
        arDayButtons: null,
        alphaBehavior: null,
        scaleBehavior: null,
        prizeAlphaBehaviorIn: null,
        prizeScaleBehaviorIn: null,
        prizeAlphaBehaviorOut: null,
        prizeScaleBehaviorOut: null,

        addToManifest : function(manifest)
        {
            manifest.dailyRewardsMainLayout = "Common/DailyRewards/dailyrewards_main_view.json";

            if (typeof manifest.dailyRewardBkgd === 'undefined')
                manifest.dailyRewardBkgd = "Common/DailyRewards/dailyRewardPopup.png";
            if (typeof manifest.giftIcon === 'undefined')
                manifest.giftIcon = "Common/DailyRewards/gift.png";
            if (typeof manifest.prizePopup === 'undefined')
                manifest.prizePopup = "Common/DailyRewards/prizePopup.png";
            if (typeof manifest.closeBtn === 'undefined')
                manifest.closeBtn = "Common/SharedAssets/close_button.png";
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'dailyRewards', g_loader.getResult('dailyRewardsMainLayout'));
        },

        init: function()
        {
            var self = this;

            self.postLoad();

            g_layout.setActive('main', 'dailyRewards');

            self.dialogContainer = new CAAT.ActorContainer();
            var dialogOffset = g_layout.getElementInPage('sub', 'dailyRewards', 'offset');
            self.dialogContainer.setPosition(dialogOffset.x, dialogOffset.y);

            var el = g_layout.getElementFromActive("drop");
            el.width = g_game.fullWidth;
            el.height = g_game.fullHeight;
            el.x = el.width/2;
            el.y = el.height/2;
            self.initialize(0, 0, SnTCanvasHelper.attachToCanvas('#dailyRewardsCanvas',el.width,el.height));
            self.setSoundEffectsEnabled(false);
            self.scene = self.createScene();
            self.dialogContainer.setSize(el.width,el.height);

            self.scene.addChild((new CAAT.Actor()).setBackgroundImage(g_loader.getResult(el.id), true));
            var drop = self._applyElementToMostRecentActor(el, self.scene);

            // make sure that we block all input behind us
            drop.enableEvents(true);
            drop.mouseClick = self._DoNothing();
            drop.mouseEnter = self._DoNothing();
            drop.mouseExit = self._DoNothing();
            drop.mouseDown = self._DoNothing();
            drop.mouseUp = self._DoNothing();

            var el = g_layout.getElementFromActive("bg");
            self.dialogContainer.addChild((new CAAT.Actor().setBackgroundImage(g_loader.getResult(el.id), true)));
            self.bg = self._applyElementToMostRecentActor(el, self.dialogContainer);
            self.bg.enableEvents(false);

            g_layout.addAllElementsToObject(self.dialogContainer, "main", "dailyRewards", "title");
            g_layout.addAllElementsToObject(self.dialogContainer, "main", "dailyRewards", "instruction");

            self.arDayButtons = new Array();
            for (var i = 0; i < self.NUM_DAYS; i++)
            {
                self._addDayButton(i);
            }

            // prize popup
            self.prizePopup = new CAAT.ActorContainer(CAAT.ActorContainer.AddHint.CONFORM);
            g_layout.addAllElementsToObject(self.prizePopup, "main", "dailyRewards", "prize");
            self.prizePopup.setPositionAnchored(384, 675, 0.5, 0.5);

            self.prizeAlphaBehaviorIn = new CAAT.AlphaBehavior()
                .setCycle(false)
                .setValues(0,1)

            var bounce = new CAAT.Interpolator().createBounceOutInterpolator(false);
            self.prizeScaleBehaviorIn = new CAAT.ScaleBehavior()
                .setCycle(false)
                .setValues(0.1, 1, 0.1, 1)
                .setInterpolator(bounce);

            self.prizeAlphaBehaviorOut = new CAAT.AlphaBehavior()
                .setCycle(false)
                .setValues(1,0)

            self.prizeScaleBehaviorOut = new CAAT.ScaleBehavior()
                .setCycle(false)
                .setValues(1, 0.1, 1, 0.1);

            self.prizePopup.addBehavior(self.prizeAlphaBehaviorIn);
            self.prizePopup.addBehavior(self.prizeScaleBehaviorIn);
            self.prizePopup.addBehavior(self.prizeAlphaBehaviorOut);
            self.prizePopup.addBehavior(self.prizeScaleBehaviorOut);
            self.prizePopup.visible = false;
            self.dialogContainer.addChild(self.prizePopup);

            // close button
            var el = g_layout.getElementFromActive("closeBtn");
            var button = g_layout.createFancyButton(el, self._onCloseDialog());
            self.dialogContainer.addChild(button);

            self.alphaBehavior = new CAAT.AlphaBehavior()
                .setCycle(false)
                .setValues(0,1)

            self.scaleBehavior = new CAAT.ScaleBehavior()
                .setCycle(false)
                .setValues(0.1, 1, 0.1, 1)
                .setInterpolator(bounce);

            self.dialogContainer.addBehavior(self.alphaBehavior);
            self.dialogContainer.addBehavior(self.scaleBehavior);
            self.scene.addChild(self.dialogContainer);

            self.div = $("#dailyRewardsCanvas");
            self.hide();

            return self;
        },

        _addDayButton: function(index)
        {
            var self = this;

            var spacing = g_layout.getElementFromActive("spacing");
            var el = g_layout.getElementFromActive("dayButton");

            var button = g_layout.createFancyButton(el, self._DoNothing());
            button.enableEvents(false);

            button.setPosition(spacing.x, spacing.y + index * spacing.incr);

            var mega = index === self.NUM_DAYS-1;

            var theText = mega ? "Mega Prize" : "Day " + (index+1);
            button.setText(theText);

            if (mega)
            {
                button.theButton.setButtonState((require('ThreeSliceActor').ThreeSliceActor).BUTTON_PRESSED);
            }
            else
            {
                for (var i = 3; i < self.NUM_BUTTON_ICONS; i++)
                {
                    button.setImageVisible(i, i == 4);
                }
            }

            button.setImageAlpha(1, spacing.alpha);
            button.scaleImage(1, spacing.dimScaleX, spacing.dimScaleY);

            self.arDayButtons.push(button);
            self.dialogContainer.addChild(button);
        },

        _adjustActiveDays: function()
        {
            var self = this;

            for (var i = 0; i < self.NUM_DAYS; i++)
            {
                var complete = i <= self.daysCompleted;
                var button = self.arDayButtons[i];

                button.setImageVisible(1, complete);
                button.setImageVisible(2, complete);

                for (var j = 3; j < self.NUM_BUTTON_ICONS; j++)
                {
                    button.setImageVisible(j, (j == 4 || i == self.NUM_DAYS-1) && !complete);
                }
            }
        },

        _adjustPrize: function()
        {
            var self = this;

            var mega = self.daysCompleted === self.NUM_DAYS-1;
            var coins = g_layout.getActorFromArrayByID(self.prizePopup.childrenList, "largeCoin", true);

            for (var i = 0; i < coins.length; i++)
            {
                coins[i].visible = (mega && i < coins.length-1) || (!mega && i == coins.length-1);
            }
        },

        _givePrize: function()
        {
            var self = this;

            return function()
            {
                var mega = self.daysCompleted === self.NUM_DAYS-1;
                g_game.inventory.addMoney(mega ? self.MEGA_PRIZE : self.BASIC_PRIZE, true);

                self.prizePopup.visible = true;
                self.prizeAlphaBehaviorIn.setFrameTime(self.scene.time, self.POP_IN_TIME);
                self.prizeScaleBehaviorIn.setFrameTime(self.scene.time, self.POP_IN_TIME);
                window.setTimeout(self._hidePrize(), 2000);
            }
        },

        _hidePrize: function()
        {
            var self = this;

            return function()
            {
                self.prizePopup.visible = true;
                self.prizeAlphaBehaviorOut.setFrameTime(self.scene.time, self.POP_OUT_TIME);
                self.prizeScaleBehaviorOut.setFrameTime(self.scene.time, self.POP_OUT_TIME);

                self.prizeScaleBehaviorOut.emptyListenerList();
                self.prizeScaleBehaviorOut.addListener({
                    behaviorExpired : function(behavior, time, actor) {
                        self.prizePopup.visible = false;
                    }
                });
            }
        },

        show: function(daysComplete, callback)
        {
            var self = this;
            callback = callback||null;

            if (self.bg === null)
                throw new Error("Daily Reward dialog attempted to be shown without being created");

            if (self.visible && self.timer !== null)
            {
                self.timer.cancel();
            }

            self.scene.setPaused(false);
            self.stopped = false;
            self.callback = callback;
            self.visible = true;

            self.daysCompleted = daysComplete;
            self._adjustActiveDays();
            self._adjustPrize();

            // NOTE: this timer fixes a bug where when the dialog shows itself it renders a garbage layout for a few seconds
            //          moving to using director.stopped instead of just scene.paused alleviated this partially and this timer
            //          seems to be the final touch
            self.timer = self.scene.createTimer(self.scene.time, 100,
                function(sceneTime, timerTaskTime, timerTask)
                {
                    self.div.show();
                    self.timer = null;

                    self.alphaBehavior.setFrameTime(self.scene.time, self.POP_IN_TIME);
                    self.scaleBehavior.setFrameTime(self.scene.time, self.POP_IN_TIME);
                    window.setTimeout(self._givePrize(), 500);
                },
                null,null);

            return self;
        },

        hide: function()
        {
            var self = this;

            self.prizePopup.visible = false;

            self.scene.setPaused(true);
            self.stopped = true;
            self.callback = null;
            self.visible = false;

            self.div.hide();

            return self;
        },

        _onCloseDialog: function()
        {
            var self = this;

            return function(event)
            {
                self.hide();
            }
        },

        _DoNothing: function()
        {
            return function(event)
            {
            }
        },

        ////////////////////////
        // Helpers
        _applyElementToMostRecentActor: function(element, container)
        {
            var self = this;
            var actor = container.childrenList[container.childrenList.length-1];
            g_layout.applyElementToCAATActor(element, actor);
            return actor;
        }
    };

    extend(DailyRewards, require('GameDirector').GameDirector);
    exports.DailyRewards = DailyRewards;

})(typeof exports === 'undefined'? _modules['DailyRewards']={} : exports);
