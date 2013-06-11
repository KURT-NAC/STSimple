(function(exports){

    function ScrollView()
    {
        return this;
    }

    ScrollView.prototype =
    {
        ////////////////////////////////////////
        // CONSTANTS
        // DO NOT modify these programatically
        ScrollStates:{
            InputDown:'id',

            FreeScrollUp:'su',
            FreeScrollDown:'sd',
            ReturnToTop:'rt',
            ReturnToBottom:'rb',

            NotMoving:'nm'
        },
        maxOverScroll:50,
        bounceRange:200,

        returnSpeed:6.0,
        decelDamp:200.0,
        bounceDamp:500.0,
        velMax:1000.0,
        clampDist:4,
        ////////////////////////////////////////

        director:null,
        ownerScene:null,

        clipArea:null,
        fill:null,
        scrollContainer:null,
        idx:'x',
        offset:0,

        releaseLabel:null,
        releaseArrow:null,
        releaseCallback:null,
        releaseThresh:0,

        scrollTimer:null,
        lastFrameTime:0,

        fsm:null,

        velocity:0,
        lastPosition:0,
        input:0,
        min:0,
        minOverScroll:0,

        clickCallback:null,
        activeActor: null,
        lastClickedActor: {'idx':-1,actor:null},

        buttonsEnabled: false,

        tPos: null,

        init:function (x, y, width, height, horizontal, director, scene, clickCallback, colorfill, releaseCallback) {
            var self = this;

            colorfill = colorfill||[128,128,128,0];
            self.cleanup();

            self.idx = horizontal ? 'x' : 'y';
            self.offset = 0;
            self.ownerScene = scene;
            self.director = director;
            self.clickCallback = clickCallback;
            self.releaseCallback = releaseCallback;

            self.clipArea = new CAAT.ActorContainer().
                setBounds(x, y, width, height).
                setClip(true).
                cacheAsBitmap();

            self.scrollContainer = new CAAT.ActorContainer().
                setBounds(0, 0, width, height).
                enableEvents(true);

            var fillAlpha = colorfill[3];
            if (fillAlpha > 0)
            {
                self.fill = new CAAT.ShapeActor().
                    setShape(CAAT.ShapeActor.prototype.SHAPE_RECTANGLE).
                    setFillStyle((new CAAT.Color.RGB(colorfill[0], colorfill[2], colorfill[2])).toHex()).
                    setAlpha(fillAlpha).
                    setBounds(0, 0, width, height).
                    enableEvents(false).
                    cacheAsBitmap();

                self.clipArea.addChild(self.fill);
            }
            self.clipArea.addChild(self.scrollContainer);
            scene.addChild(self.clipArea);

            //if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/))
            if (false)//CAAT.TOUCH_BEHAVIOR === CAAT.TOUCH_AS_MULTITOUCH)
            {
                self.scrollContainer.touchStart = self._InputDown(true);
                self.scrollContainer.touchMove = self._InputMove(true, false);
                self.scrollContainer.touchEnd = self._InputUp(true);
            }
            else {
                self.scrollContainer.mouseDown = self._InputDown(false);
                self.scrollContainer.mouseDrag = self._InputMove(false, true);
                self.scrollContainer.mouseMove = self._InputMove(false, false);
                self.scrollContainer.mouseExit = self._InputExit();
                self.scrollContainer.mouseUp = self._InputUp(false);

                self.scrollContainer.mouseClick = self._scrollClick();
            }

            self.addReleaseToScroll();

            self.buildStates();
            self.startTimer();
            self.fsm.gotoState(self.ScrollStates.NotMoving);
        },

        hasUpdater:function()
        {
            var self = this;
            return self.releaseCallback != null;
        },

        addReleaseToScroll:function()
        {
            var self = this;

            if (!self.hasUpdater())
                return;

            var updater = new CAAT.ActorContainer();

            var bkgd = new CAAT.Actor();
            bkgd.setBackgroundImage(g_loader.getResult('sendMidBar'), true);
            bkgd.setPosition(0, -bkgd.height);

            updater.addChild(bkgd);
            updater.setSize(bkgd.width, bkgd.height);
            self.releaseThresh = bkgd.height;

            self.releaseLabel = new CAAT.TextActor();
            var element = g_layout.getElementInPage('sub', 'updateScrollView', 'message');
            g_layout.applyElementToCAATActor(element, self.releaseLabel, true, true);
            updater.addChild(self.releaseLabel);

            self.releaseArrow = new CAAT.Actor();
            self.releaseArrow.setBackgroundImage(g_loader.getResult('scrollArrow'), true);
            var element = g_layout.getElementInPage('sub', 'updateScrollView', 'arrow');
            self.releaseArrow.setPositionAnchored(element.x, element.y, 0.5, 0.5);
            //self.releaseArrow.setRotationAnchored(Math.PI*3/2, 0.5, 0.5);
            updater.addChild(self.releaseArrow);

            self.scrollContainer.addChild(updater);
        },

        addActor:function (actor, padding) {
            padding = padding || 0;
            var self = this;

            actor.collisionOK = actor.collisionOK||function(x,y){return true};
            self.scrollContainer.addChild(actor);

            if (self.horizontal()) {
                actor.setPosition(self.offset, (self.scrollContainer.height - actor.height) * 0.5).
                    enableEvents(false);

                if (self.offset < self.clipArea.width && actor.onBecomeVisibleInScroll)
                {
                    actor.onBecomeVisibleInScroll();
                }

                self.offset += actor.width + padding || 0;
                self.scrollContainer.setBounds(0, 0, self.offset, self.scrollContainer.height);

                self.min = (self.scrollContainer.width - self.clipArea.width) * -1;
            }
            else {
                actor.setPosition((self.scrollContainer.width - actor.width) * 0.5, self.offset).
                    enableEvents(false);

                if (self.offset < self.clipArea.height && actor.onBecomeVisibleInScroll)
                {
                    actor.onBecomeVisibleInScroll();
                }

                self.offset += actor.height + padding;
                self.scrollContainer.setBounds(0, 0, self.scrollContainer.width, self.offset);

                self.min = (self.scrollContainer.height - self.clipArea.height) * -1;
            }

            self.minOverScroll = self.min - self.maxOverScroll;
        },

        finalize: function()
        {
            var self = this;
            self.scrollContainer.cacheAsBitmap();
            //NOTE: Deep Caching fails, I'm guessing due to the children? (self.scrollContainer.time, CAAT.Actor.CACHE_DEEP);
        },

        snapToBottom : function()
        {
            var self = this;
            self.scrollContainer[self.idx] = self.min;
            self.scrollContainer.dirty = true;
            self.velocity = 0;
            self.fsm.gotoState(self.ScrollStates.NotMoving);
        },

        ////////////////////////////////////////////////////////
        // Scroll states

        _inputActive:function () {
            var self = this;
            var delta = 0, rebound = 0;
            return function (deltaTime)
            {
                if (deltaTime === 0)
                    return;

                // Just Move
                delta = self.input - self.lastPosition;
                //console.log(self.input+" - "+self.lastPosition);
                if (delta === 0)
                    return;

                self.lastPosition = self.input;
                //console.log(delta);
                self.velocity = self.clampVelMax(delta / deltaTime);

                // Prevent overscroll
                if (self.scrollContainer[self.idx] < self.minOverScroll ||
                    self.scrollContainer[self.idx] > self.maxOverScroll)
                {
                    rebound = Math.abs(self.scrollContainer[self.idx] > 0 ? self.scrollContainer[self.idx] :
                        Math.abs(self.minOverScroll - self.scrollContainer[self.idx]));

                    if (rebound < self.bounceRange)
                        self.velocity *= 1.0 - rebound / self.bounceRange;
                }

                self.scrollUpdate(deltaTime);
            }
        },

        _freeScrollUp:function () {
            var self = this;
            var damp = 0;
            return function (deltaTime) {
                damp = self.decelDamp * deltaTime;
                self.velocity = self.clampVelMax(self.velocity - damp);

                if (self.scrollContainer[self.idx] > self.maxOverScroll) {
                    self.velocity = (self.scrollContainer[self.idx] * self.returnSpeed) * deltaTime * -1;
                    self.fsm.gotoState(self.ScrollStates.ReturnToTop);
                }

                if (Math.abs(self.velocity) < damp) {
                    self.velocity = 0;
                    self.fsm.gotoState(self.ScrollStates.NotMoving);
                }

                self.scrollUpdate(deltaTime);
            };
        },

        _freeScrollDown:function () {
            var self = this;
            var damp = 0;
            return function (deltaTime) {
                damp = self.decelDamp * deltaTime;
                self.velocity = self.clampVelMax(self.velocity + damp);

                if (self.scrollContainer[self.idx] < self.minOverScroll) {
                    self.velocity = (self.min - self.scrollContainer[self.idx]) * self.returnSpeed * deltaTime;
                    if (self.scrollContainer.height <= self.clipArea.height)
                        self.fsm.gotoState(self.ScrollStates.ReturnToTop);
                    else
                        self.fsm.gotoState(self.ScrollStates.ReturnToBottom);
                }

                if (Math.abs(self.velocity) < damp) {
                    self.velocity = 0;
                    self.fsm.gotoState(self.ScrollStates.NotMoving);
                }

                self.scrollUpdate(deltaTime);
            };
        },

        _enterReturnToTop:function()
        {
            var self = this;
            return function(prevState)
            {
                if (self.hasUpdater())
                {
                    var yPos = self.scrollContainer[self.idx];
                    if (yPos > self.releaseThresh)
                    {
                        self.scrollContainer[self.idx] = 0;
                        self.velocity = 0;
                        self.fsm.gotoState(self.ScrollStates.NotMoving);

                        if (self.releaseCallback)
                        {
                            self.releaseCallback();
                        }
                    }
                }
            };
        },

        _returnToTop:function () {
            var self = this;
            return function (deltaTime) {
                self.velocity = (self.scrollContainer[self.idx] * self.returnSpeed) * -1;
                self.scrollUpdate(deltaTime);

                if (Math.abs(self.scrollContainer[self.idx]) <= self.clampDist) {
                    self.scrollContainer[self.idx] = 0;
                    self.scrollContainer.dirty = true;
                    self.velocity = 0;
                    self.fsm.gotoState(self.ScrollStates.NotMoving);
                }
            };
        },

        _returnToBottom:function () {
            var self = this;
            return function (deltaTime) {
                self.velocity = (self.min - self.scrollContainer[self.idx]) * self.returnSpeed;
                self.scrollUpdate(deltaTime);

                if (Math.abs(self.min - self.scrollContainer[self.idx]) <= self.clampDist) {
                    self.scrollContainer[self.idx] = self.min;
                    self.scrollContainer.dirty = true;
                    self.velocity = 0;
                    self.fsm.gotoState(self.ScrollStates.NotMoving);
                }
            };
        },

        _scrollTick:function () {
            var self = this;

            var deltaTime = 0.0;
            return function (sceneTime, timerTaskTime, timerTask)
            {   // delta time
                if (timerTaskTime == self.lastFrameTime)
                    return;
                deltaTime = (timerTaskTime - self.lastFrameTime) * 0.001;
                self.lastFrameTime = timerTaskTime;

                self.checkActorsForVisibility();
                self.fsm.tick(deltaTime);
            }
        },

        _scrollClick:function () {
            var self = this;

            return function (event) {
                if (!self.scrollContainer.mouseEnabled)
                    return;
                if (self.clickCallback != null) {

                    // what actor did we click?
                    var clickActor = self.findActorByPos(event.x, event.y);
                    if (clickActor === null)
                        return;

                    // transform click to actor's local coordinates
                    self.tPos = new CAAT.Point( event.x, event.y, 0 );
                    if (clickActor.actor != null)
                        self.tPos = self.scrollContainer.modelToModel(self.tPos,clickActor.actor);

                    if (!clickActor.actor.collisionOK(self.tPos.x, self.tPos.y))
                        return;

                    // if clicked actor has a sfx, play it
                    if (clickActor.actor.clickAudioID)
                        g_game.audioManager.playSound(clickActor.actor.clickAudioID);

                    // fire click callback
                    self.clickCallback( clickActor.actor, self.lastClickedActor.actor, self.tPos );

                    // remember last valid actor we clicked on
                    if (clickActor.actor != null)
                        self.lastClickedActor = clickActor;
                }
            }
        },

        ////////////////////////////////////////////////////////
        // Input events

        _InputDown:function (touchAsInput) {
            var self = this;

            //console.log("creating scrolldown with "+(touchAsInput?"touch input":"mouse input"));
            var idx = touchAsInput ? (self.horizontal() ? 'clientX':'clientY') : self.idx;
            return function (event)
            {
                self.input = event.screenPoint[idx];
                self.lastPosition = self.input;
                self.velocity = 0;

                if (self.fsm.currentState() !== self.ScrollStates.InputDown)
                    self.fsm.gotoState(self.ScrollStates.InputDown);

                // if on device, probably didn't get mouse enter, so assign the active actor
                if (self.activeActor == null)
                {
                    var cur = self.findActorByPos(event.x,event.y);
                    if (cur !== null && cur.actor !== null)
                    {
                        self.activeActor = cur.actor;
                    }
                }

                // Enter pressed state if applicable
                if (self.activeActor !== null)
                {
                    self.tPos= new CAAT.Point( event.x, event.y, 0 );
                    self.tPos = self.scrollContainer.modelToModel(self.tPos, self.activeActor);
                    event.x = self.tPos.x;
                    event.y = self.tPos.y;
                    self.activeActor.mouseDown(event);
                }
            }
        },

        _InputUp:function (touchAsInput) {
            var self = this;

            return function (event) {

                var x, y;
                if (touchAsInput) {
                    x = event.clientX;
                    y = event.clientY;
                }
                else {
                    x = event.x;
                    y = event.y;
                }

                //console.log(self.velocity);
                if (self.velocity < 0)
                    self.fsm.gotoState(self.ScrollStates.FreeScrollDown);
                else if (self.velocity > 0)
                    self.fsm.gotoState(self.ScrollStates.FreeScrollUp);
                else
                    self.fsm.gotoState(self.ScrollStates.NotMoving);

                // Enter unpressed state if applicable
                if (self.activeActor !== null)
                {
                    self.tPos= new CAAT.Point( event.x, event.y, 0 );
                    self.tPos = self.scrollContainer.modelToModel(self.tPos, self.activeActor);
                    event.x = self.tPos.x;
                    event.y = self.tPos.y;
                    self.activeActor.mouseUp(event);
                }
            }
        },

        _InputMove:function (touchAsInput, mouseIsDown) {
            var self = this;
            var idx = touchAsInput ? (self.horizontal() ? 'clientX':'clientY') : self.idx;
            return function(event)
            {
                if (mouseIsDown)
                    self.input = event.screenPoint[idx];

                // test for DRAG vs ENTER/EXIT
                if (self.buttonsEnabled)
                {
                    var cur = self.findActorByPos(event.x,event.y);
                    cur = cur === null ? null : cur.actor;
                    if (cur === self.activeActor)
                    {
                        if (cur === null)
                            return;

                        self.tPos = new CAAT.Point( event.x, event.y, 0 );
                        self.tPos = self.scrollContainer.modelToModel(self.tPos, self.activeActor);
                        event.x = self.tPos.x;
                        event.y = self.tPos.y;

                        if (mouseIsDown)
                        {
                            self.activeActor.mouseUp(event);
                            self.activeActor.mouseDrag(event);
                        }
                        else
                            self.activeActor.mouseMove(event);
                    }
                    else
                    {
                        if (mouseIsDown)
                            return;

                        if (self.activeActor != null)
                        {
                            if (cur !== self.activeActor)
                            {
                                self.tPospos = new CAAT.Point( event.x, event.y, 0 );
                                self.tPos = self.scrollContainer.modelToModel(self.tPos, self.activeActor);
                                event.x = self.tPos.x;
                                event.y = self.tPos.y;

                                self.activeActor.mouseExit(event);
                                self.activeActor = null;
                            }
                        }

                        if (cur !== null)
                        {
                            self.tPos = new CAAT.Point( event.x, event.y, 0 );
                            self.tPos = self.scrollContainer.modelToModel(self.tPos, cur);
                            event.x = self.tPos.x;
                            event.y = self.tPos.y;

                            self.activeActor = cur;
                            self.activeActor.mouseEnter(event);
                        }
                    }
                }
            }
        },

        _InputExit: function()
        {
            var self = this;
            return function(event)
            {
                if (self.buttonsEnabled && self.activeActor !== null)
                {
                    self.activeActor.mouseExit(event);
                    self.activeActor = null;
                }
            }
        },

        ////////////////////////////////////////////////////////
        // Helpers

        rootActor: function() {
            var self = this;
            return self.clipArea;
        },

        horizontal: function() {
            var self = this;
            return self.idx === 'x';
        },

        buildStates: function() {
            var self = this;

            if (self.fsm)
                return;

            self.fsm = new (require('FSM').FSM);

            self.fsm.addState(self.ScrollStates.InputDown,
                null, //enter
                self._inputActive(), // tick
                null    // leave
            );

            self.fsm.addState(self.ScrollStates.FreeScrollUp,
                null,  // enter
                self._freeScrollUp(), // tick
                null    // leave
            );

            self.fsm.addState(self.ScrollStates.FreeScrollDown,
                null, //enter
                self._freeScrollDown(), // tick
                null    // leave
            );

            self.fsm.addState(self.ScrollStates.ReturnToTop,
                self._enterReturnToTop(), //enter
                self._returnToTop(), // tick
                null    // leave
            );

            self.fsm.addState(self.ScrollStates.ReturnToBottom,
                null, //enter
                self._returnToBottom(), // tick
                null    // leave
            );

            self.fsm.addState(self.ScrollStates.NotMoving,
                null, //enter
                null, // tick
                null    // leave
            );
        },

        cleanup:function () {
            var self = this;

            if (self.scrollTimer)
                self.stopTimer();
            if (self.fsm)
                self.fsm.stop();

            if (self.clipArea !== null) {
                self.ownerScene.removeChild(self.clipArea);

                self.clipArea.setParent(null);
                self.clipArea.emptyChildren();
                self.clipArea.setExpired(true);
                self.clipArea.setDiscardable(true);
            }

            if (self.scrollContainer !== null) {
                for (var i = 0; i < self.scrollContainer.childrenList.length; i++) {
                    var c = self.scrollContainer.getChildAt(i);
                    if (c.cleanup)
                        c.cleanup(true);
                    c.setExpired(true);
                    c.setDiscardable(true);
                    c.setParent(null);
                }

                self.scrollContainer.setParent(null);
                self.scrollContainer.emptyChildren();
                self.scrollContainer.setExpired(true);
                self.scrollContainer.setDiscardable(true);
            }

            if (self.fill !== null) {
                self.fill.setParent(null);
                self.fill.setExpired(true);
                self.fill.setDiscardable(true);
            }

            self.clipArea = null;
            self.scrollContainer = null;
            self.fill = null;

            self.ownerScene = null;
            self.director = null;
            self.clickCallback = null;
        },

        checkActorsForVisibility:function ()
        {
            var self = this;

            if (self.scrollContainer.childrenList.length > 1)
            {
                var actor1 = self.getActor(0);  // Assuming that all actors are uniform in size!
                var actor2 = self.getActor(1);

                var actorSize = self.horizontal() ? (actor2.x - actor1.x) : (actor2.y - actor1.y);
                var viewOffset = self.horizontal() ? -self.scrollContainer.x : -self.scrollContainer.y;
                var windowSize = self.horizontal() ? self.clipArea.width : self.clipArea.height;

                var firstVis = Math.floor(viewOffset / actorSize);
                var firstElem = Math.max(0, firstVis);
                var lastVis = Math.floor((viewOffset + windowSize) / actorSize);
                var lastElem = Math.min(lastVis, self.scrollContainer.childrenList.length-1);

                for (var i = firstElem; i <= lastElem; i++)
                {
                    var actor = self.getActor(i);

                    if (actor.onBecomeVisibleInScroll)
                    {
                        actor.onBecomeVisibleInScroll();
                    }
                }
            }
            else if (self.scrollContainer.childrenList.length == 1)
            {
                var actor = self.getActor(0);

                if (actor.onBecomeVisibleInScroll)
                {
                    actor.onBecomeVisibleInScroll();
                }
            }
        },

        clampVelMax:function (vel) {
            var self = this;
            return Math.max((self.velMax * -1), Math.min(self.velMax, vel));
        },

        scrollUpdate:function (deltaTime) {
            var self = this;

            if (!self.scrollContainer)
                return 0;

            if (self.hasUpdater())
            {
                var yPos = self.scrollContainer[self.idx];
                var element = g_layout.getElementInPage('sub', 'updateScrollView', 'message');
                self.releaseLabel.setText(yPos > self.releaseThresh ? element.alt : element.id);
                self.releaseArrow.setRotationAnchored(Math.PI*(yPos > self.releaseThresh ? 2 : 0)/2, 0.5, 0.5);
            }

            // Update position
            var a = Math.round(self.velocity * deltaTime);
            self.scrollContainer[self.idx] += a;
            self.scrollContainer.dirty = true;

            return a;
        },

        startTimer:function () {
            var self = this;

            self.lastFrameTime = 0;//self.ownerScene.time;
            self.scrollTimer = self.ownerScene.createTimer
                (
                    self.ownerScene.time,
                    Number.MAX_VALUE,
                    null, // timeout
                    self._scrollTick(), // tick
                    null                // cancel
                );
        },

        stopTimer:function () {
            var self = this;
            self.scrollTimer.cancel();
            self.scrollTimer = null;
        },

        findActorByPos:function (x, y) {
            var self = this;

            var actor = null;
            for (var i = 0; i < self.scrollContainer.childrenList.length; i++) {
                actor = self.scrollContainer.getChildAt(i);
                //console.log("actor at " + actor.y + " with height " + actor.height + " vs input at " + x + ", " + y);
                if ((y >= actor.y && y <= (actor.y + actor.height)) &&
                    (x >= actor.x && x <= (actor.x + actor.width)))
                {
                    return {'idx': i, 'actor': actor};
                }
            }
            return null;
        },

        getActor:function(index) {
            var self = this;

            if (index < 0 || index >= self.scrollContainer.childrenList.length)
                return null;

            return self.scrollContainer.getChildAt(index);
        }
    };
    exports.ScrollView = ScrollView;

})(typeof exports === 'undefined'? _modules['ScrollView']={} : exports);