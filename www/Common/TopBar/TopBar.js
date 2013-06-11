(function(exports){
    "use strict";

    function TopBar()
    {
        TopBar.superclass.constructor.call(this);
        return this;
    }

    TopBar.prototype =
    {
        owner: null,
        scene: null,

        logo: null,
        logoBkgd:null,
        coinIcon: null,
        coinTxt: null,
        energyIcon: null,
        energyTxt: null,
        settingsBtn: null,

        statusTxt: null,
        profileID: 0,
        profilePic: null,
        profileFrame: null,


        init: function(width,height,srcView,srcPage,owner,proxy)
        {
            var self = this;

            self.owner = owner;
            proxy = proxy || owner.canvas;

            self.postLoad();

            self.initialize(0, 0, SnTCanvasHelper.attachToCanvas('#topCanvas',width,height));
            self.setSoundEffectsEnabled(false);
            //self.setClear(CAAT.Director.CLEAR_NONE);

            g_layout.adjustDockElements(srcView, srcPage);

            self.scene = self.createScene();
            g_layout.addAllElementsToObject(self.scene, srcView, srcPage);
            self.logo = g_layout.getActorFromArrayByID(self.scene.childrenList, 'logo');
            self.logoBkgd = g_layout.getActorFromArrayByID(self.scene.childrenList, 'headerLeft');
            self.coinIcon = g_layout.getActorFromArrayByID(self.scene.childrenList, 'coinPlus');
            self.coinTxt = g_layout.getActorFromArrayByID(self.scene.childrenList, 'coinTxt');
            self.energyIcon = g_layout.getActorFromArrayByID(self.scene.childrenList, 'energyIcon');
            self.energyTxt = g_layout.getActorFromArrayByID(self.scene.childrenList, 'NRG');
            self.settingsBtn = g_layout.getActorFromArrayByID(self.scene.childrenList, 'settings');
            self.settingsBtn.enableEvents(true);
            self.settingsBtn.mouseClick = self._launchSettingsMenu();

            self.statusTxt = new Array();

            var tmpStatus = g_layout.getActorFromArrayByID(self.scene.childrenList, "status");
            if (tmpStatus)
            {
                tmpStatus.setParent(null);
                self.scene.removeChild(tmpStatus);
                self.setStatusText('Current status\nof game');

                self.profileFrame = g_layout.getActorFromArrayByID(self.scene.childrenList, 'thumbFrame');
                self.profilePic = g_layout.getActorFromArrayByID(self.scene.childrenList, 'thumbDefaultSmall');
            }

            // we should take the highest draw precedence
            SnTCanvasHelper.SetTopLevelDirector(self.canvas);

            // hide coins/energy until we have something to display
            self.setCoins(null);
            self.setEnergy(null);

            return self;
        },

        addToManifest : function(manifest)
        {
            manifest.topbarMainLayout = "Common/TopBar/topbar_main_view.json";

            if (typeof manifest.thumbFrame === 'undefined')
                manifest.thumbFrame = "Common/SharedAssets/pg2_facebook_border.png";
            if (typeof manifest.thumbDefaultSmall === 'undefined')
                manifest.thumbDefaultSmall = "Common/SharedAssets/defaultuser_sml.png";
            if (typeof manifest.coinPlus === 'undefined')
                manifest.coinPlus = "Common/SharedAssets/coinplus.png";
            if (typeof manifest.settings === 'undefined')
                manifest.settings = "Common/TopBar/cogg.png";
            if (typeof manifest.headerBar === 'undefined')
                manifest.headerBar = "Common/TopBar/headerBar.png";
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'topBar', g_loader.getResult('topbarMainLayout'));
        },

        showLogo: function(show)
        {
            var self = this;
            self.logo.visible = show;

            if (typeof self.logoBkgd !== 'undefined' && self.logoBkgd !== null)
                self.logoBkgd.visible = show;
        },

        setEnergy: function(format, energyVal, energyMax)
        {
            var self = this;

            if (typeof self.energyIcon === 'undefined')
            {
                self.energyTxt.visible = false;
                return;
            }

            if (energyVal >= 0 && format !== null)
            {
                self.energyIcon.visible = true;
                self.energyTxt.visible = true;

                var strEnergy;
                switch(format)
                {
                    case "percentage":
                        var pct = Math.min(energyVal / energyMax, 1) * 100;
                        strEnergy = Math.floor(pct) + "%";
                        break;

                    case "of":
                        strEnergy = energyVal + " of " + energyMax;
                        break;

                    case "slash":
                        strEnergy = energyVal + "/" + energyMax;
                        break;

                    default:
                        strEnergy = energyVal.toString();
                        break;
                }
                self.energyTxt.setText(strEnergy);
            }
            else
            {
                self.energyIcon.visible = false;
                self.energyTxt.visible = false;
                self.energyTxt.setText("0");
            }
            return self;
        },

        setCoins: function(coins)
        {
            var self = this;

            if (coins >= 0 && coins !== null)
            {
                self.coinIcon.visible = true;
                self.coinTxt.visible = true;
                self.coinTxt.setText(coins);
            }
            else
            {
                self.coinIcon.visible = false;
                self.coinTxt.visible = false;
                self.coinTxt.setText("0");
            }
            return self;
        },


        showStatus : function(bVis)
        {
            var self = this;

            for (var i = 0; i < self.statusTxt.length; i++)
            {
                var curTxt = self.statusTxt[i];
                curTxt.setVisible(bVis);
            }
            if (self.profilePic)
            {
                self.profileFrame.setVisible(bVis);
                self.profilePic.setVisible(bVis);
            }
        },

        setStatus: function(text, arColors)
        {
            var self = this;

            var bVis = text.length > 0;

            self.showLogo(!bVis);
            self.showStatus(bVis);

            if (self.profilePic)
            {
                if (bVis)
                {
                    var fullString = text.replace("%s", self.profileName);
                    self.setStatusText(fullString, arColors);

                    if (self.profileID > 0)
                        self.owner.fbProfilePics.getPicture(self.profileID, require('FBProfilePicGetter').FBProfilePicGetter.PIC_TYPE_SQUARE, self._onProfilePicCB());
                    else
                        self.profilePic.setBackgroundImage(g_loader.getResult('thumbDefaultSmall'), true).
                            setScaleAnchored(1, 1, 0.5, 0.5);
                }
            }

            return self;
        },

        setProfileInfo: function(clientConn)
        {
            var self = this;
            var oppIdx = clientConn.getOpponentPlayerIdx();
            var opponent = clientConn.game.players[oppIdx];
            self.profileID = opponent.fbId;
            var oppNames = opponent.name.split(' ');
            self.profileName = oppNames[0];
            return self;
        },

        setStatusText: function(text, arColors)
        {
            var self = this;

            arColors = arColors || ['white', 'white'];

            // handle possibly multi-line body text
            for (var i = 0; i < self.statusTxt.length; i++)
            {
                var curTxt = self.statusTxt[i];
                self.scene.removeChild(curTxt);
                curTxt.setParent(null);
                curTxt.setDiscardable(true);
                curTxt.setExpired();
            }

            self.statusTxt = self.statusTxt.slice(0, self.statusTxt.length);
            self.statusTxt.length = 0;

            var arTxt = text.split('\n');
            var el = g_layout.getElementInPage('main', 'topBar', 'status');

            for (var i = 0; i < arTxt.length; i++)
            {
                var txt = new CAAT.TextActor();
                g_layout.applyElementToCAATActor(el, txt, true);

                txt.setText(arTxt[i])
                    .setTextFillStyle(arColors[i])
                    .enableEvents(false);

                var lineSpaceAdjust = 0.1;
                var lineSpace = txt.textHeight + (txt.textHeight * lineSpaceAdjust);
                var yPos =  el.y - ((arTxt.length * lineSpace) / 2) + (i * lineSpace);
                txt.setPosition(el.x, yPos);

                self.statusTxt.push(txt);
                self.scene.addChild(txt);
            }

            return self;
        },

        overrideStatusPic: function(image, scaleX, scaleY)
        {
            var self = this;
            self.profileFrame.setVisible(false);
            self.profilePic.setBackgroundImage(image, true)
                .setScaleAnchored(scaleX, scaleY, 0.5, 0.5);
        },

        _onProfilePicCB: function()
        {
            var self = this;
            return function(image)
            {
                self.profilePic.setBackgroundImage(image, true)
                    .setScaleAnchored(1, 1, 0.5, 0.5);
            }
        },

        _launchSettingsMenu: function()
        {
            var self = this;
            return function(mouseEvent)
            {
                // TODO: Actually launch the settings menu
                /*self.owner.showGenericDialog("Don't Panic", "Coming SOON!", "OK", "Really OK",
                 function(ok)
                 {
                 console.log("User clicked "+(ok ? "Ok" : "Cancel"));
                 });*/

                self.owner.settingsDialog.show(null);
            }
        }
    };

    extend(TopBar, require('GameDirector').GameDirector);
    exports.TopBar = TopBar;

})(typeof exports === 'undefined'? _modules['TopBar']={} : exports);