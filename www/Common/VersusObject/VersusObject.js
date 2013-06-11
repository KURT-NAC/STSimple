(function(exports){

    function VersusObject()
    {
        VersusObject.superclass.constructor.call(this);

        if (!VersusObject.JSON_LOADED)
        {
            g_layout.mergePage('main', 'versusObject', g_loader.getResult('versusObjectLayout'));

            VersusObject.JSON_LOADED = true;
        }

        this.init();
        return this;
    }

    VersusObject.addResourcesToManifest = function(manifest)
    {
        manifest.versusObjectLayout = "Common/VersusObject/versusobject.json";

        if (typeof manifest.thumbDefault === 'undefined')
            manifest.thumbDefault = "Common/SharedAssets/defaultuser.png";
        if (typeof manifest.thumbBlack === 'undefined')
            manifest.thumbBlack = "Common/SharedAssets/defaultuser3.png";
        if (typeof manifest.andBanner === 'undefined')
            manifest.andBanner = "Common/VersusObject/and_banner.png";
        if (typeof manifest.awardIconBkgd === 'undefined')
            manifest.awardIconBkgd = "Common/SharedAssets/award_icon_bkgd.png";
    }

    VersusObject.JSON_LOADED = false;
    VersusObject.PROFILE_MAX_SIZE = 200;

    VersusObject.prototype =
    {
        andBnr: null,
        arAwards: null,

        init : function()
        {
            var self = this;

            g_layout.addAllElementsToObject(self, "main", "versusObject", "user");

            var bkgds = g_layout.getActorFromArrayByID(self.childrenList, "thumbBlack", true);
            self.setSize(bkgds[0].width * 2 + (bkgds[1].x - (bkgds[0].x + bkgds[0].width)), bkgds[0].height * 1.25);

            self.andBnr = g_layout.getActorFromArrayByID(self.childrenList, "andBanner", false);

            return self;
        },

        setup : function()
        {
            var self = this;

            var clientConnGame = g_game.clientConnection.game;

            // set user icons, names
            var lineSpaceAdjust = require('LayoutManager').LayoutManager.DEFAULT_LINESPACE_FACTOR;

            var name = require('TextBreaker').TextBreaker.splitText(clientConnGame.players[0].name).split('\n');
            var tA = g_layout.getActorFromArrayByID(self.childrenList, "username1");

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

            name = require('TextBreaker').TextBreaker.splitText(clientConnGame.players[1].name).split('\n');
            tA = g_layout.getActorFromArrayByID(self.childrenList, "username2");

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

            // facebook icons
            var facebookPics = g_layout.getActorFromArrayByID(self.childrenList, "thumbDefault", true);

            self.arAwards = new Array();

            for (var i = 0; i < clientConnGame.players.length; i++)
            {
                facebookPics[i].onProfilePicCB = self._onFacebookPicReady(facebookPics[i]);
                g_game.fbProfilePics.getPicture(clientConnGame.players[i].fbId, require('FBProfilePicGetter').FBProfilePicGetter.PIC_TYPE_LARGE, facebookPics[i].onProfilePicCB);

                g_game.clientConnection.getBestAwardOwned(clientConnGame.players[i].id, 3, self._getBestAwardCallback(i));
            }

            return self;
        },

        _getBestAwardCallback : function(player)
        {
            var self = this;

            return function(error, imageName)
            {
                if (!error && imageName)
                {
                    var element = g_layout.getElementInPage('main', 'versusObject', player === 0 ? 'awardBg1' : 'awardBg2');
                    var awardBg = new CAAT.Actor().setBackgroundImage(g_loader.getResult(element.id), true);
                    g_layout.applyElementToCAATActor(element, awardBg, true, true);
                    self.addChild(awardBg);
                    self.arAwards.push(awardBg);

                    var award = new CAAT.Actor().setBackgroundImage(g_loader.getResult(imageName), true);
                    var element = g_layout.getElementInPage('main', 'versusObject', player === 0 ? 'award1' : 'award2');
                    g_layout.applyElementToCAATActor(element, award, true, true);
                    self.arAwards.push(award);
                    self.addChild(award);
                }
            }
        },

        _onFacebookPicReady: function(facebookPic)
        {
            var self = this;
            return function(image)
            {
                facebookPic.setBackgroundImage(image, true)
                    .setPosition(facebookPic.x, facebookPic.y);

                var offX, offY, offW, offH, posX, posY;

                if (facebookPic.width > VersusObject.PROFILE_MAX_SIZE)
                {
                    offX = (facebookPic.width - VersusObject.PROFILE_MAX_SIZE) / 2;
                    offW = VersusObject.PROFILE_MAX_SIZE-1;
                    posX = facebookPic.x+1;
                }
                else
                {
                    offX = 0;
                    offW = facebookPic.width;
                    posX = facebookPic.x;
                }

                if (facebookPic.height > VersusObject.PROFILE_MAX_SIZE)
                {
                    offY = (facebookPic.height - VersusObject.PROFILE_MAX_SIZE) / 2;
                    offH = VersusObject.PROFILE_MAX_SIZE-1;
                    posY = facebookPic.y+1;
                }
                else
                {
                    offY = 0;
                    offH = facebookPic.height;
                    posY = facebookPic.y;
                }

                self.removeChild(facebookPic);
                var newPic = new (require('ClippedImage').ClippedImage)();
                newPic.init(image);
                newPic.setPositionAnchored(posX, posY, facebookPic.tAnchorX, facebookPic.tAnchorY)
                newPic.setClipInfo(offX, offY, offW, offH);

                facebookPic.setDiscardable(true).
                    setExpired().
                    setParent(null);

                self.addChild(newPic);

                self.setZOrder(self.andBnr, 100);

                for (var i = 0; i < self.arAwards.length; i++)
                {
                    self.setZOrder(self.arAwards[i], 200+i);
                }
            }
        }
    };

    addGameWidget('VersusObject', VersusObject);

    extend(VersusObject, CAAT.ActorContainer);
    exports.VersusObject = VersusObject;

})(typeof exports === 'undefined'? _modules['VersusObject']={} : exports);
