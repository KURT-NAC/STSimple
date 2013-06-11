(function(exports){

    function CreateGameFacebook(owner,director)
    {
        this.init(owner,director);
    }

    CreateGameFacebook.FACEBOOK_PIC_DELAY = 750;
    CreateGameFacebook.FACEBOOK_PIC_NONVIS_TIME = 250;

    CreateGameFacebook.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        scrollView : null,

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
            // assumes CreateGame has already added assets
        },

        postLoad : function()
        {
            // assumes CreateGame has already merged layouts
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            g_layout.setActive('main','createGame');

            var banner = new CAAT.Actor();
            banner.setBackgroundImage(g_loader.getResult('banner'), true);
            var element = g_layout.getElementFromActive('fbBanner');
            g_layout.applyElementToCAATActor(element, banner, true, true);
            self.scene.addChild(banner);

            var title = new CAAT.TextActor();
            var element = g_layout.getElementFromActive('fbTitle');
            g_layout.applyElementToCAATActor(element, title, true, false);
            self.scene.addChild(title);

            var lineBreak = new CAAT.Actor();
            lineBreak.setBackgroundImage(g_loader.getResult('footerBreak'), true);
            var element = g_layout.getElementFromActive('break');
            g_layout.applyElementToCAATActor(element, lineBreak, true, true);
            self.scene.addChild(lineBreak);

            var footer = new CAAT.Actor();
            footer.setBackgroundImage(g_loader.getResult('footer'), true);
            var element = g_layout.getElementInPage('sub', 'createGame', 'footer');
            g_layout.applyElementToCAATActor(element, footer, true, true);
            self.scene.addChild(footer);

            var clickEvent = function(evt){ self._onBackClick(evt); };
            self._createSubButton('back2', clickEvent);

            var radioGroup = new (require('RadioGroup').RadioGroup)();
            radioGroup.init(0);

            var clickEvent = function(evt){ self._onPlayFilterClick(evt); };
            var playBtn = self._createSubToggleButton('play', clickEvent, radioGroup);
            playBtn.setSelected(!self.owner.forceFindFriends);

            var clickEvent = function(evt){ self._onInviteFilterClick(evt); };
            var inviteBtn = self._createSubToggleButton('invite', clickEvent, radioGroup);
            inviteBtn.rotateBackground(Math.PI);
            inviteBtn.setSelected(self.owner.forceFindFriends);

            var clickEvent = function(evt){ self._onShareClick(evt); };
            self._createSubButton('share', clickEvent);

            // scroll view
            self.scrollView =  require('ScrollViewFactory').ScrollViewFactory();
            self._initScroll();

            // get friends list
            self.owner.showLoadingDialog("Loading", self.scene);
            self.owner.clientConnection.getFriendsList(function(err,data){self._onFriends(err,data);});
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
            self.scrollView.cleanup();
            self.scrollView = null;
            CAAT.sceneCleanup(self.scene);
        },

        _onBackClick : function(evt)
        {
            var self = this;
            self.owner.fsm.gotoState(self.owner.GameStates.CreateGame);
        },

        _onPlayFilterClick : function(evt)
        {
            var self = this;
            self._initScroll();
            self._createFriendButtons(true);
        },

        _onInviteFilterClick : function(evt)
        {
            var self = this;
            self._initScroll();
            self._createFriendButtons(false);
        },

        _onShareClick : function(evt)
        {
            var self = this;

            var data = g_layout.getUniversalElementInView("main", "fbShareData");
            data.method = "feed";

            if (!self.owner.clientConnection.isRunningFromFile())
            {
                console.log("Sharing to facebook feed");
                FB.ui(data, self._onFacebookDialogComplete('Posted successfully to user feed, ID: '));
            }
            else
            {
                self.owner.showGenericDialog("Whoops", "Can't post to facebook\nwhen running from local file", "OK");
            }
        },

        _onFacebookDialogComplete : function(msg)
        {
            var self = this;

            return function(response)
            {
                if (!response || response.error)
                {
                    console.log("An error occurred with the Facebook Dialog API");
                }
                else
                {
                    console.log(msg + response.id);
                }
            }
        },

        _initScroll: function()
        {
            var self = this;
            var el = g_layout.getElementInPage('main', 'createGame', 'scroll');
            self.scrollView.init(el.x,el.y, el.width, el.height, false, self.director, self.scene, function(clickedActor){ self._onClickActor(clickedActor);});
            self.scrollView.buttonsEnabled = true;
        },

        _onClickActor : function(clicked)
        {
            var self = this;
            if (clicked.friend.id)
            {
                // make sure we don't already have a game with this person
                if (self._alreadyHasGame(clicked.friend.id))
                {
                    //self._invitePlayer(clicked.friend.fbId);
                    self.owner.showGenericDialog("Sorry", "You already have a game\nwith this user", "OK");
                    return;
                }

                // start a game with user
                var players = [ self.owner.clientConnection.userId, clicked.friend.id ];
                self.owner.clientConnection.createGame(players,function(err,result){
                    if (err)
                    {
                        self.owner.showGenericDialog("Error creating game", err, "OK");
                    }
                    else
                    {
                        self.owner.gotoGame(result.id);
                    }
                });
            }
            else
            {
                // invite
                self._invitePlayer(clicked.friend.fbId);
            }
        },

        _invitePlayer : function(fbId)
        {
            var self = this;

            if (!self.owner.clientConnection.isRunningFromFile())
            {
                console.log("Inviting facebook friend");
                var data = g_layout.getUniversalElementInView("main", "fbInviteData");
                data.method = "apprequests";
                data.to = fbId;
                FB.ui(data, self._onFacebookDialogComplete('Successfully invited friend, ID: '));
            }
            else
            {
                self.owner.showGenericDialog("Whoops", "Can't invite on facebook\nwhen running from local file", "OK");
            }
        },

        _onFriends : function(err,friends)
        {
            var self = this;
            self._createFriendButtons(!self.owner.forceFindFriends);
            self.owner.hideLoadingDialog();
        },

        _createFriendButtons : function(playOrInvite)
        {
            var self = this;
            var friends = self.owner.clientConnection.friends;

            // clear force flag
            self.owner.forceFindFriends = false;

            // sort friends
            friends.sort( function(a,b){return a.name.localeCompare(b.name);} );

            // create buttons, filter by playOrInvite
            for (var i = 0; i < friends.length; i++)
            {
                // skip if we're showing play but there is no user id
                if (playOrInvite && !friends[i].id)
                    continue;

                // skip if we're showing invite but there is a user id
                if (!playOrInvite && friends[i].id)
                    continue;

                // create button
                var button = self._createFriendButton(friends[i].name);
                button.friend = friends[i];

                // handle facebook profile image loaded
                button.onProfilePicCB = self._createButtonPicCallback(button);

                // do they have an award?
                if (playOrInvite && typeof friends[i].award !== 'undefined' && friends[i].award !== null)
                {
                    var el = g_layout.getElementInPage('main', 'template_FacebookButton', 'awardIconBg');
                    button.addImage(g_loader.getResult(el.id), el.x, true);

                    var el = g_layout.getElementInPage('main', 'template_FacebookButton', 'awardIcon');
                    button.addImage(g_loader.getResult(friends[i].award), el.x, true);
                    button.scaleImage(button.arImages.length-1, el.width, el.height);
                }

                // event-like behavior for this button appearing in scroll list
                button.onBecomeVisibleInScroll = self._onBecomeVisibleInScroll(button, friends[i].fbId);
                button.facebookPicRequested = false;
                button.appearedInScrollTime = 0;
                button.lastInScrollTime = -CreateGameFacebook.FACEBOOK_PIC_NONVIS_TIME;

                self.scrollView.addActor(button, 4.0);
            }
        },

        _createButtonPicCallback : function(button)
        {
            return function(image)
            {
                button.replaceImage(1, image)
                    .setPosition(button.x, button.y);
            }
        },

        _onBecomeVisibleInScroll : function(button, fbId)
        {
            var self = this;

            return function()
            {
                if (self.scene.time - button.lastInScrollTime > CreateGameFacebook.FACEBOOK_PIC_NONVIS_TIME)
                    button.appearedInScrollTime = self.scene.time;  // offscreen long enough to start over

                button.lastInScrollTime = self.scene.time;

                var visForEnough = button.lastInScrollTime - button.appearedInScrollTime > CreateGameFacebook.FACEBOOK_PIC_DELAY;

                if (visForEnough && !button.facebookPicRequested)
                {
                    button.facebookPicRequested = true;
                    self.owner.fbProfilePics.getPicture(fbId, require('FBProfilePicGetter').FBProfilePicGetter.PIC_TYPE_SQUARE, button.onProfilePicCB);
                }
            }
        },

        _createFriendButton : function(text)
        {
            var self = this;

            var splitText = require('TextBreaker').TextBreaker.splitText(text);

            var element = g_layout.getElementInPage('main', 'template_FacebookButton', 'autoButton');
            var button = g_layout.createFancyButton(element, null);
            button.setText(splitText);
            return button;
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

        // check if specified user is already in one of the user's active games
        _alreadyHasGame : function(userId)
        {
            var self = this;
            for (var i = self.owner.clientConnection.activeGames.length - 1; i >= 0; i--)
            {
                var game = self.owner.clientConnection.activeGames[i];
                for (var j = game.players.length - 1; j >= 0; j--)
                {
                    if (game.players[j].id === userId)
                        return true;
                }
            }
            return false;
        }
    };

    exports.CreateGameFacebook = CreateGameFacebook;

})(typeof exports === 'undefined'? _modules['CreateGameFacebook']={} : exports);