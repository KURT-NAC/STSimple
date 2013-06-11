(function(exports){

    function ActiveGames(owner,director)
    {
        this.init(owner,director);
    }

    ActiveGames.prototype =
    {
        ////////////////////
        // Constants
        States :
        {
            FetchGames  : 'loading',
            SelectGame : 'select'
        },

        SCROLL_PADDING : 3,
        DAYS_UNTIL_NUDGE : 1,
        //24 Hours
        MIN_NUDGE_FREQ : 1000*60*60*24,
        MESSAGE_URL_DATA : "http://s3.amazonaws.com/improv_config/message.json",
        MESSAGE_URL_IMAGE : "http://s3.amazonaws.com/improv_config/",
        ////////////////////

        owner : null,
        director : null,
        scene : null,

        scrollView : null,

        editMode : false,
        pendingDeleteID : null,
        isWaiting : false,

        gameRefreshInterval:null,
        oldActiveGames:null,

        fsm : null,
        showingReward:false,

        init : function(owner, director, scene)
        {
            var self = this;

            // validate arguments
            if (owner === null || director === null)
            {
                throw new Error("Scene initiated with NULL" +
                    (!owner ? " Owner" : "") +
                    (!director ? " Director" : ""), self);
            }

            self.owner = owner;
            self.director = director;
            self.scene = scene||(director === null ? null : director.createScene());
            if (!self.scene)
                throw new Error("Scene state created with NULL scene", self);

            self.fsm = new (require('FSM').FSM)();
            
            self.fsm.addState(self.States.FetchGames,
                function(){self.enterLoading();},
                null,
                function(){self.leaveLoading();});
            
            self.fsm.addState(self.States.SelectGame,
                function(){self.enterSelect();},
                null,
                function(){self.leaveSelect();});

            self.arButtonCBs = new Array();
        },

        addToManifest : function(manifest)
        {
            manifest.activeMainLayout = "Common/ActiveGames/activegames_main_view.json";
            manifest.activeSubLayout = "Common/ActiveGames/activegames_sub_view_" + g_game.platform + ".json";

            if (typeof manifest.activeFooter === 'undefined')
                manifest.activeFooter = "Common/ActiveGames/bar_strip.png";
            if (typeof manifest.activeFooterBarL === 'undefined')
                manifest.activeFooterBarL = "Common/ActiveGames/bar1.png";
            if (typeof manifest.activeFooterBarR === 'undefined')
                manifest.activeFooterBarR = "Common/ActiveGames/bar2.png";
            if (typeof manifest.activeCharacter === 'undefined')
                manifest.activeCharacter = "Common/ActiveGames/active_character.png";
            if (typeof manifest.yourBkgd === 'undefined')
                manifest.yourBkgd = "Common/ActiveGames/your_bkgd.jpg";
            if (typeof manifest.theirBkgd === 'undefined')
                manifest.theirBkgd = "Common/ActiveGames/their_bkgd.png";
            if (typeof manifest.awardsButton === 'undefined')
                manifest.awardsButton = "Common/ActiveGames/award_button.png";
            if (typeof manifest.awardsIcon === 'undefined')
                manifest.awardsIcon = "Common/AwardsScreen/award_logo.png";
            if (typeof manifest.storeButton === 'undefined')
                manifest.storeButton = "Common/ActiveGames/store_button.png";
            if (typeof manifest.playIcon === 'undefined')
                manifest.playIcon = "Common/SharedAssets/playicon.png";
            if (typeof manifest.thumbFrame === 'undefined')
                manifest.thumbFrame = "Common/SharedAssets/pg2_facebook_border.png";
            if (typeof manifest.thumbDefaultSmall === 'undefined')
                manifest.thumbDefaultSmall = "Common/SharedAssets/defaultuser_sml.png";
            if (typeof manifest.trashIcon === 'undefined')
                manifest.trashIcon = "Common/ActiveGames/trashicon.png";
            if (typeof manifest.nudgeIcon === 'undefined')
                manifest.nudgeIcon = "Common/ActiveGames/nudgeicon.png";
            if (typeof manifest.awardIconBkgdSml === 'undefined')
                manifest.awardIconBkgdSml = "Common/SharedAssets/award_icon_bkgd_sml.png";
            if (typeof manifest.jeanYuhs === 'undefined')
                manifest.jeanYuhs = "Common/ActiveGames/jeanyuhs.jpg";
            if (typeof manifest.bonusStarburst === 'undefined')
                manifest.bonusStarburst = "Common/ActiveGames/bonus_starburst.png";
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'activeGames', g_loader.getResult('activeMainLayout'));
            g_layout.mergePage('main', 'template_ActiveGameButton', g_loader.getResult('activeMainLayout'));
            g_layout.mergePage('main', 'template_ActiveGameButton2', g_loader.getResult('activeMainLayout'));
            g_layout.mergePage('sub', 'activeGames', g_loader.getResult('activeSubLayout'));

            g_layout.adjustDockElements('sub', 'activeGames');
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;
            self.editMode = false;
            self.owner.topBar.setStatus("");
            //update the client config
            g_game.updateConfig();
            g_game.clientConnection.processQueuedInAppPurchaseReceipts();
            self.fsm.gotoState(self.States.FetchGames);
        },

        tick : function(deltaTime)
        {
            var self = this;
            self.fsm.tick(deltaTime);
        },

        leave : function(targetStateName)
        {
            var self = this;
            self.fsm.stop();
        },

        ////////////////////
        // State Functions

        enterLoading : function()
        {
            var self = this;

            // show loading screen
            self.owner.showLoadingDialog("Loading");

            async.parallel([
                    function getGames(cb)
                    {
                        // refresh list of active games
                        self.owner.clientConnection.getActiveGameList(cb);
                    },

                    function getInventory(cb)
                    {
                        // get player's inventory
                        self.owner.clientConnection.getInventory(cb);
                    }
                ],
                function(err,results)
                {
                    if (err)
                    {
                        self.owner.hideLoadingDialog();
                        self.owner.showGenericDialog("Error","Unable to get games", "OK", self._onMajorError() );
                        return;
                    }

                    self.owner.inventory.setUserInventory(results[1].data);
                    $.ajax({
                        'type': 'GET',
                        'cache' : false,
                        'url': self.MESSAGE_URL_DATA,
                        'dataType': 'json'
                    }).done(
                        function(data) {
                        //console.log(data);
                        if(data.show==true)
                        {
                            console.log("Server message");
                        }
                        else
                            return;

                        //Check to see if this client has already seen the message
                        if(window.localStorage.getItem(g_game.getName() + ".messageSeen")==data.id)
                        {
                            console.log("Client has already seen the server message")
                            return
                        }

                        //create the message actor
                        var message = new CAAT.ActorContainer().setSize(768,1024);
                        g_layout.addAllElementsToObject(message, "main", "activeGames", "message");
                        //Set the button text
                        message.childrenList[1].childrenList[2].text=data.buttonText;
                        message.visible=false;

                        //click handler
                        message.childrenList[1].enableEvents(true).mouseClick=function(event){
                            //destroy the message popup
                            message.setExpired().setDiscardable(true).setParent(null);
                            //Store the ID of the message
                            window.localStorage.setItem(g_game.getName() + ".messageSeen",data.id);
                            //Show the top bar
                            var topCanvas=$('#topCanvas');
                            topCanvas.show();
                        }

                        self.scene.addChild(message);

                        // Load the message graphic and display once loaded
                        var img = new Image();
                        img.onload = function() {
                            message.childrenList[0].setBackgroundImage(img, true);
                            // Hide the top bar
                            $('#topCanvas').hide();
                            message.visible = true;
                        };
                        img.onerror = function() { console.log("Error loading image"); };
                        img.src = self.MESSAGE_URL_IMAGE + data.image;
                        console.log("loading message image:" + self.MESSAGE_URL_IMAGE + data.image);
                    });

                    self._onGamesLoaded(null);
                });
        },

        _onMajorError : function()
        {
            var self = this;
            return function()
            {
                self.owner.fsm.gotoState(self.owner.GameStates.LoginPage);
            }
        },

        _onGamesLoaded : function(err)
        {
            var self = this;
            var reward = self.owner.clientConnection.dailyReward;
            
            if (typeof reward !== 'undefined' && reward.won)
            {
                self.owner.dailyRewards.show(reward.days, null, self.owner);
                self.showingReward=true;
            }
            else
            {
                self.showingReward=false;
            }

            self.fsm.gotoState(self.States.SelectGame); 
        },

        leaveLoading : function()
        {
            var self = this;
        },

        enterSelect : function()
        {
            var self = this;

            // some temp variables to prevent duplicate declaration
            var button, i, g;

            self.isWaiting = false;

            // scroll view line break
            var lineBreak = new CAAT.Actor();
            lineBreak.setBackgroundImage(g_loader.getResult('footerBreak'), true);
            var element = g_layout.getElementInPage('main', 'activeGames', 'break');
            g_layout.applyElementToCAATActor(element, lineBreak, true, true);
            self.scene.addChild(lineBreak);

            g_layout.addAllElementsToObject(self.scene, "sub", "activeGames");

            // wrench button
            var wrench = g_layout.getActorFromArrayByID(self.scene.childrenList, 'editToggle');
            wrench.setSelected(self.editMode);
            wrench.setAudioClip('buttonClick2');
            var clickEvent = function(editing){ self._onEditList(editing); };
            wrench.setCallback(clickEvent);

            // Store button
            var store = g_layout.getActorFromArrayByID(self.scene.childrenList, 'storeButton');
            var clickEvent = function() {  self.owner.storeDialog.show(self.director); };
            store.setCallback(clickEvent);

            // Awards button
            if (self.owner.GameStates.AwardsScreen)
            {
                var awards = g_layout.getActorFromArrayByID(self.scene.childrenList, 'awardsButton');
                var clickEvent = function() {  self.owner.fsm.gotoState(self.owner.GameStates.AwardsScreen); };
                awards.setCallback(clickEvent);
            }

            // scroll view
            var el = g_layout.getElementInPage("main", "activeGames", "scrollRegion");
            self.scrollView =  require('ScrollViewFactory').ScrollViewFactory();
            self.scrollView.init(
                el.x, el.y,
                el.width, el.height,
                false, // horizontal
                self.director, self.scene,
                function(c,l,p){ self._onClickGame(c,l,p);},
                null, // color fill
                function(){ self.fsm.gotoState(self.States.FetchGames);} );
            self.scrollView.buttonsEnabled = true;

            var s = g_loader.getResult('yourBkgd');
            var bannerContainer = new CAAT.ActorContainer().setSize(s.width, s.height);
            g_layout.addAllElementsToObject(bannerContainer, "main", "activeGames", "yourMove");
            self.scrollView.addActor(bannerContainer, 0);

            // Pull down to refresh (iPad & iPhone5 only)
            // FIXME MAGIC NUMBERS ARE EVIL, MMKAY?
            if (window.innerWidth > 700 || window.innerHeight > 1100)
            {
                var refresh = new CAAT.Actor();
                refresh.setBackgroundImage(g_loader.getResult('activeRefresh'), true);
                var element = g_layout.getElementInPage('main', 'activeGames', 'pulldown');
                g_layout.applyElementToCAATActor(element, refresh, true, true);
                self.scene.addChild(refresh);
            }


            // break out games into my and their turn arrays
            var myTurn = [];
            var theirTurn = [];
            var games = self.owner.clientConnection.activeGames;
            for (i = games.length - 1; i >= 0; i--)
            {
                g = games[i];

                // find location of user in the player list
                if (self.owner.clientConnection.isUserPlayerIdx(0, i))
                {
                    g.seat = 0;
                    g.otherSeat = 1;
                }
                else if (self.owner.clientConnection.isUserPlayerIdx(1, i))
                {
                    g.seat = 1;
                    g.otherSeat = 0;
                }
                else
                {
                    continue;
                }

                // add game to appropriate array
                var playerTurn = g.turn % g.players.length;
                if (playerTurn === g.seat)
                    myTurn.push(g);
                else
                    theirTurn.push(g);
            }

            // my turn
            if (myTurn.length > 0)
            {
                // games that are waiting for me
                for (i = myTurn.length - 1; i >= 0; i--)
                {
                    g = myTurn[i];

                    var curDate = new Date();
                    var dt = 0;
                    if (typeof g.timestamp !== 'undefined')
                        dt = curDate.getTime() - g.timestamp;

                    if (g.pending)
                        self.isWaiting = true;

                    var oppName = g.pending ? "Waiting for a match..." : g.players[g.otherSeat].name;


                    // Work out if it's bonus round or not
                    var bonus = g.turn % self.owner.BONUS_ROUND_FREQ === 0 && g.state.step === "guess" && g.turn!=0;
                    if (!bonus)
                        bonus = (g.turn+1) % self.owner.BONUS_ROUND_FREQ === 0 && g.state.step === "guess";
                    //Always force the bonus round on turn 2 or 3
                    if((g.turn===2&& g.state.step === "guess")|| (g.turn===3&&g.state.step === "guess"))
                        bonus=true;

                    button = self._createGameButton(oppName, dt, 0, bonus, true, g.turn);
                    button.id = 'myTurn';
                    button.game = g;

                    self.scrollView.addActor(button, self.SCROLL_PADDING);

                    if (!g.pending)
                    {
                        button.onProfilePicCB = self._createButtonPicCallback(button);
                        self.owner.fbProfilePics.getPicture(
                          g.players[g.otherSeat].fbId,
                          require('FBProfilePicGetter').FBProfilePicGetter.PIC_TYPE_SQUARE,
                          button.onProfilePicCB
                        );

                        if(g.players[g.otherSeat].name==="Gene Yuhs")
                            button.replaceImage(1, g_loader.getResult('jeanYuhs')).setPosition(button.x, button.y);

                        button.onBestAwardCB = self._getBestAwardCallback(button);
                        self.owner.clientConnection.getBestAwardOwned(g.players[g.otherSeat].id, 3, button.onBestAwardCB);
                    }
                }
            }

            // create game button
            button = self._createActionButton("START A NEW GAME!", g_loader.getResult('plus'));
            button.id = "createGame";
            self.scrollView.addActor(button);

            // their turn
            var s = g_loader.getResult('theirBkgd');
            bannerContainer = new CAAT.ActorContainer().setSize(s.width, s.height);
            g_layout.addAllElementsToObject(bannerContainer, "main", "activeGames", "theirMove");
            self.scrollView.addActor(bannerContainer, 0);
            if (theirTurn.length > 0)
            {
                // games I'm waiting for them
                for (i = theirTurn.length - 1; i >= 0; i--)
                {
                    g = theirTurn[i];

                    var curDate = new Date();
                    var dt = 0;
                    if (typeof g.timestamp !== 'undefined')
                        dt = curDate.getTime() - g.timestamp;

                    var dtNudge = 0;
                    if (typeof g.lastNudgeTime !== 'undefined')
                        dtNudge = curDate.getTime() - g.lastNudgeTime;

                    button = self._createGameButton(g.players[g.otherSeat].name, dt, dtNudge, false, false, g.turn);
                    button.id = 'theirTurn';
                    button.game = g;

                    self.scrollView.addActor(button, self.SCROLL_PADDING);
                    button.onProfilePicCB = self._createButtonPicCallback(button);
                    self.owner.fbProfilePics.getPicture(
                      g.players[g.otherSeat].fbId,
                      require('FBProfilePicGetter').FBProfilePicGetter.PIC_TYPE_SQUARE,
                      button.onProfilePicCB
                    );

                    if(g.players[g.otherSeat].name==="Gene Yuhs")
                        button.replaceImage(1, g_loader.getResult('jeanYuhs')).setPosition(button.x, button.y);

                    button.onBestAwardCB = self._getBestAwardCallback(button);
                    self.owner.clientConnection.getBestAwardOwned(g.players[g.otherSeat].id, 3, button.onBestAwardCB);
                }
            }

            // find friends button
            button = self._createActionButton("FIND FRIENDS\nON FACEBOOK", g_loader.getResult('facebookIcon'));
            button.id = "findFriends";
            self.scrollView.addActor(button);

            self.scrollView.finalize();
            self._onEditList(self.editMode);

            self._addAdditionalButtonCallbacks();

            if (!self._handleLaunchFromPush())
            {
                // unhide loading screen next frame
                if(!self.showingReward)
                    window.setTimeout(function(){self.owner.hideLoadingDialog();},1);
            }

            //Start the gameList refresh timer
            self.gameRefreshInterval=window.setInterval(self.refreshGamesList(),g_game.CONFIG.REFRESHRATE);
        },

        refreshGamesList:function(){
            var self=this;
            return function(){
                self.owner.clientConnection.getActiveGameList(self.checkGamesList());
            }
        },

        checkGamesList:function(){
            var self=this;

            return function(){
                //console.log("Checking Games list");

                if(!self.oldActiveGames)
                {
                    self.oldActiveGames=g_game.clientConnection.activeGames;
                    return;
                }

                if(JSON.stringify(g_game.clientConnection.activeGames)==JSON.stringify(self.oldActiveGames))
                    //Do nothing, no refresh required
                    ;
                else
                {
                    //console.log("Refresh Required!");
                    self.oldActiveGames=g_game.clientConnection.activeGames;
                    self.fsm.gotoState(self.States.FetchGames);
                }
            }
        },

        leaveSelect : function()
        {
            var self = this;
            self.scrollView.cleanup();
            self.scrollView = null;
            window.clearInterval(self.gameRefreshInterval);
            CAAT.sceneCleanup(self.scene);
        },

        _handleLaunchFromPush : function()
        {
            var self = this;

            if (self.owner.clientConnection.launchGameFromPushId)
            {
                for (var i = 0; i < self.scrollView.scrollContainer.childrenList.length; i++)
                {
                    var button = self.scrollView.scrollContainer.childrenList[i];
                    if (button.id === 'myTurn' && button.game.id === self.owner.clientConnection.launchGameFromPushId)
                    {
                        self.owner.hideLoadingDialog();
                        self.owner.gotoGame(self.owner.clientConnection.launchGameFromPushId);
                        return true;
                    }
                }
            }
            else if (self.owner.clientConnection.launchAwardFromPush)
            {
                self.owner.hideLoadingDialog();
                self.owner.fsm.gotoState(self.owner.GameStates.AwardsScreen);
                return true;
            }

            return false;
        },

        addAdditionalButtonCallback : function(buttonId, callback)
        {
            var self = this;
            var btnCB = { "button":buttonId, "cb":callback };
            self.arButtonCBs.push(btnCB);
        },

        _addAdditionalButtonCallbacks : function()
        {
            var self = this;

            for (var i = 0; i < self.arButtonCBs.length; i++)
            {
                var button = g_layout.getActorFromArrayByID(self.scene.childrenList, self.arButtonCBs[i].button);

                if (button && button.setCallback)
                {
                    button.setCallback(self.arButtonCBs[i].cb);
                }
            }
        },

        _createButtonPicCallback : function(button)
        {
            var self = this;

            return function(image)
            {
                button.replaceImage(1, image).setPosition(button.x, button.y);
            }
        },

        _getBestAwardCallback : function(button)
        {
            return function(error, imageName)
            {
                imageName += "Icon";
                if (imageName !== null)
                {
                    var el = g_layout.getElementInPage('main', 'template_ActiveGameButton', 'awardIcon');
                    button.addImage(g_loader.getResult(imageName), el.x, true);
                    button.scaleImage(button.arImages.length-1, el.width, el.height);
                }
            }
        },

        _onEditList : function(editing)
        {
            var self = this;

            self.editMode = editing;

            for (var i = 0; i < self.scrollView.scrollContainer.childrenList.length; i++)
            {
                var button = self.scrollView.scrollContainer.childrenList[i];
                if (button.id == 'myTurn' || button.id == 'theirTurn')
                {
                    if (button.nonEditDecorator >= 0)
                        button.setImageVisible(button.nonEditDecorator, !editing);

                    button.setImageVisible(button.editDecorator, editing);
                }
            }
        },

        _onClickGame : function(clicked, lastClicked, pos)
        {
            var self = this;
            var deleteGameId = null;

            if (clicked.id == 'createGame')
            {
                self.owner.forceFindFriends = false;
                self.owner.fsm.gotoState(self.owner.GameStates.CreateGame, { 'waitingForGame': self.isWaiting });
            }
            else if (clicked.id === 'findFriends')
            {
                if (self.owner.clientConnection.isFacebook)
                {
                    self.owner.forceFindFriends = true;
                    self.owner.fsm.gotoState(self.owner.GameStates.CreateGame);
                }
                else
                {
                    self.owner.showGenericDialog(
                      "Facebook Required",
                      "You must login with Facebook\nfor this feature",
                      "Yes do it",
                      "Cancel",
                      self._logOut()
                    );
                }
            }
            else if (clicked.id == 'myTurn')
            {
                if (!self.editMode)
                {
                    if (clicked.game.pending)
                        self.owner.showGenericDialog("Waiting", "Waiting to match you\nwith a random player.", "Ok");
                    else
                        self.owner.gotoGame(clicked.game.id);
                }
                else
                {
                    deleteGameId = clicked.game.id;
                }
            }
            else if (clicked.id == 'theirTurn')
            {
                if (!self.editMode)
                {
                    if (clicked.nudgable)
                    {
                        var otherPlayer = clicked.game.players[clicked.game.otherSeat];

                        if (self.owner.clientConnection.isFacebook && otherPlayer.fbId)
                        {
                            if (!self.owner.clientConnection.isRunningFromFile())
                            {
                                console.log("Nudging facebook friend");

                                var data = g_layout.getUniversalElementInView("main", "fbNudgeData");
                                data.method = "apprequests";
                                data.to = otherPlayer.fbId;
                                var oppNames = otherPlayer.name.split(' ');
                                data.title = data.title.replace("%s", oppNames[0]);
                                FB.ui(data, self._onFacebookDialogComplete('Successfully nudged friend, ID: '));
                            }
                            else
                            {
                                self.owner.showGenericDialog(
                                  "Warning",
                                  "Can't Facebook nudge\nwhen running from local file", "OK"
                                );
                            }
                        }

                        self.owner.clientConnection.sendNudge(
                          clicked.game.id,
                          otherPlayer.id,
                          false,
                          function(err, response) {
                            if (err) console.log('Error occurred nudging opponent');
                              else
                                self.fsm.gotoState(self.States.FetchGames);
                          }
                        );
                    }
                }
                else
                {
                    deleteGameId = clicked.game.id;
                }
            }

            if (deleteGameId)
            {
                self.pendingDeleteID = clicked.game.id;
                self.owner.showGenericDialog(
                  "Confirm",
                  "Are you sure you want\nto delete this game?",
                  "Yes", "No",
                  function(ok) { self._handleConfirmDelete(ok); }
                );
            }
        },

        _logOut : function()
        {
            return function(ok)
            {
                if(ok)
                {
                    // reset obj
                    g_game.clientConnection.sessionToken = null;
                    g_game.clientConnection.userId = null;
                    g_game.clientConnection.isFacebook = false;
                    delete g_game.clientConnection.activeGames;
                    delete g_game.clientConnection.dailyReward;
                    // clear localStorage
                    localStorage.clear();
                    // reset topBar
                    g_game.topBar.setStatus("");
                    g_game.topBar.setCoins();

                    g_game.fsm.gotoState("loginPage");
                }
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

        _handleConfirmDelete: function(ok)
        {
            var self = this;

            if (ok && self.pendingDeleteID)
            {
                self.owner.clientConnection.deleteGame(self.pendingDeleteID, function(err,response)
                {
                    self.pendingDeleteID = null;
                    self.fsm.gotoState(self.States.FetchGames);
                });
            }
        },

        _createActionButton : function(text, leftIcon)
        {
            var self = this;
            g_layout.setActive("main", "template_ActiveGameButton");
            var lr = g_layout.getElementFromActive("typeOneLR");

            var fancy = new (require('FancyButton').FancyButton)();
            var config = new Object();
            config.buttonImage = g_loader.getResult('buttonType1Slice');
            config.map = g_loader.getResult('typeOneMap');
            config.bar = 'bar';
            config.capL = 'cap_left';
            config.capR = 'cap_right';
            config.callback = null;// NOTE: The scroll view should handle the click action
            fancy.init(config);

            fancy.addBackgroundImage(g_loader.getResult('darkStrip'));
            fancy.setButtonPos(fancy.width*0.5, fancy.height*0.5, 0.5, 0.5);

            fancy.addText(text, lr.m, "center", "white", "24px PosterCopy");// TODO: src from layout
            fancy.addImage(leftIcon, lr.l, true);
            fancy.addImage(g_loader.getResult('playIcon'), lr.r);

            return fancy;
        },

        _createGameButton : function(name, dt, dtNudge, bonus, yours, turns)
        {
            var self = this;

            name = name || "<broken>";

            var ar = [];

            if (yours)
                g_layout.addAllElementsToObject(ar, "main", "template_ActiveGameButton", "auto");
            else
                g_layout.addAllElementsToObject(ar, "main", "template_ActiveGameButton2", "auto");
            var button = ar[0];

            // delta time
            var timeUnit = Math.floor(dt / (1000*60*60*24));
            var timeName = "";

            if (timeUnit == 0)
            {
                timeUnit = Math.floor(dt / (1000*60*60));
                if (timeUnit == 0)
                {
                    timeUnit = Math.floor(dt / (1000*60));
                    timeName = (timeUnit <= 1) ? "Minute" : "Minutes";
                }
                else
                {
                    timeName = (timeUnit <= 1) ? "Hour" : "Hours";
                }
            }
            else
            {
                timeName = (timeUnit <= 1) ? "Day" : "Days";
            }

            timeUnit = timeUnit <= 0 ? 1 : timeUnit;

            ar = button.textActorByString("TBD");
            if (ar)
                ar.setText('' + timeUnit);

            ar = button.textActorByString("DAYS");
            if (ar)
                ar.setText(timeName);

            g_layout.setActive("main", "template_ActiveGameButton");

            // username
            var el = g_layout.getElementFromActive("username");

            var playerName = name;

            // Only break name if playing bot or waiting for match
            if (name === "Gene Yuhs" || name === "Waiting for a match...") {
                playerName = require('TextBreaker').TextBreaker.splitText(name);
            }

            button.addText(playerName, el.x, el.textAlign, el.fill, el.font);
            button.text[2][0].text = turns;

            var nImages = 3;

            button.nonEditDecorator = -1;

            // play/nudge icon
            if (yours)
            {
                el = g_layout.getElementFromActive(bonus ? "bonus" : "playIcon");
                button.addImage(g_loader.getResult(el.id), el.x, el['regX'] === 0.5);
                button.nonEditDecorator = nImages++;
                button.bonusRound = bonus;
            }
            else
            {   // potential nudge icon
                if (timeName.indexOf("Day") != -1 && timeUnit >= self.DAYS_UNTIL_NUDGE && dtNudge > self.MIN_NUDGE_FREQ)
                {
                    el = g_layout.getElementFromActive("nudgeIcon");
                    button.addImage(g_loader.getResult(el.id), el.x, el['regX'] === 0.5);
                    button.nonEditDecorator = nImages++;
                    button.nudgable = true;
                }
                else
                {
                    button.nudgable = false;
                }

                button.bonusRound = false;
            }

            // delete icon
            el = g_layout.getElementFromActive("deleteIcon");
            button.addImage(g_loader.getResult(el.id), el.x, el['regX'] === 0.5);
            button.editDecorator = nImages++;
            button.setImageVisible(nImages-1, false);

            return button;
        },


        _findChildActor : function( actor, pos )
        {
            var self = this;

            // early out if point is outside the container
            if (!actor.contains(pos.x,pos.y) )
                return null;

            // search each child in z-order
            var num = actor.getNumChildren();
            for (var i = num - 1; i >= 0; i--)
            {
                var child = actor.getChildAt(i);
                var childPos = actor.modelToModel( new CAAT.Point(pos.x,pos.y),child);
                if (child.contains(childPos.x,childPos.y))
                    return child;
            }

            return null;
        }
    };

    exports.ActiveGames = ActiveGames;

})(typeof exports === 'undefined'? _modules['ActiveGames']={} : exports);
