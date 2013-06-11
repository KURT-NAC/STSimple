(function(exports){

    function GenericDialog()
    {
        GenericDialog.superclass.constructor.call(this);
        return this;
    }

    GenericDialog.prototype =
    {
        scene: null,
        div: null,
        visible: false,
        cancelAdded: true,

        dialogContainer: null,
        storeDialog: null,   // TOTAL HACK TO ALLOW PREVENTION OF Z-FIGHTING TEXT

        bg: null,
        hasAnim: false,
        animData: null,
        animator: null,
        animBehavior1: null,
        animBehavior2: null,

        // dynamic actors
        title: null,
        arBody: null,
        lineSpaceAdjust: 0,

        ok: null,
        okTxt: null,
        okX: 0,

        cancel: null,
        cancelTxt: null,
        cancelX: 0,

        callback: null,
        listener: null,

        timer: null,

        initialized: false,

        addToManifest : function(manifest)
        {
            manifest.genericMainLayout = "Common/GenericDialog/genericdialog_main_view.json";
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'genericDialog', g_loader.getResult('genericMainLayout'));
        },

        init: function(store)
        {
            var self = this;

            self.storeDialog = store;

            self.postLoad();

            g_layout.setActive('main', 'genericDialog');

            self.lineSpaceAdjust = require('LayoutManager').LayoutManager.DEFAULT_LINESPACE_FACTOR;

            // static actors
            self.dialogContainer = new CAAT.ActorContainer();
            var dialogOffset = g_layout.getElementInPage('sub', 'genericDialog', 'offset');
            self.dialogContainer.setPosition(dialogOffset.x, dialogOffset.y);

            var el = g_layout.getElementFromActive("drop");
            el.width = g_game.fullWidth;
            el.height = g_game.fullHeight;
            el.x = el.width/2;
            el.y = el.height/2;
            self.initialize(0, 0, SnTCanvasHelper.attachToCanvas('#genericDialogCanvas',el.width,el.height));
            self.setSoundEffectsEnabled(false);
            self.scene = self.createScene();
            self.dialogContainer.setSize(el.width,el.height);

            self.scene.addChild((new CAAT.Actor()).setBackgroundImage(g_loader.getResult(el.id), true));
            el = self._applyElementToMostRecentActor(el, self.scene);

            // make sure that we block all input behind us
            el.enableEvents(true);
            el.mouseClick = self._DoNothing();
            el.mouseEnter = self._DoNothing();
            el.mouseExit = self._DoNothing();
            el.mouseDown = self._DoNothing();
            el.mouseUp = self._DoNothing();

            // process animations if any
            self.animData = g_layout.getElementFromActive('animation');
            self.hasAnim = !!self.animData.type;

            if (self.hasAnim)
            {
                el = g_layout.getElementFromActive("animator");
                self.dialogContainer.addChild((new CAAT.Actor().setBackgroundImage(g_loader.getResult(el.id), true)));
                self.animator = self._applyElementToMostRecentActor(el, self.dialogContainer);
                self.animator.enableEvents(false);

                // setup rotation behaviors
                self.animBehavior1 = self._createAnimBehavior(false);
                self.animator.addBehavior(self.animBehavior1);

                if (self.animData.pingPong)
                {
                    self.animBehavior2 = self._createAnimBehavior(true);
                    self.animator.addBehavior(self.animBehavior2);
                }
            }

            el = g_layout.getElementFromActive("bg");
            self.dialogContainer.addChild((new CAAT.Actor().setBackgroundImage(g_loader.getResult(el.id), true)));
            self.bg = self._applyElementToMostRecentActor(el, self.dialogContainer);
            self.bg.enableEvents(false);

            if (self.hasAnim && self.animData.forceFront)
            {
                self.dialogContainer.setZOrder(self.animator, 1000);
            }

            // dynamic actors
            el = g_layout.getElementFromActive("title");
            self.title = new CAAT.TextActor();
            self.dialogContainer.addChild(self.title);
            g_layout.applyElementToCAATActor(el, self.title, true);

            self.arBody = new Array();

            // ok button
            var clickEvent = function(evt){ self._okClicked(evt); };
            el = g_layout.getElementFromActive('okBtn');
            self.ok = g_layout.createNavigationButton(el, clickEvent);
            self.dialogContainer.addChild(self.ok);
            self.okX = self.ok.x;

            // cancel button
            clickEvent = function(evt){ self._cancelClicked(evt); };
            el = g_layout.getElementFromActive('cancelBtn');
            self.cancel = g_layout.createNavigationButton(el, clickEvent);
            self.dialogContainer.addChild(self.cancel);
            self.cancelX = self.cancel.x;

            self.scene.addChild(self.dialogContainer);

            self.setText("", "", "", "");

            // simple key listener
            self.listener = self._keyboardInput();
            CAAT.registerKeyListener(self.listener);

            self.div = $("#genericDialogCanvas");
            //self.div.css('z-index', 1000);
            self.hide();

            self.initialized = true;

            return self;
        },

        _createAnimBehavior: function(pingPong)
        {
            var self = this;
            var behavior;

            switch (self.animData.type)
            {
                case "rotate":
                    var rad1 = (pingPong ? self.animData.valueX2 : self.animData.valueX1) * Math.PI / 180;
                    var rad2 = (pingPong ? self.animData.valueX1 : self.animData.valueX2) * Math.PI / 180;
                    behavior = new CAAT.RotateBehavior().setValues(rad1, rad2, self.animData.regX, self.animData.regY);
                    break;
                case "scale":
                    var valX1 = pingPong ? self.animData.valueX2 : self.animData.valueX1;
                    var valX2 = pingPong ? self.animData.valueX1 : self.animData.valueX2;
                    var valY1 = pingPong ? self.animData.valueY2 : self.animData.valueY1;
                    var valY2 = pingPong ? self.animData.valueY1 : self.animData.valueY2;
                    behavior = new CAAT.ScaleBehavior().setValues(valX1, valX2, valY1, valY2, self.animData.regX, self.animData.regY);
                    break;
                case "alpha":
                    var valX1 = pingPong ? self.animData.valueX2 : self.animData.valueX1;
                    var valX2 = pingPong ? self.animData.valueX1 : self.animData.valueX2;
                    behavior = new CAAT.AlphaBehavior().setValues(valX1, valX2);
                    break;
                default:
                    return null;
            }

            if ((!pingPong && self.animData.interp) || (pingPong && self.animData.pingInterp))
            {
                var interp = new CAAT.Interpolator().createBounceOutInterpolator(false);
                behavior.setInterpolator(interp);
            }

            return behavior;
         },

        _startAnimBehavior: function()
        {
            var self = this;

            self.animBehavior1.emptyListenerList();

            if (self.animBehavior2)
            self.animBehavior2.emptyListenerList();

            self.animBehavior1.setFrameTime(self.scene.time + self.animData.delay, self.animData.duration);

            if (typeof self.animData.sound !== 'undefined' && self.animData.soundAtStart)
                g_game.audioManager.playSound(self.animData.sound);

            if (self.animData.pingPong)
            {
                self.animBehavior1.addListener({
                    behaviorExpired : function(behavior, time, actor) {
                        if (typeof self.animData.sound !== 'undefined' && !self.animData.soundAtStart)
                            g_game.audioManager.playSound(self.animData.sound);

                        if (typeof self.animData.pingSound !== 'undefined' && self.animData.pingSoundAtStart)
                            g_game.audioManager.playSound(self.animData.pingSound);

                        self.animBehavior2.setFrameTime(time + self.animData.pingDelay, self.animData.pingDuration);
                    }
                });

                if (typeof self.animData.pingSound !== 'undefined' && !self.animData.pingSoundAtStart)
                {
                    self.animBehavior2.addListener({
                        behaviorExpired : function(behavior, time, actor) {
                            g_game.audioManager.playSound(self.animData.pingSound);
                        }
                    });
                }
            }
        },

        cleanup: function(deep)
        {
            var self = this;
            var i = CAAT.keyListeners.indexOf(self.listener);
            CAAT.keyListeners.slice(i, 1);
        },

        _keyboardInput: function()
        {
            var self = this;
            return function(keyEvent)
            {
                if (!self.visible)
                    return;

                if (keyEvent.action === "down")
                    return;

                if (keyEvent.keyCode === CAAT.Keys.ENTER)
                {
                    keyEvent.preventDefault();
                    self.ok.mouseClick({});
                }

                else if (keyEvent.keyCode === CAAT.Keys.ESCAPE)
                {
                    keyEvent.preventDefault();
                    if (self.cancelAdded)
                        self.cancel.mouseClick({});
                    else
                        self.ok.mouseClick({});
                }
            }
        },

        show: function(title,body,ok,cancel,callback)
        {
            var self = this;
            callback = callback||null;

            if (self.bg === null)
                throw new Error("Generic dialog attempted to be shown without being created");

            if (self.visible)
            {
                self.timer.cancel();
            }

            self.scene.setPaused(false);
            self.stopped = false;
            self.setText(title, body, ok, cancel);
            self.callback = callback;
            self.visible = true;

            if (self.storeDialog.active)
                self.storeDialog.stopped = true;    // HACK TO STOP Z-FIGHTING WITH STORE

            // NOTE: this timer fixes a bug where when the dialog shows itself it renders a garbage layout for a few seconds
            //          moving to using director.stopped instead of just scene.paused alleviated this partially and this timer
            //          seems to be the final touch
            self.timer = self.scene.createTimer(self.scene.time, 100,
                function(sceneTime, timerTaskTime, timerTask)
                {
                    self.div.show();
                    self.timer = null;
                },
                null,null);

            if (self.hasAnim)
                self._startAnimBehavior();

            return self;
        },

        hide: function()
        {
            var self = this;

            self.scene.setPaused(true);
            self.stopped = true;
            self.callback = null;
            self.visible = false;

            if (self.storeDialog.active)
                self.storeDialog.stopped = false;    // HACK TO STOP Z-FIGHTING WITH STORE

            self.div.hide();

            return self;
        },

        setText: function(title,body,ok,cancel)
        {
            var self = this;

            // get the left edge independent of anchoring
            var bgXL = self.bg.x - (self.bg.width * self.bg.tAnchorX);

            // get bg center independent of anchoring
            var bgCX = bgXL + (self.bg.width*0.5);
            var bgCY = (self.bg.y - (self.bg.height * self.bg.tAnchorY)) + (self.bg.height*0.55);

            self.title.setText(title);
            self.title.setSize(self.title.textWidth, self.title.textHeight);

            // handle possibly multi-line body text
            for (var i = 0; i < self.arBody.length; i++)
            {
                var curTxt = self.arBody[i];
                self.dialogContainer.removeChild(curTxt);
                curTxt.setParent(null);
                curTxt.setDiscardable(true);
                curTxt.setExpired();
            }

            self.arBody = self.arBody.slice(0, self.arBody.length);
            self.arBody.length = 0;

            var arTxt = body.split('\n');
            var el = g_layout.getElementInPage('main', 'genericDialog', 'text');

            for (var i = 0; i < arTxt.length; i++)
            {
                var txt = new CAAT.TextActor();
                g_layout.applyElementToCAATActor(el, txt, true);

                txt.setText(arTxt[i])
                    .enableEvents(false);

                var bgTop = (self.bg.y - (self.bg.height * self.bg.tAnchorY));
                var lineSpace = txt.textHeight + (txt.textHeight * self.lineSpaceAdjust);
                var yPos =  bgTop + (self.bg.height - (arTxt.length * lineSpace)) * 0.6 + (i * lineSpace);
                txt.setPosition(bgCX, yPos);
                self.arBody.push(txt);
                self.dialogContainer.addChild(txt);
            }

            if (cancel && cancel.length > 0)
            {
                self.ok.setPosition(self.okX, self.ok.y);
                self.cancel.setPosition(self.cancelX, self.cancel.y);
                if (!self.cancelAdded)
                {
                    self.dialogContainer.addChild(self.cancel);
                    self.cancelAdded = true;
                }
            }
            else
            {
                var mod = 0.5 - self.ok.tAnchorX;
                self.ok.setPosition(bgCX - (self.ok.width * mod), self.ok.y);
                if (self.cancelAdded)
                {
                    self.dialogContainer.removeChild(self.cancel);
                    self.cancelAdded = false;
                }
            }

            self.ok.setText(ok);
            self.cancel.setText(cancel);

            self.scene.dirty = true;
            self.requestRepaint();
            return self;
        },

        _okClicked: function()
        {
            var self = this;
            var callback = null;

            if (self.callback)
            {
                callback = self.callback;
            }

            self.hide();

            if (callback)
                callback(true);
        },

        _cancelClicked: function()
        {
            var self = this;

            var callback = null;
            if (self.callback)
            {
                callback = self.callback;
            }

            self.hide();

            if (callback)
                callback(false);
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

    extend(GenericDialog, require('GameDirector').GameDirector);
    exports.GenericDialog = GenericDialog;

})(typeof exports === 'undefined'? _modules['GenericDialog']={} : exports);
