(function(exports){
    "use strict";

    var FBProfilePicGetter = require('FBProfilePicGetter').FBProfilePicGetter;

    function SummaryPage(owner,director)
    {
        this.init(owner,director);
    }

    SummaryPage.PROFILE_MAX_SIZE = 200;

    SummaryPage.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        state : null,
        step : null,
        myIdx : -1,
        myPlayer : null,
        oppIdx : -1,
        oppPlayer : null,

        pictureActor : null,
        myProfilePic : null,
        oppProfilePic : null,
        commentEnter : null,
        coinStacks : null,

        dToR: 0.01745329251994, // relatively high accuracy PI/80

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
        },

        postLoad : function()
        {
            var self = this;
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            // if second half of turn 1, then nothing to show and just skip to turn
            if (stateData.type === 'prev' && !self.owner.clientConnection.game.state.prevTurn)
            {
                self.owner.clientConnection.turnGame({},function(err){
                    self.owner.fsm.gotoState( self.owner.GameStates.Turn);
                });
                return;
            }

            //self.musicCue = g_game.audioManager.playSound('winSound');

            // stash player index for easy access
            self.myIdx = self.owner.clientConnection.getUserPlayerIdx();
            self.myPlayer = self.owner.clientConnection.game.players[self.myIdx];
            self.oppIdx = self.owner.clientConnection.getOpponentPlayerIdx();
            self.oppPlayer = self.owner.clientConnection.game.players[self.oppIdx];

            // determine which game state we should use
            self.step = self.owner.clientConnection.game.state.step;
            if (self.owner.clientConnection.game.state.step === 'prevSummary')
                self.state = self.owner.clientConnection.game.state.prevTurn;
            else
                self.state = self.owner.clientConnection.game.state;


            /////////////////////////////////
            // Main Area

            // background
            var el = g_layout.getElementInPage('main', 'summary', 'background');
            var background = new CAAT.Actor().setBackgroundImage(g_loader.getResult(el.img));
            g_layout.applyElementToCAATActor(el, background, true, true);
            self.scene.addChild(background);

            // start puzzle loading if needed
            if (self.owner.puzzleImage && self.owner.puzzleImage.src === self.state.pic.url)
            {
                self._onPictureLoaded();
            }
            else
            {
                self.owner.puzzleImage = new Image();
                self.owner.puzzleImage.onload = self._onPictureLoaded.bind(self);
                self.owner.puzzleImage.src = self.state.pic.url;
            }

            // puzzle complete
            var el = g_layout.getElementInPage('main','summary','completedA');
            var text = new CAAT.TextActor();
            g_layout.applyElementToCAATActor(el,text,true,true);
            self.scene.addChild(text);

            var el = g_layout.getElementInPage('main','summary','completedB');
            var text = new CAAT.TextActor();
            g_layout.applyElementToCAATActor(el,text,true,true);
            self.scene.addChild(text);

            // my profile frame
            var el = g_layout.getElementInPage('main','summary','myPicFrame');
            var frame = new CAAT.Actor().setBackgroundImage( g_loader.getResult(el.img) );
            g_layout.applyElementToCAATActor(el,frame,false,true);
            self.scene.addChild(frame);

            // my profile picture
            var el = g_layout.getElementInPage('main','summary','myPic');
            self.myProfilePic = new CAAT.Actor().setBackgroundImage(g_loader.getResult(el.img));
            g_layout.applyElementToCAATActor(el,self.myProfilePic,false,true);
            self.scene.addChild(self.myProfilePic);
            if (self.myPlayer.fbId > 0)
                self.owner.fbProfilePics.getPicture( self.myPlayer.fbId, FBProfilePicGetter.PIC_TYPE_SQUARE, self._onMyProfilePic.bind(self) );

            // my profile name
            var name = require('TextBreaker').TextBreaker.splitText(self.myPlayer.name).split('\n');
            var el = g_layout.getElementInPage('main','summary','myNameFirst');
            var text = new CAAT.TextActor();
            g_layout.applyElementToCAATActor(el,text,true,true);
            text.setText(name[0]);
            self.scene.addChild(text);
            if (name.length >= 2)
            {
                var el = g_layout.getElementInPage('main','summary','myNameLast');
                var text = new CAAT.TextActor().setText(name[1]);
                g_layout.applyElementToCAATActor(el,text,true,true);
                text.setText(name[1]);
                self.scene.addChild(text);
            }

            // my difficulty
            var el = g_layout.getElementInPage('main','summary','myDiff');
            var text = new CAAT.TextActor();
            g_layout.applyElementToCAATActor(el,text,true,true);
            text.setText( self._getPieceText(self.state.stats[self.myIdx].difficulty) );
            self.scene.addChild(text);

            // my time label
            var el = g_layout.getElementInPage('main','summary','myTime');
            var text = new CAAT.TextActor();
            g_layout.applyElementToCAATActor(el,text,true,true);
            self.scene.addChild(text);

            // my time background
            var el = g_layout.getElementInPage('main','summary','myTimer');
            var timer = g_layout.createTimerActor(el);
            timer.setTime(self.state.stats[self.myIdx].time);
            self.scene.addChild(timer);

            if (self.step !== 'halfSummary')
            {
                // opponent profile frame
                var el = g_layout.getElementInPage('main','summary','oppPicFrame');
                var frame = new CAAT.Actor().setBackgroundImage( g_loader.getResult(el.img) );
                g_layout.applyElementToCAATActor(el,frame,false,true);
                self.scene.addChild(frame);

                // opponent profile picture
                var el = g_layout.getElementInPage('main','summary','oppPic');
                self.oppProfilePic = new CAAT.Actor().setBackgroundImage(g_loader.getResult(el.img));
                g_layout.applyElementToCAATActor(el,self.oppProfilePic,false,true);
                self.scene.addChild(self.oppProfilePic);
                if (self.oppPlayer.fbId > 0)
                    self.owner.fbProfilePics.getPicture( self.oppPlayer.fbId, FBProfilePicGetter.PIC_TYPE_SQUARE, self._onOppProfilePic.bind(self) );

                // opponent profile name
                var name = require('TextBreaker').TextBreaker.splitText(self.oppPlayer.name).split('\n');
                var el = g_layout.getElementInPage('main','summary','oppNameFirst');
                var text = new CAAT.TextActor();
                g_layout.applyElementToCAATActor(el,text,true,true);
                text.setText(name[0]);
                self.scene.addChild(text);
                if (name.length >= 2)
                {
                    var el = g_layout.getElementInPage('main','summary','oppNameLast');
                    var text = new CAAT.TextActor().setText(name[1]);
                    g_layout.applyElementToCAATActor(el,text,true,true);
                    text.setText(name[1]);
                    self.scene.addChild(text);
                }

                // opponent difficulty
                var el = g_layout.getElementInPage('main','summary','oppDiff');
                var text = new CAAT.TextActor();
                g_layout.applyElementToCAATActor(el,text,true,true);
                text.setText( self._getPieceText(self.state.stats[self.oppIdx].difficulty) );
                self.scene.addChild(text);

                // opponent time label
                var el = g_layout.getElementInPage('main','summary','oppTime');
                var text = new CAAT.TextActor();
                g_layout.applyElementToCAATActor(el,text,true,true);
                self.scene.addChild(text);

                // opponent time background
                var el = g_layout.getElementInPage('main','summary','oppTimer');
                var timer = g_layout.createTimerActor(el);
                timer.setTime(self.state.stats[self.oppIdx].time);
                self.scene.addChild(timer);
            }

            // comment
            if (self.step !== 'prevSummary')
            {
                // comment text field
                var el = g_layout.getElementInPage('main','summary','commentEnter');
                self.commentEnter = new (require('TextFieldObject').TextFieldObject)();
                self.scene.addChild(self.commentEnter);
                g_layout.applyElementToCAATActor(el,self.commentEnter,false);
                self.commentEnter.setup("Tap to add comment");

                // share background
                var el = g_layout.getElementInPage('main','summary', 'shareBkg');
                var background = new CAAT.Actor().setBackgroundImage( g_loader.getResult(el.img) );
                g_layout.applyElementToCAATActor(el,background);
                self.scene.addChild(background);

                // share banner
                var el = g_layout.getElementInPage('main','summary', 'shareBanner');
                var background = new CAAT.Actor().setBackgroundImage( g_loader.getResult(el.img) );
                g_layout.applyElementToCAATActor(el,background);
                self.scene.addChild(background);

                // social object
                var el = g_layout.getElementInPage('main','summary','socialObj');
                var social = g_layout.createSocialObject(el);
                self.scene.addChild(social);

                // share this puzzle
                var el = g_layout.getElementInPage('main','summary', 'shareTxt');
                var text = new CAAT.TextActor();
                g_layout.applyElementToCAATActor(el,text,true,true);
                self.scene.addChild(text);

                var el = g_layout.getElementInPage('main','summary', 'thisTxt');
                var text = new CAAT.TextActor();
                g_layout.applyElementToCAATActor(el,text,true,true);
                self.scene.addChild(text);

                var el = g_layout.getElementInPage('main','summary', 'puzzleTxt');
                var text = new CAAT.TextActor();
                g_layout.applyElementToCAATActor(el,text,true,true);
                self.scene.addChild(text);
            }
            else
            {
                var el = g_layout.getElementInPage('main','summary','feedback');
                var feedback = new (require('FeedbackObject').FeedbackObject)();
                g_layout.applyElementToCAATActor(el,feedback,false);
                feedback.setScale(el.scale,el.scale);
                self.scene.addChild(feedback);
                feedback.setup(self.director);
            }

            /////////////////////////////////
            // initialize coin awards

            self.coinStacks = [];

            if (self.step != 'prevSummary')
            {
                var temp = self._coinStack(self.state.stats[self.myIdx].coins.difficulty,'earnBadge');
                if (temp)
                    self.coinStacks.push(temp);
                var temp = self._coinStack(self.state.stats[self.myIdx].coins.streak,'streakBadge');
                if (temp)
                    self.coinStacks.push(temp);
                var temp = self._pieceStack(self.state.stats[self.myIdx].pieces);
                if (temp)
                    self.coinStacks.push(temp);
            }
            if (self.step != 'halfSummary')
            {
                var temp = self._coinStack(self.state.stats[self.myIdx].coins.time,'timeBadge');
                if (temp)
                    self.coinStacks.push(temp);
            }

            if (self.coinStacks.length > 0)
            {
                self.coinStacksIdx = -1;
                self._advanceCoinStacks();
            }

            /////////////////////////////////
            // Footer Area

            g_layout.addAllElementsToObject(self.scene, "sub", "summary");

            var goBtn = g_layout.getActorFromArrayByID(self.scene.childrenList,"goBtn");
            goBtn.enableEvents(true).mouseClick = self._onGoClick();
        },

        _onAnimationDone : function(behavior,time,actor)
        {
            actor.emptyBehaviorList();
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
            CAAT.sceneCleanup( self.scene );

            // clean out references
            self.pictureActor = null;
            self.myProfilePic = null;
            self.oppProfilePic = null;
            self.commentEnter = null;
        },

        _onPictureLoaded : function()
        {
            var self = this;

            // delete old actor if it exists
            if (self.pictureActor)
            {
                self.pictureActor.destroy();
                self.pictureActor = null;
            }

            var el = g_layout.getElementInPage('main', 'summary', 'picture');

            // calculate scale
            var sx = el.width / self.owner.puzzleImage.width;
            var sy = el.height / self.owner.puzzleImage.height;

            // create and scale actor to fit space
            self.pictureActor = new CAAT.Actor();
            self.pictureActor.setBackgroundImage( self.owner.puzzleImage );
            self.pictureActor.setPositionAnchored(el.x,el.y,0.5,0.5);
            self.pictureActor.setScale(sx,sy);
            self.scene.addChild(self.pictureActor);
        },

        _onMyProfilePic : function(image)
        {
            var self = this;
            self.myProfilePic.setBackgroundImage(image,true);
        },

        _onOppProfilePic : function(image)
        {
            var self = this;
            self.oppProfilePic.setBackgroundImage(image,true);
        },

        _onGoClick : function()
        {
            var self = this;
            return function(evt)
            {
                // prevent multiple clicks on go
                var goBtn = g_layout.getActorFromArrayByID(self.scene.childrenList,"goBtn");
                goBtn.enableEvents(false);
                goBtn.setVisible(false);

                // add note to turn if present
                var turn = {};
                if (self.commentEnter)
                    turn.note = self.commentEnter.userTxt;

                // kick it off to server
                self.owner.clientConnection.turnGame(turn,function(err)
                {
                    self.owner.clientConnection.pushNotifyNewGame();
                    self.owner.gotoGame( self.owner.clientConnection.game.id );
                });
            }
        },

        _getPieceText : function(difficulty)
        {
            var self = this;
            switch (difficulty)
            {
                case 0:
                    return "16 Pieces";
                case 1:
                    return "30 Pieces";
                case 2:
                    return "64 Pieces";
                case 3:
                    return "96 Pieces";
                default:
                    return "Error: " + difficulty;
            }
        },

        _coinStack : function(coins,badge)
        {
            var self = this;

            if (coins <= 0)
                return null;

            var el = g_layout.getElementInPage('main','summary','coinParams');
            var img = g_loader.getResult(el.img);

            // calculate coin offset
            var m = (el.maxOff - el.minOff) / (el.maxCoins - 2);
            var b = el.minOff - m;
            var offset = img.width * ((m * Math.min(coins,el.maxCoins)) + b);

            // calculate badge offset
            var badge = new CAAT.Actor().setBackgroundImage( g_loader.getResult(badge),true );
            var badgeOffset = badge.width * el.badgeOff;

            // add coins
            var coinHolder = new CAAT.ActorContainer(CAAT.ActorContainer.AddHint.CONFORM);
            for (var i = coins-1; i >= 0; i--)
            {
                var coin = new CAAT.Actor().setBackgroundImage(img);
                coin.setPosition(offset*i + badgeOffset,0);
                coinHolder.addChild(coin);
            }

            // add badge
            badge.setPosition(0,0);
            coinHolder.addChild(badge);
            coinHolder.coins = coins;

            // set position
            var el = g_layout.getElementInPage('main','summary','coinArea');
            coinHolder.setPositionAnchored(el.x,el.y,0.5,0.5);
            coinHolder.setVisible(false);
            self.scene.addChild(coinHolder);

            return coinHolder;
        },

        _pieceStack : function(pieces)
        {
            var self = this;

            if (pieces <= 0)
                return null;

            // calculate piece offset
            var el = g_layout.getElementInPage('main','summary','pieceParams');
            var offset = el.pieceOff;

            // calculate badge offset
            var badge = new CAAT.Actor().setBackgroundImage( g_loader.getResult('earnBadge'),true );
            var badgeOffset = badge.width * el.badgeOffX;

            // add puzzle pieces
            var pieceHolder = new CAAT.ActorContainer(CAAT.ActorContainer.AddHint.CONFORM);
            for (var i = pieces-1; i >= 0; i--)
            {
                var piece = new CAAT.Actor().setBackgroundImage( g_loader.getResult('puzz' + (i+1)) );
                piece.setRotationAnchored(el.rot * self.dToR, 0.5, 0.5);
                piece.setPosition(offset*i + badgeOffset,0);
                pieceHolder.addChild(piece);
            }

            // add badge
            badge.setPosition(0,el.badgeOffY);
            pieceHolder.addChild(badge);
            pieceHolder.pieces = pieces;

            // set position
            var el = g_layout.getElementInPage('main','summary','coinArea');
            pieceHolder.setPositionAnchored(el.x,el.y,0.5,0.5);
            pieceHolder.setVisible(false);
            self.scene.addChild(pieceHolder);

            return pieceHolder;
        },

        _advanceCoinStacks : function()
        {
            var self = this;

            var behavior = null;
            if (self.coinStacks.length == 1)
            {
                var actor = self.coinStacks[0];
                behavior = self._createAnimationStack(false);
            }
            else
            {
                self.coinStacksIdx = (self.coinStacksIdx + 1) % self.coinStacks.length;
                var actor = self.coinStacks[ self.coinStacksIdx ];
                behavior = self._createAnimationStack(true);
            }

            actor.isGlobalAlpha = true;
            actor.setVisible(true);
            actor.addBehavior(behavior);
        },

        _createAnimationStack : function( fullStack )
        {
            var self = this;

            var cb = new CAAT.ContainerBehavior()
                .setCycle(false)
                .setFrameTime(self.scene.time,2255);

            var alphaIn = new CAAT.AlphaBehavior()
                .setCycle(false)
                .setValues(0,1)
                .setFrameTime(0,750);

            var bounce = new CAAT.Interpolator().createBounceOutInterpolator(false);
            var scaleIn = new CAAT.ScaleBehavior()
                .setCycle(false)
                .setValues(0.1, 1, 0.1, 1)
                .setFrameTime(0,750)
                .setInterpolator(bounce);

            cb.addBehavior(alphaIn);
            cb.addBehavior(scaleIn);
            scaleIn.addListener({ behaviorExpired : self._onAnimationMiddle.bind(self) });

            if (fullStack)
            {
                var alphaOut = new CAAT.AlphaBehavior()
                    .setCycle(false)
                    .setValues(1,0)
                    .setFrameTime(1750,2500);

                var scaleOut = new CAAT.ScaleBehavior()
                    .setCycle(false)
                    .setValues(1, 0.1, 1, 0.1)
                    .setFrameTime(1750,2250);

                cb.addBehavior(alphaOut);
                cb.addBehavior(scaleOut);
                cb.addListener({ behaviorExpired : self._onAnimationEnd.bind(self) });
            }

            return cb;
        },

        _onAnimationMiddle : function( behavior, time, actor)
        {
            var self = this;
            if (actor.coins > 0)
            {
                self.owner.inventory.addMoney(actor.coins);
                actor.coins = 0;
            }
            if (actor.pieces > 0)
            {
                var amt = self.owner.inventory.getSkuElement()
                self.owner.inventory.addCount('puzzlePiece',actor.pieces);
                actor.pieces = 0;
            }
        },

        _onAnimationEnd : function( behavior, time, actor )
        {
            var self = this;

            actor.setVisible(false);
            actor.emptyBehaviorList();
            self._advanceCoinStacks();
        }
    };

    exports.SummaryPage = SummaryPage;

})(typeof exports === 'undefined'? _modules['SummaryPage']={} : exports);