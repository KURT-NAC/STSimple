(function(exports){

    function CreateGame(owner,director)
    {
        this.init(owner,director);
    }

    CreateGame.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        isWaiting : false,

        init : function(owner, director, scene)
        {
            var self = this;

            // validate args
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

        addToManifest : function(manifest)
        {
            manifest.createMainLayout = "Common/CreateGame/creategame_main_view.json";
            manifest.createSubLayout = "Common/CreateGame/creategame_sub_view_" + g_game.platform + ".json";

            if (typeof manifest.playIcon === 'undefined')
                manifest.playIcon = "Common/SharedAssets/playicon.png";
            if (typeof manifest.halfMoonAdd === 'undefined')
                manifest.halfMoonAdd = "Common/SharedAssets/store_halfmoon_buttondecorations_plus.png";
            if (typeof manifest.thumbFrame === 'undefined')
                manifest.thumbFrame = "Common/SharedAssets/pg2_facebook_border.png";
            if (typeof manifest.thumbDefaultSmall === 'undefined')
                manifest.thumbDefaultSmall = "Common/SharedAssets/defaultuser_sml.png";
            if (typeof manifest.facebookIcon === 'undefined')
                manifest.facebookIcon = "Common/CreateGame/creategame_facebookicon.png";
            if (typeof manifest.emailIcon === 'undefined')
                manifest.emailIcon = "Common/CreateGame/creategame_mailicon.png";
            if (typeof manifest.usernameIcon === 'undefined')
                manifest.usernameIcon = "Common/CreateGame/creategame_helloicon.png";
            if (typeof manifest.randomIcon === 'undefined')
                manifest.randomIcon = "Common/CreateGame/creategame_diceicon.png";
            if (typeof manifest.shareIcon === 'undefined')
                manifest.shareIcon = "Common/CreateGame/shareicon.png";
            if (typeof manifest.awardIconBkgdSml === 'undefined')
                manifest.awardIconBkgdSml = "Common/SharedAssets/award_icon_bkgd_sml.png";
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'createGame', g_loader.getResult('createMainLayout'));
            g_layout.mergePage('main', 'template_FacebookButton', g_loader.getResult('createMainLayout'));
            g_layout.mergePage('sub', 'createGame', g_loader.getResult('createSubLayout'));
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            // jump right to faacebook?
            if (self.owner.forceFindFriends)
            {
                self.owner.fsm.gotoState(self.owner.GameStates.CreateGameFacebook);
                return;
            }

            if (typeof stateData !== 'undefined')
                self.isWaiting = stateData.waitingForGame;

            // initialize layout
            g_layout.setActive('main','createGame');

            var title = self._createTitle();
            self.scene.addChild(title);

            var img = new CAAT.Actor()
                .setBackgroundImage(g_loader.getResult('createBG'), true)
                .enableEvents(false);
            var element = g_layout.getElementInPage('main', 'createGame', 'bg')
            g_layout.applyElementToCAATActor(element, img, false, false);
            self.scene.addChild(img);

            var clickEvent = function(evt){ self._onFBClick(evt); };
            var element = g_layout.getElementInPage('main', 'createGame', 'facebook');
            var button = g_layout.createFancyButton(element, clickEvent);
            self.scene.addChild(button);

            var clickEvent = function(evt){ self._onUserClick(evt); };
            var element = g_layout.getElementInPage('main', 'createGame', 'username');
            var button = g_layout.createFancyButton(element, clickEvent);
            self.scene.addChild(button);

            var clickEvent = function(evt){ self._onEmailClick(evt); };
            var element = g_layout.getElementInPage('main', 'createGame', 'email');
            var button = g_layout.createFancyButton(element, clickEvent);
            self.scene.addChild(button);

            var clickEvent = function(evt){ self._onRandomClick(evt); };
            var element = g_layout.getElementInPage('main', 'createGame', 'random');
            var button = g_layout.createFancyButton(element, clickEvent);
            self.scene.addChild(button);

            var footer = new CAAT.Actor();
            footer.setBackgroundImage(g_loader.getResult('footer'), true);
            var element = g_layout.getElementInPage('sub', 'createGame', 'footer');
            g_layout.applyElementToCAATActor(element, footer, true, true);
            self.scene.addChild(footer);

            var clickEvent = function(evt){ self._onBackClick(evt); };
            var element = g_layout.getElementInPage('sub', 'createGame', 'back1');
            var button = g_layout.createNavigationButton(element, clickEvent);
            self.scene.addChild(button);
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
            CAAT.sceneCleanup(self.scene);
        },

        _onBackClick : function(evt)
        {
            var self = this;
            self.owner.fsm.gotoState(self.owner.GameStates.Main);
        },

        _onFBClick : function(evt)
        {
            var self = this;
            if (self.owner.clientConnection.isFacebook)
            {
                self.owner.fsm.gotoState(self.owner.GameStates.CreateGameFacebook);
            }
            else
            {
                self.owner.showGenericDialog("Facebook Required", "Login with Facebook for this feature", "Ok");
            }
        },

        _onEmailClick : function(evt)
        {
            var self = this;
            self.owner.fsm.gotoState(self.owner.GameStates.CreateGameEmail);
        },

        _onUserClick : function(evt)
        {
            var self = this;
            self.owner.fsm.gotoState(self.owner.GameStates.CreateGameUsername);
        },

        _onRandomClick : function(evt)
        {
            var self = this;

            if (self.isWaiting)
            {
                self.owner.showGenericDialog("Already Waiting", "You are already waiting\nfor a random opponent.", "Ok");
                return;
            }

            self.owner.showGenericDialog("Find Random Opponent", "Are you sure you'd like to be\nmatched with a random opponent?", "Yes", "No",
            function(ok)
            {
                if (ok)
                {
                    self.owner.showLoadingDialog("Matchmaking...");

                    self.owner.clientConnection.matchmakeGame(function(err,result) {
                            self.owner.hideLoadingDialog();

                            if (err)
                            {
                                self.owner.showGenericDialog("Error matchmaking game", err.message, "OK");
                            }
                            else
                            {
                                if (result.pending)
                                    self.owner.fsm.gotoState(self.owner.GameStates.Main);
                                else
                                    self.owner.gotoGame(result.id);
                            }
                        });
                }
            });
        },

        _createSubButton : function(element, callback)
        {
            var self = this;

            var element = g_layout.getElementInPage('sub', 'createGame', element);
            var button = g_layout.createNavigationButton(element, callback);
            self.scene.addChild(button);
            return button;
        },

        _createSubToggleButton : function(element, callback, radioGroup)
        {
            var self = this;

            var element = g_layout.getElementInPage('sub', 'createGame', element);
            var toggle = g_layout.createToggleButton(element, callback);
            toggle.setAudioClip('buttonClick2');
            radioGroup.addButton(toggle);
            self.scene.addChild(toggle);

            return toggle;
        },

        _createTitle : function()
        {
            var self = this;
            var img = g_loader.getResult('bannerLarge');
            var title = new CAAT.ActorContainer().setSize(img.width, img.height);
            g_layout.addAllElementsToObject(title, 'main', 'createGame', 'title');
            return title;
        },

    };

    exports.CreateGame = CreateGame;

})(typeof exports === 'undefined'? _modules['CreateGame']={} : exports);
