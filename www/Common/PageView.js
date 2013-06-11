(function (exports) {

    function PageView() {
        return this;
    }

    PageView.prototype =
    {
        director:null,
        ownerScene:null,

        clipArea:null,
        fill:null,
        mainContainer:null,
        scrollContainer:null,
        idx:'x',

        // next added actor pageY position
        page : 0,
        pages : [ 0 ],
        currentPage : 0,
        offset : 0,

        scrollTimer:null,
        lastFrameTime:0,

        clickCallback:null,
        activeActor:null,
        lastClickedActor:{'idx':-1,actor:null},

        buttonsEnabled:false,

        tPos:null,

        init : function (x, y, width, height, horizontal, director, scene, clickCallback, colorfill, releaseCallback)
        {
            var self = this;

            if (horizontal)
                throw "horizontal is not supported in PageView";

            colorfill = colorfill || [128, 128, 128, 0];
            self.cleanup();

            self.idx = 'y';
            self.page = 0;
            self.pages = [ 0 ];
            self.currentPage = 0;
            self.offset = 0;
            self.ownerScene = scene;
            self.director = director;
            self.clickCallback = clickCallback;
            self.activeActor = null;
            self.lastClickedActor = {'idx':-1,actor:null};
            self.releaseCallback = releaseCallback;

            // create a main container to hold everything
            self.mainContainer = new CAAT.ActorContainer().setBounds(x,y,width,height);

            // create control area
            var el = g_layout.getElementInPage('sub', 'controlsPageView', 'background');
            var img = g_loader.getResult(el.img);
            var controlContainer = new CAAT.ActorContainer().setBounds(0, height-img.height, width, img.height);
            self.mainContainer.addChild(controlContainer);
            var backgroundActor = new CAAT.Actor().setBackgroundImage(img);
            controlContainer.addChild(backgroundActor);

            // add up button
            var el = g_layout.getElementInPage('sub', 'controlsPageView', 'upArrow');
            var upArrow = g_layout.createNavigationButton(el, self._onUpClick.bind(self) );
            upArrow.setPosition(upArrow.width, controlContainer.height/2);
            controlContainer.addChild(upArrow);

            // add down button
            var el = g_layout.getElementInPage('sub', 'controlsPageView', 'downArrow');
            var downArrow = g_layout.createNavigationButton(el, self._onDownClick.bind(self) );
            downArrow.setPosition(controlContainer.width - downArrow.width, controlContainer.height/2);
            controlContainer.addChild(downArrow);

            // add refresh button
            if (releaseCallback)
            {
                var el = g_layout.getElementInPage('sub', 'controlsPageView', 'refresh');
                var refresh = g_layout.createNavigationButton(el, self._onRefreshClick.bind(self) );
                refresh.setPosition(controlContainer.width/2, controlContainer.height/2);
                controlContainer.addChild(refresh);
            }

            // adjust height to account for control area
            height -= img.height;

            self.clipArea = new CAAT.ActorContainer().
                setBounds(0, 0, width, height).
                setClip(true).
                cacheAsBitmap();

            self.scrollContainer = new CAAT.ActorContainer().
                setBounds(0, 0, width, height).
                enableEvents(true);

            var fillAlpha = colorfill[3];
            if (fillAlpha > 0) {
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
            self.mainContainer.addChild(self.clipArea);
            scene.addChild(self.mainContainer);

            // start tick
            self.startTimer();

            // hook up input handlers
            self.scrollContainer.mouseDown = self._onMouseDown();
            //self.scrollContainer.mouseMove = self._onMouseMove(true);
            self.scrollContainer.mouseDrag = self._onMouseMove(false);
            self.scrollContainer.mouseUp = self._onMouseUp();
            self.scrollContainer.mouseClick = self._onMouseClick();
        },

        hasUpdater : function ()
        {
            var self = this;
            return self.releaseCallback != null;
        },

        addActor : function (actor, padding)
        {
            padding = padding || 0;
            var self = this;

            // does actor fit on the current page?
            var pageEnd = self.pages[self.page] + self.clipArea.height;
            var actorEnd = self.offset + actor.height + padding;
            if (actorEnd > pageEnd)
            {
                self.pages.push( self.offset );
                self.page += 1;
            }

            actor.collisionOK = actor.collisionOK || function (x, y) { return true };
            self.scrollContainer.addChild(actor);

            actor.setPosition((self.scrollContainer.width - actor.width) * 0.5, self.offset).
                enableEvents(false);

            if (self.page === 0 && actor.onBecomeVisibleInScroll) {
                actor.onBecomeVisibleInScroll();
            }

            self.offset += actor.height + padding;
            self.scrollContainer.setBounds(0, 0, self.scrollContainer.width, self.offset);
        },

        finalize:function () {
            var self = this;
            self.scrollContainer.cacheAsBitmap();
        },

        ////////////////////////////////////////////////////////
        // Input handlers

        _onMouseDown : function()
        {
            var self = this;

            return function(event) {
                if (self.activeActor === null)
                {
                    var cur = self.findActorByPos(event.x,event.y);
                    if (cur !== null && cur.actor !== null)
                    {
                        self.activeActor = cur.actor;
                    }
                }
                if (self.activeActor !== null)
                {
                    var pos = new CAAT.Point( event.x, event.y, 0 );
                    pos = self.scrollContainer.modelToModel(pos,self.activeActor);
                    event.x = pos.x;
                    event.y = pos.y;
                    self.activeActor.mouseDown(event);
                }
            }
        },

        _onMouseMove : function(moveOrDrag)
        {
            var self = this;

            return function(event) {

                // get current actor under the cursor
                var cur = self.findActorByPos(event.x,event.y);
                cur = cur === null ? null : cur.actor;

                // same as before so exit
                if (cur === self.activeActor)
                    return;

                // mouse exit the old actor
                if (self.activeActor !== null)
                {
                    var pos = new CAAT.Point( event.x, event.y, 0 );
                    pos = self.scrollContainer.modelToModel(pos,self.activeActor);
                    event.x = pos.x;
                    event.y = pos.y;
                    self.activeActor.mouseExit(event);
                    self.activeActor = null;
                }
            }
        },

        _onMouseUp : function()
        {
            var self = this;
            return function(event) {
                if (self.activeActor !== null)
                {
                    var pos = new CAAT.Point( event.x, event.y, 0 );
                    pos = self.scrollContainer.modelToModel(pos,self.activeActor);
                    event.x = pos.x;
                    event.y = pos.y;
                    self.activeActor.mouseUp(event);
                }
            }
        },

        _onMouseClick : function () {
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
                    var pos = new CAAT.Point( event.x, event.y, 0 );
                    if (clickActor.actor != null)
                        pos = self.scrollContainer.modelToModel(pos,clickActor.actor);

                    if (!clickActor.actor.collisionOK(pos.x, pos.y))
                        return;

                    // if clicked actor has a sfx, play it
                    if (clickActor.actor.clickAudioID)
                        g_game.audioManager.playSound(clickActor.actor.clickAudioID);

                    // fire click callback
                    self.clickCallback( clickActor.actor, self.lastClickedActor.actor, pos );

                    // remember last valid actor we clicked on
                    if (clickActor.actor != null)
                        self.lastClickedActor = clickActor;
                }
            }
        },

        _onUpClick : function() {
            var self = this;
            self.currentPage -= 1;
            if (self.currentPage < 0 )
                self.currentPage = 0;

            self._updateScrollPosition();
        },

        _onDownClick : function() {
          var self = this;
            self.currentPage += 1;
            if (self.currentPage > self.page )
                self.currentPage = self.page;

            self._updateScrollPosition();
        },

        _onRefreshClick : function() {
            var self = this;
            self.releaseCallback();
        },

        _updateScrollPosition : function() {
            var self = this;
            self.scrollContainer.setPosition(0, -self.pages[self.currentPage]);
            self.checkActorsForVisibility();
        },

        ////////////////////////////////////////////////////////
        // Helpers

        horizontal : function () {
            var self = this;
            return self.idx === 'x';
        },

        cleanup : function () {

            var self = this;

            if (self.scrollTimer)
                self.stopTimer();

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

            if (self.mainContainer !== null) {
                self.mainContainer.setParent(null);
                self.mainContainer.setExpired(true);
                self.mainContainer.setDiscardable(true);
            }

            self.clipArea = null;
            self.scrollContainer = null;
            self.fill = null;
            self.mainContainer = null;

            self.ownerScene = null;
            self.director = null;
            self.clickCallback = null;
        },

        checkActorsForVisibility:function () {
            var self = this;

            var minY = self.pages[self.currentPage];
            var maxY = minY + self.clipArea.height;

            for ( var i = 0; i < self.scrollContainer.childrenList.length; i++ )
            {
                var actor = self.getActor(i);
                if (actor.y >= minY && actor.y < maxY)
                {
                    if (actor.onBecomeVisibleInScroll)
                    {
                        actor.onBecomeVisibleInScroll();
                    }
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

            if (self.hasUpdater()) {
                var yPos = self.scrollContainer[self.idx];
                var element = g_layout.getElementInPage('sub', 'updateScrollView', 'message');
                self.releaseLabel.setText(yPos > self.releaseThresh ? element.alt : element.id);
                self.releaseArrow.setRotationAnchored(Math.PI * (yPos > self.releaseThresh ? 2 : 0) / 2, 0.5, 0.5);
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
            }
        },

        stopTimer:function () {
            var self = this;
            self.scrollTimer.cancel();
            self.scrollTimer = null;
        },

        findActorByPos : function (x, y) {
            var self = this;

            var actor = null;
            for (var i = 0; i < self.scrollContainer.childrenList.length; i++) {
                actor = self.scrollContainer.getChildAt(i);
                //console.log("actor at " + actor.y + " with height " + actor.height + " vs input at " + x + ", " + y);
                if ((y >= actor.y && y <= (actor.y + actor.height)) &&
                    (x >= actor.x && x <= (actor.x + actor.width))) {
                    return {'idx':i, 'actor':actor};
                }
            }
            return null;
        },

        getActor:function (index) {
            var self = this;

            if (index < 0 || index >= self.scrollContainer.childrenList.length)
                return null;

            return self.scrollContainer.getChildAt(index);
        }
    };

    exports.PageView = PageView;

})(typeof exports === 'undefined' ? _modules['PageView'] = {} : exports);