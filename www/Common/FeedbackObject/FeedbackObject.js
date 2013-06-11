(function(exports){

    function FeedbackObject()
    {
        FeedbackObject.superclass.constructor.call(this);

        if (!FeedbackObject.JSON_LOADED)
        {
            g_layout.mergePage('main', 'feedbackObject', g_loader.getResult('feedbackObjectLayout'));

            FeedbackObject.JSON_LOADED = true;
        }

        this.init();
        return this;
    }

    FeedbackObject.addResourcesToManifest = function(manifest)
    {
        manifest.feedbackObjectLayout = "Common/FeedbackObject/feedbackobject.json";

        if (typeof manifest.thumbDefault === 'undefined')
            manifest.thumbDefault = "Common/SharedAssets/defaultuser.png";
        if (typeof manifest.thumbBlack === 'undefined')
            manifest.thumbBlack = "Common/SharedAssets/defaultuser3.png";
        if (typeof manifest.wordBalloon === 'undefined')
            manifest.wordBalloon = "Common/FeedbackObject/wordballoon.png";
        if (typeof manifest.awardIconBkgd === 'undefined')
            manifest.awardIconBkgd = "Common/SharedAssets/award_icon_bkgd.png";
    }

    FeedbackObject.JSON_LOADED = false;
    FeedbackObject.PROFILE_MAX_SIZE = 200;

    FeedbackObject.prototype =
    {
        director : null,
        facebookPic : null,
        facebookBkgd : null,
        arAwards : null,

        init : function()
        {
            var self = this;

            g_layout.addAllElementsToObject(self, "main", "feedbackObject", "user");

            // grab profile pic objs
            self.facebookPic = g_layout.getActorFromArrayByID(self.childrenList, "thumbDefaultSmall", false);

            if (self.facebookPic === null || typeof self.facebookPic === 'undefined')
                self.facebookPic = g_layout.getActorFromArrayByID(self.childrenList, "thumbDefault", false);

            self.facebookBkgd = g_layout.getActorFromArrayByID(self.childrenList, "thumbFrame");

            if (self.facebookBkgd === null || typeof self.facebookBkgd === 'undefined')
                self.facebookBkgd = g_layout.getActorFromArrayByID(self.childrenList, "thumbBlack", false);

            return self;
        },

        setup : function(director, picType, defaultComment)
        {
            var self = this;

            self.director = director;

            picType = picType || require('FBProfilePicGetter').FBProfilePicGetter.PIC_TYPE_LARGE;
            self.arAwards = new Array();

            var oppIdx = g_game.clientConnection.getUserPlayerIdx() ^ 1;
            var clientConnGame = g_game.clientConnection.game;
            var opponent = clientConnGame.players[oppIdx];

            // set user icons, names
            var lineSpaceAdjust = require('LayoutManager').LayoutManager.DEFAULT_LINESPACE_FACTOR;

            var name = require('TextBreaker').TextBreaker.splitText(opponent.name).split('\n');
            var tA = g_layout.getActorFromArrayByID(self.childrenList, "username");

            tA.setText(name[0]);
            if (name.length > 1)
            {
                var txt = new CAAT.TextActor().
                    setText(name[1]).
                    setFont(tA.font).
                    setTextAlign(tA.textAlign).
                    setTextFillStyle(tA.textFillStyle).
                    setTextBaseline(tA.textBaseline);


                txt.setSize(txt.textWidth, txt.textHeight);
                var lineSpace = txt.height + (txt.height * lineSpaceAdjust);
                txt.setPosition(tA.x, tA.y+lineSpace);
                self.addChild(txt);
            }

            // setup word bubble
            var balloon = g_layout.getActorFromArrayByID(self.childrenList, "wordBalloon");
            var note = clientConnGame.state.prevTurn.note || defaultComment;
            //note = "This is a test of the longest possible note you could possibly send to anyone ever and I do mean it!";
            var noNote = !note || note.length === 0;

            var width = self.facebookBkgd.width;
            if (!noNote)
                width = balloon.x + balloon.width/2;

            self.setSize(width, self.facebookBkgd.height * 1.25);

            if (noNote)
            {
                balloon.setExpired().
                    setDiscardable(true).
                    setParent(null);
                self.removeChild(balloon);
            }
            else
            {
                var el = g_layout.getElementInPage("main", "feedbackObject", "balloonRegion");
                var container = new CAAT.ActorContainer();
                container.setPositionAnchored(el['x'], el['y'], el['regX'], el['regY']).
                    setSize(el['width'], el['height']);
                self.addChild(container);
                var textElem = g_layout.getUniversalElementInView("main", "balloonTextDefaults");
                require('TextBreaker').TextBreaker.addTextArea(container, note, self.director, textElem);

                //debug:
                // 100 chars = "This is a test of the longest possible note you could possibly send to anyone ever and I do mean it!";
                // container.setFillStyle('blue').setAlpha(0.6);
            }

            // facebook icons
            g_game.fbProfilePics.getPicture(opponent.fbId, picType, self._onFacebookPicReady());

            // award
            g_game.clientConnection.getBestAwardOwned(opponent.id, 3, self._getBestAwardCallback());

            return self;
        },

        _getBestAwardCallback : function()
        {
            var self = this;

            return function(error, imageName)
            {
                if (!error && imageName)
                {
                    var element = g_layout.getElementInPage('main', 'feedbackObject', 'awardBg');
                    var awardBg = new CAAT.Actor().setBackgroundImage(g_loader.getResult(element.id), true);
                    g_layout.applyElementToCAATActor(element, awardBg, true, true);
                    self.addChild(awardBg);
                    self.arAwards.push(awardBg);

                    var element = g_layout.getElementInPage('main', 'feedbackObject', 'award');
                    var award = new CAAT.Actor().setBackgroundImage(g_loader.getResult(imageName), true);
                    g_layout.applyElementToCAATActor(element, award, true, true);
                    self.addChild(award);
                    self.arAwards.push(award);
                }
            }
        },

        _onFacebookPicReady: function()
        {
            var self = this;
            return function(image)
            {
                self.facebookPic.setBackgroundImage(image, true)
                    .setPosition(self.facebookPic.x, self.facebookPic.y);

                var offX, offY, offW, offH, posX, posY;

                if (self.facebookPic.width > FeedbackObject.PROFILE_MAX_SIZE)
                {
                    offX = (self.facebookPic.width - FeedbackObject.PROFILE_MAX_SIZE) / 2;
                    offW = FeedbackObject.PROFILE_MAX_SIZE-1;
                    posX = self.facebookPic.x+1;
                }
                else
                {
                    offX = 0;
                    offW = self.facebookPic.width;
                    posX = self.facebookPic.x;
                }

                if (self.facebookPic.height > FeedbackObject.PROFILE_MAX_SIZE)
                {
                    offY = (self.facebookPic.height - FeedbackObject.PROFILE_MAX_SIZE) / 2;
                    offH = FeedbackObject.PROFILE_MAX_SIZE-1;
                    posY = self.facebookPic.y+1;
                }
                else
                {
                    offY = 0;
                    offH = self.facebookPic.height;
                    posY = self.facebookPic.y;
                }

                self.removeChild(self.facebookPic);
                var newPic = new (require('ClippedImage').ClippedImage)();
                newPic.init(image);
                newPic.setPositionAnchored(posX, posY, self.facebookPic.tAnchorX, self.facebookPic.tAnchorY)
                newPic.setClipInfo(offX, offY, offW, offH);

                self.facebookPic.setDiscardable(true).
                    setExpired().
                    setParent(null);

                self.addChild(newPic);

                for (var i = 0; i < self.arAwards.length; i++)
                {
                    self.setZOrder(self.arAwards[i], 100+i);
                }
            }
        }
    };

    addGameWidget('FeedbackObject', FeedbackObject);

    extend(FeedbackObject, CAAT.ActorContainer);
    exports.FeedbackObject = FeedbackObject;

})(typeof exports === 'undefined'? _modules['FeedbackObject']={} : exports);
