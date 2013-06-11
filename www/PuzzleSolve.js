(function(exports){

    // Streak time limit in ms
    var STREAK_TIME = 5000;
    // Streak time bonus in ms
    var STREAK_TIME_BONUS = 3000;
    var STREAK_DROPS_PER_BONUS = 5;

    var Jigsaw = require('Jigsaw').Jigsaw;

    var difficultyToTemplate = {
        0 : { 'template' : 'jigsaw_template16', 'sliceWidth':192, 'sliceHeight' : 182 },
        1 : { 'template' : 'jigsaw_template30', 'sliceWidth':128, 'sliceHeight' : 145 },
        2 : { 'template' : 'jigsaw_template16', 'sliceWidth':192, 'sliceHeight' : 182 },
        3 : { 'template' : 'jigsaw_template16', 'sliceWidth':192, 'sliceHeight' : 182 }
    };

    function PuzzleSolve(owner,director)
    {
        this.init(owner,director);
    }

    PuzzleSolve.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        puzzleImg : null,
        jigsaw : null,
        picContainer : null,
        edgeBtn : null,
        magnetBtn : null,

        timeStarted : null,

        correctPic : null,

        zazzleInfo : null,

        streakCount : 0,
        streakPieces : {},

        streakBonusImage : {},
        streakBonusText : {},
        streakBonusDisplay : null,
        streaks : {},

        timerStart : 0,
        timeBonusCount : 0,
        timeMaxBonusCount : 0,
        timeBonusAnimation : null,
        timeBonusImage : {},
        timeBonusText : {},
        timeBonusLabel : {},
        timeBonusLabel2 : {},
        timeBonusDisplay : null,

        fullStreak : true,

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
            self.scene = scene || (director === null ? null : director.createScene());
            if (self.scene === null)
                throw new Error("Scene state created with NULL scene");
        },

        postLoad : function()
        {
            var self = this;
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            g_game.audioManager.fadeMusicOut(500);

            // loading screen
            self.owner.showLoadingDialog("Loading");

            // background
            var bgImg = g_loader.getResult('jigsaw_background');
            var backgroundActor = new CAAT.Actor().setBackgroundImage(bgImg, true);
            backgroundActor.setPosition(0,65);
            self.scene.addChild(backgroundActor);

            // hide shared background
            $('#backgroundCanvas').hide();

            var element;
            var button;

            // footer frame
            var footer = new CAAT.Actor();
            footer.setBackgroundImage(g_loader.getResult('footer'), true);
            element = g_layout.getElementInPage('sub', 'puzzleSolve', 'footer');
            g_layout.applyElementToCAATActor(element, footer, true, true);
            self.scene.addChild(footer);

            // save button
            element = g_layout.getElementInPage('sub', 'puzzleSolve', 'solveBtn');
            button = g_layout.createNavigationButton(element, self._onSolveClick());
            self.scene.addChild(button);

            // edge button
            element = g_layout.getElementInPage('sub', 'puzzleSolve', 'edgeBtn');
            self.edgeBtn = g_layout.createToggleButton(element, self._onEdgeClick());
            self.scene.addChild(self.edgeBtn);

            // pic button
            element = g_layout.getElementInPage('sub', 'puzzleSolve', 'picBtn');
            button = g_layout.createNavigationButton(element, self._onPicClick());
            self.scene.addChild(button);

            // magnet button
            element = g_layout.getElementInPage('sub', 'puzzleSolve', 'magnetBtn');
            self.magnetBtn = g_layout.createToggleButton(element, self._onMagnetClick());
            self.scene.addChild(self.magnetBtn);

            // rotate button
            element = g_layout.getElementInPage('sub', 'puzzleSolve', 'rotateBtn');
            button = g_layout.createNavigationButton(element, self._onRotateClick());
            self.scene.addChild(button);

            // invite button
            element = g_layout.getElementInPage('sub', 'puzzleSolve', 'inviteBtn');
            button = g_layout.createNavigationButton(element, self._onInviteClick());
            self.scene.addChild(button);

            // streak bonus
            self.streakBonusImage = new CAAT.Actor();
            self.streakBonusImage.setBackgroundImage(g_loader.getResult('streakBonus'), true);
            element = g_layout.getElementInPage('main', 'puzzleSolve', 'streakBonusImage');
            g_layout.applyElementToCAATActor(element, self.streakBonusImage, true, true);
            self.streakBonusImage.setVisible(false);
            self.scene.addChild(self.streakBonusImage);

            // streak bonus count
            self.streakBonusText = new CAAT.TextActor();
            element = g_layout.getElementInPage('main', 'puzzleSolve', 'streakBonusCount');
            g_layout.applyElementToCAATActor(element, self.streakBonusText, true, true);
            self.streakBonusText.setVisible(false);
            self.scene.addChild(self.streakBonusText);

            // time bonus
            self.timeBonusImage = new CAAT.Actor();
            self.timeBonusImage.setBackgroundImage(g_loader.getResult('timeBonus'), true);
            element = g_layout.getElementInPage('main', 'puzzleSolve', 'timeBonusImage');
            g_layout.applyElementToCAATActor(element, self.timeBonusImage, true, true);
            self.timeBonusImage.setVisible(false);
            self.scene.addChild(self.timeBonusImage);

            // time bonus count
            self.timeBonusText = new CAAT.TextActor();
            element = g_layout.getElementInPage('main', 'puzzleSolve', 'timeBonusCount');
            g_layout.applyElementToCAATActor(element, self.timeBonusText, true, true);
            self.timeBonusText.setVisible(false);
            self.scene.addChild(self.timeBonusText);

            // time bonus label
            self.timeBonusLabel = new CAAT.TextActor();
            element = g_layout.getElementInPage('main', 'puzzleSolve', 'timeBonusText');
            g_layout.applyElementToCAATActor(element, self.timeBonusLabel, true, true);
            self.timeBonusLabel.setVisible(false);
            self.scene.addChild(self.timeBonusLabel);

            // time bonus label (pt. 2)
            self.timeBonusLabel2 = new CAAT.TextActor();
            element = g_layout.getElementInPage('main', 'puzzleSolve', 'timeBonusText2');
            g_layout.applyElementToCAATActor(element, self.timeBonusLabel2, true, true);
            self.timeBonusLabel2.setVisible(false);
            self.scene.addChild(self.timeBonusLabel2);

            // load source image
            self.puzzleImg = new Image();
            self.puzzleImg.onload = self._onImageLoad();
            self.puzzleImg.onerror = self._onImageError();
            self.puzzleImg.src = self.owner.clientConnection.game.state.pic.url;

            // setup top bar
            self.owner.topBar.showStatus(false);
            self.owner.topBar.showLogo(false);
            self.owner.topBar.timeBonus.setValue(0);

            // setup solve timers
            self.timeStarted = false;
            var game = self.owner.clientConnection.game;
            if (game.state.step !== 'selfSolve')
            {
                var oppIdx = self.owner.clientConnection.getOpponentPlayerIdx();
                self.owner.topBar.setOpponentTimer( game.state.stats[oppIdx].time);
                self.owner.topBar.showTimerArea(true,true);
            }
            else
            {
                self.owner.topBar.showTimerArea(true,false);
            }
            self.owner.topBar.setMyTimer(0);

            // clear streak counter
            self.streaks = { 'maxTimeBonus' : 0 };

            self.fullStreak = true;
            self.streakCount = 0;
            self.streakPieces = {};
            self.timerStart = 0;
            self.timeBonusCount = 0;
            self.hideTimeBonus();
        },

        /*
        _showZazzleInfo : function()
        {
            var self = this;

            self.zazzleInfo.setVisible(true);
            self.zazzleInfo.alpha = 1;
            self.scene.setZOrder(self.zazzleInfo, Number.MAX_VALUE);

            // setup alpha behavior
            var alphaBehavior = new CAAT.AlphaBehavior().setValues(1, 0);
            self.zazzleInfo.addBehavior(alphaBehavior);
            alphaBehavior.setFrameTime(self.scene.time+1000, 1000);
            alphaBehavior.addListener({
                behaviorExpired : function(behavior, time, actor) {
                    self.zazzleInfo.setVisible(false);
                }
            });
        },
        */

        _onPauseClick : function()
        {
            var self = this;
            return function(evt)
            {

            }
        },

        _onSolveClick : function()
        {
            var self = this;
            return function(evt)
            {
                self.jigsaw.solvePuzzle();
            }
        },

        _onEdgeClick : function()
        {
            var self = this;
            return function(evt)
            {
                self.jigsaw.toggleEdgeOnlyTray();
            }
        },

        _onPicClick : function()
        {
            var self = this;
            return function(evt)
            {
                self.displayPicture();
            }
        },

        _onMagnetClick : function()
        {
            var self = this;
            return function(evt)
            {
            }
        },

        _onRotateClick : function()
        {
            var self = this;
            return function(evt)
            {
            }
        },

        _onInviteClick : function()
        {
            var self = this;
            return function(evt)
            {
            }
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;

            g_game.audioManager.fadeMusicIn(500);

            $('#backgroundCanvas').show();

            self.puzzleImg = null;
            CAAT.sceneCleanup(self.scene);

            self.owner.topBar.showStatus(true);
            self.owner.topBar.showTimerArea(false,false);
        },

        _onImageLoad : function()
        {
            var self = this;
            return function()
            {
                // save puzzle image reference for other pages
                self.owner.puzzleImage = self.puzzleImg;

                // template information
                var template = difficultyToTemplate[ self.owner.clientConnection.game.state.difficulty ];

                // create the jigsaw
                self.jigsaw = new Jigsaw(self.owner,self.director,self.scene,self.puzzleImg, template);
                self.jigsaw.onComplete = self._onPuzzleComplete.bind(self);
                self.jigsaw.onEdgesExhausted = self._onEdgesExhausted.bind(self);
                self.jigsaw.onDropPiece = self._onDropPiece.bind(self);
                self.displayPicture();
                window.setTimeout( function(){self.owner.hideLoadingDialog();}, 5 );
            }
        },

        _onImageError : function()
        {
            var self = this;
            return function(evt)
            {
                // hide loading screen
                self.owner.hideLoadingDialog();

                // display an error
                self.owner.showGenericDialog("Error", "Unable to load picture", "OK", null,
                    function(ok)
                    {
                        // return to active games
                        self.owner.fsm.gotoState(self.owner.GameStates.Main);
                    });
            }
        },

        _onEdgesExhausted : function()
        {
            var self = this;
            self.edgeBtn.setSelected(false);
        },

        _onDropPiece : function(dropInfo)
        {
            var self = this;

            // Debugging info display for dropping pieces.
            /*
            var pieceOrGroup = dropInfo.group ? "group" : "piece";
            var indexInfo = dropInfo.group ? "" : (" at index " + dropInfo.index.toString());
            var correct = dropInfo.correct ? "correct" : "incorrect";
            console.log("Dropped " + pieceOrGroup + indexInfo + " in " + correct + " spot.");
            */

            if (self.magnetBtn.selected && !dropInfo.fromBoard && dropInfo.toBoard)
            {
                self.jigsaw.magnetizePiece(dropInfo.index, 5);
                self.magnetBtn.toggle(true);
                return;
            }

            // If this was an internally activated drop, we need to track it, but avoid breaking streaks.
            // TODO: Determine if it should apply to the time bonus
            if (!dropInfo.fromBoard && !dropInfo.toBoard)
            {
                if (dropInfo.correct)
                {
                    self.streakPieces[dropInfo.index] = true;
                }
                return;
            }

            var firstDrop = !dropInfo.group && !self.streakPieces[dropInfo.index];

            // If they made a mistake, or it's not a first drop, the streak is over
            if (!dropInfo.correct || !firstDrop)
            {
                self.streakCount = 0;
                self.timerStart = 0;
                self.timeBonusCount = 0;
                self.hideTimeBonus();
                self.fullStreak = false;
                return;
            }

            var didStreakSound = false;

            self.streakPieces[dropInfo.index] = true;
            ++self.streakCount;
            if (self.streakCount > 1)
            {
                if ((self.streakCount % STREAK_DROPS_PER_BONUS) == 0)
                {
                    self.showStreakBonus();
                    didStreakSound = true;
                }
            }

            var now = new Date().getTime();

            if ((now - self.timerStart) > STREAK_TIME)
                self.timeBonusCount = 0;

            ++self.timeBonusCount
            if (self.timeBonusCount == 1)
            {
                self.timerStart = now;
            }
            else
            {
                if ((self.timerStart + STREAK_TIME) >= now)
                {
                    self.showTimeBonus(!didStreakSound);
                    self.timerStart = Math.min(self.timerStart + STREAK_TIME_BONUS, now);
                }
            }
            self.updateTimeBonus(now - self.timerStart);

            g_game.audioManager.playSound("correctPieceSound");
        },

        _onPuzzleComplete : function()
        {
            var self = this;

            // prevent multiple complete
            if (!self.timeStarted)
                return;

            // record time completed
            self.owner.topBar.stopMyTimer();
            self.timeStarted = false;

            g_game.audioManager.playSound("completeSound");

            // Turn off the time bonus animation
            self.hideTimeBonus();

            var isFullStreak = (self.fullStreak && self.streakCount);
            g_layout.addAllElementsToObject(self.scene, "main", "puzzleSolve", isFullStreak ? "fullStreakImage" : "iscorrect");

            self.correctPic = g_layout.getActorFromArrayByID(self.scene.childrenList, isFullStreak ? "fullStreak" : "correct");

            // setup alpha behavior
            var alphaBehavior = new CAAT.AlphaBehavior().setValues(0, 1);
            self.correctPic.addBehavior(alphaBehavior);
            alphaBehavior.setFrameTime(self.scene.time, 500);

            // setup scale behavior
            var scaleBehavior = new CAAT.ScaleBehavior().setValues(0.6, 1, 0.6, 1);
            self.correctPic.addBehavior(scaleBehavior);
            var bounce = new CAAT.Interpolator().createBounceOutInterpolator(false);
            scaleBehavior.setInterpolator(bounce);
            scaleBehavior.setFrameTime(self.scene.time, 500);

            // we need to wait 2 seconds & post to server before progressing
            self.summaryCounter = 2;

            // wait 2 seconds
            window.setTimeout( self._gotoSummaryPage.bind(self), 2000);

            // post results
            var delta = self.owner.topBar.getMyTimerMilliseconds();
            var turn = { 'solved' : true, 'time' : delta, 'streak' : self.streaks  };
            self.owner.clientConnection.turnGame(turn, function(err){
                self._gotoSummaryPage();
            });
        },

        _gotoSummaryPage : function()
        {
            var self = this;
            self.summaryCounter -= 1;
            if (self.summaryCounter == 0)
                self.owner.gotoGame( self.owner.clientConnection.game.id);
        },

        displayPicture : function()
        {
            var self = this;

            // punt if we're already displaying the picture
            if (self.picContainer)
                return;

            // picture container
            self.picContainer = new CAAT.ActorContainer(CAAT.ActorContainer.AddHint.CONFORM);
            self.scene.addChild(self.picContainer);

            // darkener
            var drop = new CAAT.ShapeActor();
            drop.setShape(CAAT.ShapeActor.prototype.SHAPE_RECTANGLE);
            drop.setPosition(-g_game.director.x, -g_game.director.y);
            drop.setSize(g_game.director.nativeWidth,g_game.director.nativeHeight);
            drop.setFillStyle('black');
            drop.setAlpha(0.75);
            drop.enableEvents(true);
            drop.mouseClick = function(evt){ self.hidePicture(); };
            self.picContainer.addChild(drop);

            // picture
            var el = g_layout.getElementInPage('main','puzzleSolve','picHint');
            var pic = new CAAT.Actor();
            pic.setBackgroundImage( self.puzzleImg, true);
            pic.setScale(0.85,0.85);
            pic.setPositionAnchor(0.5,0.5);
            pic.setPosition(el.x,el.y);
            pic.enableEvents(false);
            self.picContainer.addChild(pic);
        },

        hidePicture : function()
        {
            var self = this;

            if (!self.picContainer)
                return;

            if (!self.timeStarted)
            {
                self.timeStarted = true;
                self.owner.topBar.startMyTimer();
            }

            self.scene.removeChild(self.picContainer);
            self.picContainer.setDiscardable(true);
            self.picContainer.setExpired();
            delete self.picContainer;
        },

        showStreakBonus : function()
        {
            var self = this;

            // track number of each streak that has been awarded
            if (self.streaks[self.streakCount])
                self.streaks[self.streakCount] += 1;
            else
                self.streaks[self.streakCount] = 1;

            if (self.streakBonusDisplay)
            {
                self.streakBonusImage.emptyBehaviorList();
                self.streakBonusText.emptyBehaviorList();
            }

            var displayFade = new CAAT.AlphaBehavior()
                .setValues(1, 0)
                .setFrameTime(self.scene.time + 1500,500)
                .addListener({
                    behaviorExpired : function(behavior,time,targetActor) {
                        targetActor.setVisible(false);
                        targetActor.emptyBehaviorList();
                    }
                });
            self.streakBonusDisplay = displayFade;
            self.streakBonusImage.setVisible(true);
            self.streakBonusImage.setAlpha(1.0);
            self.streakBonusImage.addBehavior(displayFade);
            self.scene.setZOrder(self.streakBonusImage, self.scene.getNumChildren() + 1);
            self.streakBonusText.setText(self.streakCount.toString());
            self.streakBonusText.setVisible(true);
            self.streakBonusText.setAlpha(1.0);
            self.streakBonusText.addBehavior(displayFade);
            self.scene.setZOrder(self.streakBonusText, self.scene.getNumChildren() + 1);

            g_game.audioManager.playSound("streakSound");
        },

        showTimeBonus : function(playSound)
        {
            var self = this;
            self.animateTimeBonus(0);
            self.showTimeBonusPopup();

            if (playSound)
                g_game.audioManager.playSound("timeStreakSound");
        },

        updateTimeBonus: function(timePassed)
        {
            var self = this;
            self.animateTimeBonus(timePassed);
            self.showTimeBonusPopup();
        },

        hideTimeBonus: function()
        {
            var self = this;
            self.animateTimeBonus(STREAK_TIME);
        },

        animateTimeBonus: function(timePassed)
        {
            var self = this;

            var timeBonusActor = self.owner.topBar.timeBonus;
            if (self.timeBonusAnimation)
            {
                timeBonusActor.removeBehaviour(self.timeBonusAnimation);
                self.timeBonusAnimation = null;
            }
            if (timePassed >= STREAK_TIME)
            {
                timeBonusActor.setValue(0);
                return;
            }
            var animationTime = STREAK_TIME - timePassed;
            var initialValue = animationTime / STREAK_TIME;
            timeBonusActor.setValue(initialValue);
            self.timeBonusAnimation = new CAAT.Behavior()
                .setDelayTime(0, animationTime)
                .addListener({
                    behaviorExpired: function() {
                        timeBonusActor.removeBehaviour(self.timeBonusAnimation);
                        self.timeBonusAnimation = null;
                        timeBonusActor.setValue(0);
                    },
                    behaviorApplied: function(behavior, time, normalizedTime, actor, value) {
                        timeBonusActor.setValue(initialValue * (1.0 - normalizedTime));
                    }
                });
            timeBonusActor.addBehavior(self.timeBonusAnimation);
        },

        showTimeBonusPopup : function()
        {
            var self = this;

            if (self.timeBonusCount < 2)
                return;

            self.streaks.maxTimeBonus = Math.max(self.streaks.maxTimeBonus, self.timeBonusCount);

            if (self.timeBonusDisplay)
            {
                self.timeBonusImage.emptyBehaviorList();
                self.timeBonusText.emptyBehaviorList();
                self.timeBonusLabel.emptyBehaviorList();
                self.timeBonusLabel2.emptyBehaviorList();
            }

            var displayFade = new CAAT.AlphaBehavior()
                .setValues(1, 0)
                .setDelayTime(1500,500)
                .addListener({
                    behaviorExpired : function(behavior,time,targetActor) {
                        targetActor.setVisible(false);
                        targetActor.emptyBehaviorList();
                    }
                });
            self.timeBonusDisplay = displayFade;
            self.timeBonusImage.setVisible(true);
            self.timeBonusImage.setAlpha(1.0);
            self.timeBonusImage.addBehavior(displayFade);
            self.scene.setZOrder(self.timeBonusImage, self.scene.getNumChildren() + 1);
            self.timeBonusLabel.setVisible(true);
            self.timeBonusLabel.setAlpha(1.0);
            self.timeBonusLabel.addBehavior(displayFade);
            self.scene.setZOrder(self.timeBonusLabel, self.scene.getNumChildren() + 1);
            self.timeBonusLabel2.setVisible(true);
            self.timeBonusLabel2.setAlpha(1.0);
            self.timeBonusLabel2.addBehavior(displayFade);
            self.scene.setZOrder(self.timeBonusLabel2, self.scene.getNumChildren() + 1);
            self.timeBonusText.setText("x" + self.timeBonusCount.toString());
            self.timeBonusText.setVisible(true);
            self.timeBonusText.setAlpha(1.0);
            self.timeBonusText.addBehavior(displayFade);
            self.scene.setZOrder(self.timeBonusText, self.scene.getNumChildren() + 1);
        }
    
    };

    exports.PuzzleSolve = PuzzleSolve;

})(typeof exports === 'undefined'? _modules['PuzzleSolve']={} : exports);