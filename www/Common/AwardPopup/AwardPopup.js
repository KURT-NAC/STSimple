(function(exports){

    function AwardPopup()
    {
        AwardPopup.superclass.constructor.call(this);
        return this;
    }

    AwardPopup.prototype =
    {
        scene: null,
        div: null,
        visible: false,

        bg: null,
        callback: null,

        timer: null,

        awardName : null,
        awardImage : null,
        descIdx : -1,
        definitions : null,

        alphaBehavior: null,
        scaleBehavior: null,
        POP_IN_TIME: 400,

        addToManifest : function(manifest)
        {
            manifest.awardPopupMainLayout = "Common/AwardPopup/awardpopup_main_view.json";

            if (typeof manifest.awardPopupBkgd === 'undefined')
                manifest.awardPopupBkgd = "Common/AwardPopup/award_popup.png";
            if (typeof manifest.closeBtn === 'undefined')
                manifest.closeBtn = "Common/SharedAssets/close_button.png";
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'awardPopup', g_loader.getResult('awardPopupMainLayout'));
        },

        init: function()
        {
            var self = this;

            self.postLoad();

            g_layout.setActive('main', 'awardPopup');

            self.dialogContainer = new CAAT.ActorContainer();
            var dialogOffset = g_layout.getElementInPage('sub', 'awardPopup', 'offset');
            self.dialogContainer.setPosition(dialogOffset.x, dialogOffset.y);

            var el = g_layout.getElementFromActive("drop");
            el.width = g_game.fullWidth;
            el.height = g_game.fullHeight;
            el.x = el.width/2;
            el.y = el.height/2;
            self.initialize(0, 0, SnTCanvasHelper.attachToCanvas('#awardPopupCanvas',el.width,el.height));
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

            var el = g_layout.getElementFromActive("award");
            self.awardImage = new CAAT.Actor().setBackgroundImage(g_loader.getResult(el.id), true);
            self.dialogContainer.addChild(self.awardImage);
            self.bg = self._applyElementToMostRecentActor(el, self.dialogContainer);
            self.bg.enableEvents(false);

            self.awardName = new CAAT.TextActor();
            var element = g_layout.getElementFromActive('title');
            g_layout.applyElementToCAATActor(element, self.awardName, true, false);
            self.dialogContainer.addChild(self.awardName);

            // close button
            var el = g_layout.getElementFromActive("closeBtn");
            var button = g_layout.createFancyButton(el, self._onCloseDialog());
            self.dialogContainer.addChild(button);

            self.alphaBehavior = new CAAT.AlphaBehavior()
                .setCycle(false)
                .setValues(0,1)

            var bounce = new CAAT.Interpolator().createBounceOutInterpolator(false);
            self.scaleBehavior = new CAAT.ScaleBehavior()
                .setCycle(false)
                .setValues(0.1, 1, 0.1, 1)
                .setInterpolator(bounce);

            self.dialogContainer.addBehavior(self.alphaBehavior);
            self.dialogContainer.addBehavior(self.scaleBehavior);

            self.scene.addChild(self.dialogContainer);

            self.div = $("#awardPopupCanvas");
            self.hide();

            return self;
        },

        show: function(awardData, callback)
        {
            var self = this;
            callback = callback||null;

            if (self.bg === null)
                throw new Error("Award popup attempted to be shown without being created");

            if (self.visible && self.timer !== null)
            {
                self.timer.cancel();
            }

            self.awardName.text = awardData.name;
            self.awardImage.setBackgroundImage(g_loader.getResult(awardData.image), true);

            if (self.descIdx >= 0)
            {
                var removed = self.dialogContainer.childrenList.splice(self.descIdx, 1);
                removed[0].setDiscardable(true).
                    setExpired().
                    setParent(null);
            }

            var descElem = g_layout.getElementInPage("main", "awardPopup", "descText");
            var desc = awardData.description;
            self.descIdx = require('TextBreaker').TextBreaker.addTextArea(self.dialogContainer, desc, self, descElem, 0.6);

            self.scene.setPaused(false);
            self.stopped = false;
            self.callback = callback;
            self.visible = true;

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
                },
                null,null);

            return self;
        },

        hide: function()
        {
            var self = this;

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

    extend(AwardPopup, require('GameDirector').GameDirector);
    exports.AwardPopup = AwardPopup;

})(typeof exports === 'undefined'? _modules['AwardPopup']={} : exports);
