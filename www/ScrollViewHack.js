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
        ScrollStates :
        {
            InputDown       : 'id',

            FreeScrollUp    : 'su',
            FreeScrollDown  : 'sd',
            ReturnToTop     : 'rt',
            ReturnToBottom  : 'rb',
            Dragging        : 'dr',

            NotMoving       : 'nm'
        },
        maxOverScroll : 50,
        bounceRange : 200,

        returnSpeed : 15.0,
        decelDamp : 200.0,
        bounceDamp : 500.0,
        velMax : 500.0,
        clampDist : 2.5,
        ////////////////////////////////////////

        director : null,
        ownerScene : null,

        clipArea : null,
        fill : null,
        scrollContainer : null,
        idx : 'x',
        offset : 0,
        padding: 0,

        scrollTimer : null,
        lastFrameTime : 0,

        fsm : null,

        velocity : 0,
        lastPosition : {x: 0, y: 0},
        input : {x: 0, y: 0},
        touchDown : {x: 0, y: 0},
        min : 0,
        minOverScroll : 0,

        onDragBeginCallback : null,
        onDragEndCallback: null,
        lastClickedIdx : -1,

        init : function(x, y, width, height, horizontal, director, scene, onDragBeginCallback, onDragEndCallback, colorfill)
        {
            var self = this;

            self.cleanup();

            self.idx = horizontal ? 'x' : 'y';
            self.offset = 0;
            self.ownerScene = scene;
            self.director = director;
            self.onDragBeginCallback = onDragBeginCallback;
            self.onDragEndCallback = onDragEndCallback;

            self.clipArea = new CAAT.ActorContainer().
                setBounds(x,y,width,height).
                setClip(true).
                cacheAsBitmap();

            self.scrollContainer = new CAAT.ActorContainer().
                setBounds(0,0,width,height).
                cacheAsBitmap();

            self.fill = new CAAT.ShapeActor().
                setShape(CAAT.ShapeActor.prototype.SHAPE_RECTANGLE).
                setFillStyle(colorfill||(new CAAT.Color.RGB(128,128,128)).toHex()).
                setBounds(0,0,width,height).
                enableEvents(false).
                cacheAsBitmap();

            self.clipArea.addChild(self.fill);
            self.clipArea.addChild(self.scrollContainer);
            scene.addChild(self.clipArea);

            //if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/))
            if (false)//CAAT.TOUCH_BEHAVIOR === CAAT.TOUCH_AS_MULTITOUCH)
            {
                self.scrollContainer.touchStart = self._InputDown(true);
                self.scrollContainer.touchMove = self._InputMove(true);
                self.scrollContainer.touchEnd = self._InputUp();
            }
            else
            {
                self.scrollContainer.mouseDown = self._InputDown(false);
                self.scrollContainer.mouseDrag = self._InputMove(false);
                self.scrollContainer.mouseUp = self._InputUp();

                self.scrollContainer.mouseClick = self._scrollClick();
            }

            self.buildStates();
            self.startTimer();
            self.fsm.gotoState(self.ScrollStates.NotMoving);

            return self;
        },

        addActor : function(actor)
        {
            var self = this;

            self.scrollContainer.addChild(actor);

            self.positionActor(actor);
        },

        positionActor : function(actor)
        {
            var self = this;

            if (self.horizontal())
            {
                /*
                actor.setPosition(self.offset, (self.scrollContainer.height - actor.height) * 0.5).
                    enableEvents(false);
                */
                var centerPoint =
                    { 
                        x: self.offset + actor.width * 0.2 + (actor.centerOffset.x * actor.scaleX * 0.5),
                        y: (self.scrollContainer.height + actor.centerOffset.y * actor.scaleY) * 0.5 };
                actor.enableEvents(false);
                actor.setPosition(centerPoint.x, centerPoint.y);

                self.offset += (actor.width * actor.scaleX * 1.1) + (self.padding || 0);
                self.scrollContainer.setBounds(0,0,self.offset,self.scrollContainer.height);

                self.min = (self.scrollContainer.width - self.clipArea.width) * -1;
            }
            else
            {
                actor.setPosition((self.scrollContainer.width - actor.width) * 0.5, self.offset).
                    enableEvents(false);

                self.offset += actor.height + padding||0;
                self.scrollContainer.setBounds(0,0,self.scrollContainer.width, self.offset);

                self.min = (self.scrollContainer.height - self.clipArea.height) * -1;
            }

            self.minOverScroll = self.min - self.maxOverScroll;
        },


        sort : function()
        {
            // Go through all of the actors in the list and position them appropriately.
            this.offset = 0;

            for (var i = 0; i < this.scrollContainer.getNumChildren(); ++i)
            {
                var actor = this.scrollContainer.getChildAt(i);
                if (actor.visible == false)
                {
                    actor.setPosition(0,0);
                    continue;
                }
                else
                    this.positionActor(actor);
            }
        },

        ////////////////////////////////////////////////////////
        // Scroll states

        _inputActive : function()
        {
            var self = this;
            var deltaX = 0, deltaY = 0, rebound = 0;
            return function(deltaTime)
            {
                deltaX = self.input.x - self.lastPosition.x;
                deltaY = self.input.y - self.lastPosition.y;
                
                self.lastPosition.x = self.input.x;
                self.lastPosition.y = self.input.y;
                
                if (deltaX === 0 && deltaY === 0)
                    return;

                var tX = self.input.x - self.touchDown.x;
                var tY = self.input.y - self.touchDown.y;
                var slope = Math.abs((self.input.y - self.touchDown.y) / (self.input.x - self.touchDown.x));

                // If the slop's value is above 1 and the delta from the
                // start position is greater than some threshold, trigger
                // a drag move event on the object moused over.
                if (slope > 1 && Math.abs(tX) > 5 && Math.abs(tX) <= 40)
                {
                    self.fsm.gotoState(self.ScrollStates.Dragging);
                    return;
                }

                //console.log("dx: " + deltaX + ", dy: " + deltaY + ", slope: " + slope + ", tx: " + tX + ", ty: " + tY);

                var delta = self.horizontal() ? deltaX : deltaY;

                self.velocity = self.clampVelMax(delta / deltaTime);

                // Prevent overscroll
                if (self.scrollContainer[self.idx] < self.minOverScroll ||
                    self.scrollContainer[self.idx] > self.maxOverScroll)
                {
                    rebound = Math.abs(self.scrollContainer[self.idx] > 0 ? self.scrollContainer[self.idx] :
                              Math.abs(self.minOverScroll-self.scrollContainer[self.idx]));

                    if (rebound < self.bounceRange)
                        self.velocity *= 1.0 - rebound / self.bounceRange;
                }

                self.scrollUpdate(deltaTime);
            }
        },

        _freeScrollUp : function()
        {
            var self = this;
            var damp = 0;
            return function(deltaTime)
            {
                damp = self.decelDamp * deltaTime;
                self.velocity = self.clampVelMax(self.velocity - damp);

                if (self.scrollContainer[self.idx] > self.maxOverScroll)
                {
                    self.velocity = (self.scrollContainer[self.idx] * self.returnSpeed) * deltaTime * -1;
                    self.fsm.gotoState(self.ScrollStates.ReturnToTop);
                }

                if (Math.abs(self.velocity) < damp)
                {
                    self.velocity = 0;
                    self.fsm.gotoState(self.ScrollStates.NotMoving);
                }

                self.scrollUpdate(deltaTime);
            };
        },

        _freeScrollDown : function()
        {
            var self = this;
            var damp = 0;
            return function(deltaTime)
            {
                damp = self.decelDamp * deltaTime;
                self.velocity = self.clampVelMax(self.velocity + damp);

                if (self.scrollContainer[self.idx] < self.minOverScroll)
                {
                    self.velocity = (self.min - self.scrollContainer[self.idx]) * self.returnSpeed * deltaTime;
                    self.fsm.gotoState(self.ScrollStates.ReturnToBottom);
                }

                if (Math.abs(self.velocity) < damp)
                {
                    self.velocity = 0;
                    self.fsm.gotoState(self.ScrollStates.NotMoving);
                }

                self.scrollUpdate(deltaTime);
            };
        },

        _returnToTop : function()
        {
            var self = this;
            return function(deltaTime)
            {
                self.velocity = (self.scrollContainer[self.idx] * self.returnSpeed) * deltaTime * -1;
                self.scrollUpdate(deltaTime);

                if (Math.abs(self.scrollContainer[self.idx]) <= self.clampDist)
                {
                    self.setScrollPosition(0);
                    self.velocity = 0;
                    self.fsm.gotoState(self.ScrollStates.NotMoving);
                }
            };
        },

        _returnToBottom : function()
        {
            var self = this;
            return function(deltaTime)
            {
                self.velocity = (self.min - self.scrollContainer[self.idx]) * self.returnSpeed * deltaTime;
                self.scrollUpdate(deltaTime);

                if (Math.abs(self.min - self.scrollContainer[self.idx]) <= self.clampDist)
                {
                    self.setScrollPosition(self.min);
                    self.velocity = 0;
                    self.fsm.gotoState(self.ScrollStates.NotMoving);
                }
            };
        },

        _scrollTick : function()
        {
            var self = this;

            var deltaTime = 0.0;
            return function(sceneTime, timerTaskTime, timerTask)
            {   // delta time
                if (sceneTime == self.lastFrameTime)
                    return;
                deltaTime = (sceneTime - self.lastFrameTime) * 0.001;
                self.lastFrameTime = sceneTime;

                self.fsm.tick(deltaTime);
            }
        },

        _scrollClick : function()
        {
            var self = this;

            return function(event)
            {
                
            }
        },

        _dragEnter : function()
        {
            var self = this;

            return function()
            {
                var clickPos = self.scrollContainer.viewToModel(self.touchDown);
                var clickedActor = self.findActorByPos(clickPos.x, clickPos.y);

                if (self.onDragBeginCallback != null)
                    self.onDragBeginCallback(clickedActor, self.input);

                if (clickedActor)
                {
                    self.selectedActor = clickedActor;
                }
            }
        },

        _dragTick : function()
        {
            var self = this;

            return function()
            {
                var actor = self.selectedActor;
                if (actor == null)
                    return;

                /*
                if (self.onDragTickCallback != null)
                    self.onDragTickCallback(actor);
                */

                //console.log("x: " + self.input.x + ", y: " + self.input.y);

                var dragPos = new CAAT.Point(self.input.x, self.input.y);
                self.ownerScene.viewToModel(dragPos);
                actor.setPosition(dragPos.x, dragPos.y);
            }
        },

        _dragExit : function()
        {
            var self = this;

            return function(event)
            {
                if (self.selectedActor == null)
                    return;

                if (self.onDragEndCallback != null)
                    self.onDragEndCallback(self.selectedActor);

                self.selectedActor = null;
            }
        },

        ////////////////////////////////////////////////////////
        // Input states

        _InputDown : function (touchAsInput)
        {
            var self = this;

            //console.log("creating scrolldown with "+(touchAsInput?"touch input":"mouse input"));
            return function(event)
            {
                if (touchAsInput)
                {
                    self.input.x = clientX;
                    self.input.y = clientY;
                }
                else
                {
                    self.input.x = event.x;
                    self.input.y = event.y;
                }

                //self.input = self.clipArea.modelToView(self.input);
                self.input = event.source.modelToView(self.input);

                self.lastPosition.x = self.input.x;
                self.lastPosition.y = self.input.y;

                self.touchDown.x = self.input.x;
                self.touchDown.y = self.input.y;

                self.velocity = 0;

                if (self.fsm.currentState() !== self.ScrollStates.InputDown)
                    self.fsm.gotoState(self.ScrollStates.InputDown);
            }
        },

        _InputUp : function ()
        {
            var self = this;

            return function()
            {
                if (self.velocity < 0 && self.selectedActor == null)
                    self.fsm.gotoState(self.ScrollStates.FreeScrollDown);
                else if (self.velocity > 0 && self.selectedActor == null)
                    self.fsm.gotoState(self.ScrollStates.FreeScrollUp);
                else
                    self.fsm.gotoState(self.ScrollStates.NotMoving);
            }
        },

        _InputMove : function(touchAsInput)
        {
            var self = this;

            if (touchAsInput)
            {
                return function(touchEvent)
                {
                    //console.log(touchEvent);
                    // TODO: Expand to track initial touch
                    self.input.x = event.clientX;
                    self.input.y = event.clientY;
                }
            }
            else
            {
                return function(mouseEvent)
                {
                    //console.log(mouseEvent);
                    //self.input = event[self.idx];
                    
                    //self.input.x = event.x;
                    //self.input.y = event.y;
                    self.input.x = mouseEvent.screenPoint.x;
                    self.input.y = mouseEvent.screenPoint.y;
                }
            }
        },

        ////////////////////////////////////////////////////////
        // Helpers

        rootActor : function()
        {
            var self = this;
            return self.clipArea;
        },

        horizontal : function()
        {
            var self = this;
            return self.idx === 'x';
        },

        buildStates : function()
        {
            var self = this;

            if (self.fsm)
                return;

            self.fsm = new (require('FSM').FSM);

            self.fsm.addState(self.ScrollStates.InputDown,
                null,   //enter
                self._inputActive(),    // tick
                null    // leave
            );

            self.fsm.addState(self.ScrollStates.FreeScrollUp,
                null,   //enter
                self._freeScrollUp(),   // tick
                null    // leave
            );

            self.fsm.addState(self.ScrollStates.FreeScrollDown,
                null,   //enter
                self._freeScrollDown(),   // tick
                null    // leave
            );

            self.fsm.addState(self.ScrollStates.ReturnToTop,
                null,   //enter
                self._returnToTop(),    // tick
                null    // leave
            );

            self.fsm.addState(self.ScrollStates.ReturnToBottom,
                null,   //enter
                self._returnToBottom(), // tick
                null    // leave
            );

            self.fsm.addState(self.ScrollStates.Dragging,
                self._dragEnter(),
                self._dragTick(),
                self._dragExit()
            );

            self.fsm.addState(self.ScrollStates.NotMoving,
                null,   //enter
                null,   // tick
                null    // leave
            );
        },

        cleanup : function()
        {
            var self = this;

            if (self.scrollTimer)
                self.stopTimer();
            if (self.fsm)
                self.fsm.stop();

            if (self.clipArea !== null)
            {
                self.ownerScene.removeChild(self.clipArea);

                self.clipArea.setParent(null);
                self.clipArea.emptyChildren();
                self.clipArea.setExpired(true);
                self.clipArea.setDiscardable(true);
            }

            if (self.scrollContainer !== null)
            {
                for (var i = 0; i < self.scrollContainer.childrenList.length; i++)
                {
                    self.scrollContainer.getChildAt(i).setExpired(true);
                    self.scrollContainer.getChildAt(i).setDiscardable(true);
                    self.scrollContainer.getChildAt(i).setParent(null);
                }

                self.scrollContainer.setParent(null);
                self.scrollContainer.emptyChildren();
                self.scrollContainer.setExpired(true);
                self.scrollContainer.setDiscardable(true);
            }

            if (self.fill !== null)
            {
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

        clampVelMax : function(vel)
        {
            var self = this;
            return Math.max((self.velMax*-1), Math.min(self.velMax, vel));
        },

        scrollUpdate : function(deltaTime)
        {
            var self = this;

            var pos = self.scrollContainer[self.idx] + (self.velocity * deltaTime);
            self.setScrollPosition(pos);
        },

        setScrollPosition : function(pos)
        {
            var self = this;

            // Hack clamp to make sure other code doesn't push
            // actors completely off screen.
            var minLeft = -self.scrollContainer.width - 10;
            var minRight = self.clipArea.width + 10;
            if (pos < minLeft)
                pos = minLeft;
            if (pos > minRight)
                pos = minRight;

            self.scrollContainer[self.idx] = pos;
            self.scrollContainer.dirty = true;
        },

        startTimer : function()
        {
            var self = this;

            self.lastFrameTime = self.ownerScene.time;
            self.scrollTimer = self.ownerScene.createTimer
                (
                    self.ownerScene.time,
                    Number.MAX_VALUE,
                    null,               // timeout
                    self._scrollTick(), // tick
                    null                // cancel
                );
        },

        stopTimer : function()
        {
            var self = this;
            self.scrollTimer.cancel();
            self.scrollTimer = null;
        },

        findActorByPos : function(x,y)
        {
            var self = this;

            var closestActor = null;
            var closestDistance = 0;

            var viewPos = self.scrollContainer.modelToView(new CAAT.Point(x,y));

            for (var i = 0; i < self.scrollContainer.childrenList.length; i++)
            {
                var actor = self.scrollContainer.getChildAt(i);
                if (!actor.isVisible())
                    continue;

                var actorPos = actor.viewToModel(new CAAT.Point(viewPos.x, viewPos.y));
                if (!actor.contains(actorPos.x, actorPos.y))
                    continue;

                var cx = (actor.width / 2.0);
                var cy = (actor.height / 2.0);
                var d = (cx - actorPos.x) * (cx - actorPos.x) + (cy - actorPos.y) * (cy - actorPos.y);
                if ((d < closestDistance) || !closestActor)
                {
                    closestActor = actor;
                    closestDistance = d;
                }
            }

            return closestActor;
        }
    }
    exports.ScrollViewHack = ScrollView;

})(typeof exports === 'undefined'? _modules['ScrollViewHack']={} : exports);