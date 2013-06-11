(function(exports){

    function SettingsDialog()
    {
        SettingsDialog.superclass.constructor.call(this);
        return this;
    }

    SettingsDialog.prototype =
    {
        scene: null,
        div: null,
        visible: false,

        bg: null,
        lineSpaceAdjust: 0,
        callback: null,

        timer: null,

        addToManifest : function(manifest)
        {
            manifest.settingsMainLayout = "Common/SettingsDialog/settingsdialog_main_view.json";
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'settingsDialog', g_loader.getResult('settingsMainLayout'));
        },

        init: function()
        {
            var self = this;

            self.postLoad();

            g_layout.setActive('main', 'settingsDialog');

            self.dialogContainer = new CAAT.ActorContainer();
            var dialogOffset = g_layout.getElementInPage('sub', 'settingsDialog', 'offset');
            self.dialogContainer.setPosition(dialogOffset.x, dialogOffset.y);

            var el = g_layout.getElementFromActive("drop");
            el.width = g_game.fullWidth;
            el.height = g_game.fullHeight;
            el.x = el.width/2;
            el.y = el.height/2;
            self.initialize(0, 0, SnTCanvasHelper.attachToCanvas('#settingsDialogCanvas',el.width,el.height));
            self.setSoundEffectsEnabled(false);
            self.scene = self.createScene();
            self.dialogContainer.setSize(el.width,el.height);

            self.scene.addChild((new CAAT.Actor()).setBackgroundImage(g_loader.getResult(el.id), true));
            el = self._applyElementToMostRecentActor(el, self.scene);

            // make sure that we block all input behind us
            el.enableEvents(true);
            el.mouseClick = self._DoNothing();
            el.mouseEnter = self._DoNothing();
            el.mouseExit = self._DoNothing();
            el.mouseDown = self._DoNothing();
            el.mouseUp = self._DoNothing();

            var el = g_layout.getElementFromActive("bg");
            self.dialogContainer.addChild((new CAAT.Actor().setBackgroundImage(g_loader.getResult(el.id), true)));
            self.bg = self._applyElementToMostRecentActor(el, self.dialogContainer);
            self.bg.enableEvents(false);

            var el = g_layout.getElementFromActive("title");
            var title = new CAAT.TextActor();
            self.dialogContainer.addChild(title);
            g_layout.applyElementToCAATActor(el, title, true);

            // icons
            g_layout.addAllElementsToObject(self.dialogContainer, "main", "settingsDialog", "icon");
            self.optinIcon = g_layout.getActorFromArrayByID(self.dialogContainer.childrenList, "iconCheck", false);
            self.facebookIcon = g_layout.getActorFromArrayByID(self.dialogContainer.childrenList, "iconFacebook", false);
            self.optinIcon.visible = false;
            self.facebookIcon.visible = false;

            // sfx switch
            var el = g_layout.getElementFromActive("sfxLabel");
            var muteLbl = new CAAT.TextActor();
            self.dialogContainer.addChild(muteLbl);
            g_layout.applyElementToCAATActor(el, muteLbl, true);

            var element = g_layout.getElementFromActive('sfxToggle');
            var muteSfxToggle = g_layout.createToggleButton(element, self._onMuteSfxClicked());

            if (typeof g_game.audioManager !== 'undefined')
                muteSfxToggle.setSelected(g_game.audioManager.muteSFX);

            self.dialogContainer.addChild(muteSfxToggle);

            //optIn labels
            var el = g_layout.getElementFromActive("optInLabel1");
            self.optInLbl1 = new CAAT.TextActor();
            g_layout.applyElementToCAATActor(el, self.optInLbl1, true);

            var el = g_layout.getElementFromActive("optInLabel2");
            self.optInLbl2 = new CAAT.TextActor();
            g_layout.applyElementToCAATActor(el, self.optInLbl2, true);

            //optIn toggle
            var el = g_layout.getElementFromActive('optInToggle');
            self.optInToggle = g_layout.createToggleButton(el, self._onOptInClicked());
            self.optInToggle.setAudioClip('buttonClick2');

            if (typeof g_game.audioManager !== 'undefined')
                self.optInToggle.setSelected(self.optInStatus);

            self.dialogContainer.addChild(self.optInLbl1);
            self.dialogContainer.addChild(self.optInLbl2);
            self.dialogContainer.addChild(self.optInToggle);
            self.optInLbl1.visible = false;
            self.optInLbl2.visible = false;
            self.optInToggle.visible = false;

            //logout
            var el = g_layout.getElementFromActive("logoutLabel");
            self.logoutLabel = new CAAT.TextActor();
            g_layout.applyElementToCAATActor( el, self.logoutLabel, true );
            self.dialogContainer.addChild(self.logoutLabel);

            var el = g_layout.getElementFromActive("logoutBtn");
            self.logoutBtn = g_layout.createFancyButton(el, self._onLogoutClicked());
            self.logoutBtn.addText("logout",50,null,null, "16px PosterCopy");
            self.dialogContainer.addChild(self.logoutBtn);

            self.logoutLabel.visible = false;
            self.logoutBtn.visible = false;


            // ok button
            el = g_layout.getElementFromActive('okBtn');
            self.ok = g_layout.createNavigationButton(el, self._okClicked.bind(self) );
            self.dialogContainer.addChild(self.ok);
            self.okX = self.ok.x;

            self.scene.addChild(self.dialogContainer);

            //Version number text
            el = g_layout.getElementFromActive('version');
            var version = new CAAT.TextActor();
            g_layout.applyElementToCAATActor( el, version, true );
            version.setText(g_game.VERSION);
            self.dialogContainer.addChild(version);

            self.div = $("#settingsDialogCanvas");
            //self.div.css('z-index', 750);
            self.hide();

            return self;
        },

        show: function(callback)
        {
            var self = this;
            callback = callback||null;

            if (self.bg === null)
                throw new Error("Generic dialog attempted to be shown without being created");

            if (self.visible)
            {
                self.timer.cancel();
            }

            self.scene.setPaused(false);
            self.stopped = false;
            self.callback = callback;
            self.visible = true;

            // NOTE: this timer fixes a bug where when the dialog shows itself it renders a garbage layout for a few seconds
            //          moving to using director.stopped instead of just scene.paused alleviated this partially and this timer
            //          seems to be the final touch
            self.timer = self.scene.createTimer(self.scene.time, 100,
                function(sceneTime, timerTaskTime, timerTask)
                {
                    self.div.show();
                    self.timer = null;
                },
                null,null);

            // if usr is logged in, display the optIN and FB options
            if(g_game.clientConnection.sessionToken!==null && g_game.clientConnection.isFacebook == false)
            {
                self.optInLbl1.visible = true;
                self.optInLbl2.visible = true;
                self.optInToggle.visible = true;
                self.optinIcon.visible = true;

                //FB
                self.logoutLabel.visible = true;
                self.logoutBtn.visible = true;
                self.facebookIcon.visible = false;
            }
            if(g_game.clientConnection.sessionToken!==null && g_game.clientConnection.isFacebook == true)
            {
                self.logoutLabel.visible = true;
                self.logoutBtn.visible = true;
                self.optInLbl1.visible = true;
                self.optInLbl2.visible = true;
                self.optInToggle.visible = true;
                self.optinIcon.visible = true;
                self.facebookIcon.visible = true;
            }
            if(g_game.clientConnection.sessionToken===null)
            {
                self.logoutLabel.visible = false;
                self.logoutBtn.visible = false;
                self.optInLbl1.visible = false;
                self.optInLbl2.visible = false;
                self.optInToggle.visible = false;
                self.optinIcon.visible = false;
                self.facebookIcon.visible = false;
            }
            return self;
        },

        hide: function()
        {
            var self = this;

            self.scene.setPaused(true);
            self.stopped = true;
            self.callback = null;
            self.visible = false;

            self.div.hide();

            return self;
        },

        storeSettings : function()
        {
            var self = this;
            window.localStorage.setItem(g_game.getName() + ".sfx", JSON.stringify(g_game.audioManager.muteSFX));
            window.localStorage.setItem(g_game.getName() + ".music", JSON.stringify(g_game.audioManager.muteMusic));
        },

        loadSettings : function()
        {
            var self = this;
            g_game.audioManager.muteSFX = JSON.parse(window.localStorage.getItem(g_game.getName() + ".sfx"));
            g_game.audioManager.muteMusic = JSON.parse(window.localStorage.getItem(g_game.getName() + ".music"));
            self.optInStatus =  JSON.parse(window.localStorage.getItem(g_game.getName() + ".optInStatus"));
        },

        _onMuteSfxClicked: function()
        {
            var self = this;

            return function()
            {
                if (typeof g_game.audioManager === 'undefined')
                    return;

                if (g_game.audioManager.muteSFX===true) {
                    console.log("muteSFX!!!! trigger the sound");

                    g_game.audioManager.playSound("buttonClick3")
                }
                
                g_game.audioManager.toggleSFX();
            }
        },

        _onMuteMusicClicked: function()
        {
            var self = this;

            return function()
            {
                if (typeof g_game.audioManager === 'undefined')
                    return;
            }
        },

        _onOptInClicked: function()
        {
            var self = this;
            return function()
            {
                // first lookup current setting, then pass the current val to setter "setVideoOptIn" so it knows which way to toggle.
                g_game.clientConnection.getVideoOptIn(function(response) {
                    var curr = response.data.games.improvinator.optIn;
                    g_game.clientConnection.setVideoOptIn(curr);
                    self.optInStatus = !curr;
                    // store in localStorage
                    window.localStorage.setItem(g_game.getName() + ".optInStatus", curr);
                });
            }
        },

        _onLogoutClicked : function()
        {
            var self = this;

            return function()
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
                self.div = $("#settingsDialogCanvas");
                self.hide();
            }
        },

        _okClicked: function()
        {
            var self = this;
            var callback = null;

            self.storeSettings();

            if (self.callback)
                callback = self.callback;

            self.hide();

            if (callback)
                callback(true);
        },

        _DoNothing: function()
        {
            return function(event)
            {
            }
        },

        ////////////////////////
        // Helpers
        _applyElementToMostRecentActor: function(element, container)
        {
            var self = this;
            var actor = container.childrenList[container.childrenList.length-1];
            g_layout.applyElementToCAATActor(element, actor);
            return actor;
        }
    };

    extend(SettingsDialog, require('GameDirector').GameDirector);
    exports.SettingsDialog = SettingsDialog;

})(typeof exports === 'undefined'? _modules['SettingsDialog']={} : exports);
