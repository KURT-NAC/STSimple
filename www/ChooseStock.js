(function(exports){

    function ChooseStock(owner,director)
    {
        this.init(owner,director);
    }

    ChooseStock.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        categorySku : null,
        fromStore : false,

        arFakeURLs : null,
        arFakeCoverFlowPrefixes : null,

        arImages : null,

        arPathsForward : null,
        arPathsBackward : null,
        extraPathForward : null,
        extraPathBackward : null,

        flowOffset: 0,
        flowAnimating: false,
        flowQueue: 0,

        swipeStarted:false,
        swipeOrigin:0,

        NUM_IMAGES: 3,
        PATH_TIME: 500,
        FLOW_SCALE: 0.8,
        SWIPE_THRESH: 40,

        init : function(owner, director, scene)
        {
            var self = this;

            if (owner === null || director === null)
            {
                throw new Error("Scene initiated with NULL" +
                    (owner === null ? " Owner" : "") +
                    (director == null ? " Director" : ""));
            }

            self.owner = owner;
            self.director = director;
            self.scene = scene||(director === null ? null : director.createScene());
            if (self.scene === null)
                throw new Error("Scene state created with NULL scene");

            self.arFakeURLs = new Object();
            self.arFakeURLs.puzzleCatIslands = "http://s3.amazonaws.com/funcini_pics/stock/Puzz_Island.png";
            self.arFakeURLs.puzzleCatPuppies = "http://s3.amazonaws.com/funcini_pics/stock/Puzz_Puppy.png";
            self.arFakeURLs.puzzleCatKittens = "http://s3.amazonaws.com/funcini_pics/stock/Puzz_kitten.png";
            self.arFakeURLs.puzzleCatCuterKittens = "http://s3.amazonaws.com/funcini_pics/stock/Puzz_kitten.png";

            self.arFakeCoverFlowPrefixes = new Object();
            self.arFakeCoverFlowPrefixes.puzzleCatIslands = "coverFlowIsland";
            self.arFakeCoverFlowPrefixes.puzzleCatPuppies = "coverFlowPuppy";
            self.arFakeCoverFlowPrefixes.puzzleCatKittens = "coverFlowKitten";
            self.arFakeCoverFlowPrefixes.puzzleCatCuterKittens = "coverFlowKitten";

            self.arPathsForward = new Array();
            self.arPathsBackward = new Array();
        },

        postLoad : function()
        {
            var self = this;
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            if (typeof stateData === 'undefined')
                throw new Error("Sku not passed to slide puzzle");

            self.fromStore = (typeof stateData !== 'undefined') && stateData.fromStore === true;
            self.categorySku = stateData.sku;
            self._enterCoverFlow();
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;

            self.arImages = [];
            self.arPathsForward = [];
            self.arPathsBackward = [];
            self.extraPathForward = null;
            self.extraPathBackward = null;

            // clear everything out
            for (var i = 0; i < self.scene.childrenList.length; i++)
            {
                self.scene.childrenList[i].
                    setDiscardable(true).
                    setExpired().
                    setParent(null);
            }

            self.scene.emptyChildren();
        },

        ///////////////////////////////////////////////////////////////////////////
        // Sub States

        ////////////////////
        // Roundup
        _enterCoverFlow: function()
        {
            var self = this;

            g_layout.addAllElementsToObject(self.scene, "main", "chooseStock");

            var categoryName = g_layout.getActorFromArrayByID(self.scene.childrenList, "Category", false);
            categoryName.setText(self.categorySku.name);

            self._onSetupCoverFlow();

            // TODO: these images should be downloaded from the server
            for (var i = 0; i < self.NUM_IMAGES; i++)
            {
                self.arImages[i].setBackgroundImage(g_loader.getResult(self.arFakeCoverFlowPrefixes[self.categorySku.id] + (i+1)), true);
            }

            var footer = new CAAT.Actor();
            footer.setBackgroundImage(g_loader.getResult('footer'), true);
            var element = g_layout.getElementInPage('sub', 'chooseStock', 'footer');
            g_layout.applyElementToCAATActor(element, footer, true, true);
            self.scene.addChild(footer);

            var cameraBtn = g_layout.getActorFromArrayByID(self.scene.childrenList, "takeBtn", false);
            cameraBtn.visible = !self.fromStore;
            cameraBtn.setCallback(function(evt) { g_game.fsm.gotoState(g_game.GameStates.RecordClip); });

            var callback;
            if (self.fromStore)
                callback = function(evt) { g_game.storeDialog.fsm.gotoState(g_game.storeDialog.StoreStates.StockPhotos, { "fromStore":true }); }
            else
                callback = function(evt) { g_game.fsm.gotoState(g_game.GameStates.StockPhotos, { "fromStore":false }); }

            var element = g_layout.getElementInPage('sub', 'chooseStock', self.fromStore ? 'backBtn2' : 'backBtn1');
            var button = g_layout.createNavigationButton(element, callback);
            self.scene.addChild(button);

            if (!self.fromStore)
            {
                var callback = function(evt) { self._onSendStockPhoto(); }
                var element = g_layout.getElementInPage('sub', 'chooseStock', 'useBtn');
                var button = g_layout.createNavigationButton(element, callback);
                self.scene.addChild(button);
            }
        },

        _onSetupCoverFlow: function()
        {
            var self = this;

            self.arImages = g_layout.getActorFromArrayByID(self.scene.childrenList, "coverFlowIsland1", true);

            for (var i = 0; i < self.NUM_IMAGES; i++)
            {
                self.arImages[i].enableEvents(true);
                self.arImages[i].mouseClick = self._onPicClicked();
                self.arImages[i].mouseDown = self._onPicDown();
                self.arImages[i].mouseDrag = self._onPicDragged();
            }

            var forward = g_layout.getActorFromArrayByID(self.scene.childrenList, "coverFlowForward", false);
            forward.enableEvents(true);
            forward.mouseClick = function() { self._onClickRotateCoverFlow(true); }

            var backward = g_layout.getActorFromArrayByID(self.scene.childrenList, "coverFlowBackward", false);
            backward.enableEvents(true);
            backward.mouseClick = function() { self._onClickRotateCoverFlow(false); }

            // forward paths
            var path = new CAAT.LinearPath().
                setInitialPosition(self.arImages[0].x, self.arImages[0].y).
                setFinalPosition(self.arImages[1].x, self.arImages[1].y);
            self.arPathsForward.push(path);

            var path = new CAAT.LinearPath().
                setInitialPosition(self.arImages[1].x, self.arImages[1].y).
                setFinalPosition(self.arImages[2].x, self.arImages[2].y);
            self.arPathsForward.push(path);

            var path = new CAAT.LinearPath().
                setInitialPosition(self.arImages[2].x, self.arImages[2].y).
                setFinalPosition(self.arImages[2].x + self.arImages[2].width/2, self.arImages[2].y);
            self.arPathsForward.push(path);

            self.extraPathForward = new CAAT.LinearPath().
                setInitialPosition(self.arImages[0].x - self.arImages[0].width/2, self.arImages[0].y).
                setFinalPosition(self.arImages[0].x, self.arImages[0].y);

            // backward paths
            var path = new CAAT.LinearPath().
                setInitialPosition(self.arImages[0].x, self.arImages[0].y).
                setFinalPosition(self.arImages[0].x - self.arImages[0].width/2, self.arImages[0].y);
            self.arPathsBackward.push(path);

            var path = new CAAT.LinearPath().
                setInitialPosition(self.arImages[1].x, self.arImages[1].y).
                setFinalPosition(self.arImages[0].x, self.arImages[0].y);
            self.arPathsBackward.push(path);

            var path = new CAAT.LinearPath().
                setInitialPosition(self.arImages[2].x, self.arImages[2].y).
                setFinalPosition(self.arImages[1].x, self.arImages[1].y);
            self.arPathsBackward.push(path);

            self.extraPathBackward = new CAAT.LinearPath().
                setInitialPosition(self.arImages[2].x + self.arImages[2].width/2, self.arImages[2].y).
                setFinalPosition(self.arImages[2].x, self.arImages[2].y);


            self.arImages[0].setScale(self.FLOW_SCALE, self.FLOW_SCALE);
            self.arImages[2].setScale(self.FLOW_SCALE, self.FLOW_SCALE);
            self.flowOffset = 0;
            self.flowAnimating = false;
            self.flowQueue = 0;
        },

        _onClickRotateCoverFlow : function(forward)
        {
            var self = this;

            if (self.flowAnimating)
                self.flowQueue += forward ? 1 : -1;
            else
                self._rotateCoverFlow(forward);
        },

        _onPicClicked : function()
        {
            var self = this;

            return function(mouseEvent)
            {
                self.swipeStarted = false;
            }
        },

        _onPicDown : function()
        {
            var self = this;

            return function(mouseEvent)
            {
                self.swipeStarted = true;
                self.swipeOrigin = mouseEvent.screenPoint.x;
            }
        },

        _onPicDragged : function()
        {
            var self = this;

            return function(mouseEvent)
            {
                if (!self.swipeStarted)
                    return;

                if (Math.abs(mouseEvent.screenPoint.x - self.swipeOrigin) > self.SWIPE_THRESH)
                {
                    self.swipeStarted = false;
                    self._onClickRotateCoverFlow(mouseEvent.screenPoint.x > self.swipeOrigin);
                }
            }
        },

        _rotateCoverFlow : function(forward)
        {
            var self = this;

            self.flowAnimating = true;

            if (self.flowQueue > 0)
                self.flowQueue -= 1;
            else if (self.flowQueue < 0)
                self.flowQueue += 1;

            var setCB = false;

            for (var i = 0; i < self.NUM_IMAGES; i++)
            {
                var pathIdx = (i + self.flowOffset) % self.NUM_IMAGES;
                var exiting = (forward && pathIdx === 2) || (!forward && pathIdx === 0);

                var curPath = forward ? self.arPathsForward[pathIdx] : self.arPathsBackward[pathIdx];
                var pathBehavior = new CAAT.PathBehavior().
                    setValues(curPath).
                    setFrameTime(self.scene.time, self.PATH_TIME * (exiting ? 0.5 : 1)).
                    setCycle(false);
                self.arImages[i].addBehavior(pathBehavior);

                if (exiting)
                {
                    pathBehavior.addListener({ behaviorExpired : function(behavior, time, actor) {
                        actor.removeBehaviour(behavior);

                        // TODO: replace background image with next downloaded pic

                        var enteringBehavior = new CAAT.PathBehavior().
                            setValues(forward ? self.extraPathForward : self.extraPathBackward).
                            setFrameTime(self.scene.time, self.PATH_TIME * 0.5).
                            setCycle(false);
                        actor.addBehavior(enteringBehavior);
                    }});
                }
                else
                {
                    if (!setCB)
                    {
                        pathBehavior.addListener({ behaviorExpired : function(behavior, time, actor) {
                            if (self.flowQueue !== 0)
                                self._rotateCoverFlow(self.flowQueue > 0);
                            else
                                self.flowAnimating = false;
                        }});

                        setCB = true;
                    }

                    var growing = (forward && pathIdx === 0) || (!forward && pathIdx === 2);
                    var initScale = growing ? self.FLOW_SCALE : 1.0;
                    var finalScale = growing ? 1.0 : self.FLOW_SCALE;

                    var scaleBehavior = new CAAT.ScaleBehavior().setValues(initScale, finalScale, initScale, finalScale);
                    scaleBehavior.setFrameTime(self.scene.time, self.PATH_TIME);
                    self.arImages[i].addBehavior(scaleBehavior);
                }
            }

            self.flowOffset += forward ? 1 : -1;
            self.flowOffset += self.NUM_IMAGES;
            self.flowOffset %= self.NUM_IMAGES;

            console.log("Flow offset: " + self.flowOffset);
        },

        _onSendStockPhoto: function()
        {
            var self = this;

            var fakeTurn = {
                'pid': "000000000000000000000001",
                'purl': self.arFakeURLs[self.categorySku.id],
                'note': 'Fake Note'
            };

            self.owner.showLoadingDialog("Submitting...");
            g_game.clientConnection.turnGame( fakeTurn, self._onSendComplete() );
        },

        _onSendComplete : function()
        {
            var self = this;
            return function(err,gameState)
            {
                self.owner.hideLoadingDialog();

                if (!err)
                {
                    self.owner.gotoGame( g_game.clientConnection.game.id );
                }
                else
                {
                    console.log("error sending stock photo:");
                    console.log(err);
                }
            }
        }
    };

    exports.ChooseStock = ChooseStock;

})(typeof exports === 'undefined'? _modules['ChooseStock']={} : exports);

