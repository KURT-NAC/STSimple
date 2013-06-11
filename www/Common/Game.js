function Game()
{
}

Game.MINIMUM_SPLASH_TIME = 2000;
Game.SPLASH_CHECK_INCR = 100;
Game.SPLASH_ANIM_TIME = 1200;
Game.ENABLE_FACEBOOK_LAYOUT = false;
Game.ENABLE_AUTO_CROP = true;
Game.ENABLE_AUTO_SCALE = true;

Game.prototype =
{
    /////////////////////
    // GameState Names
    GameStates :
    {
        Splash              : 'splash',
        Loading             : 'loading',
        Intro               : 'intro',
        LoginPage           : 'loginPage',
        EmailLoginPage      : 'emailLoginPage',
        EmailCreatePage     : 'emailCreatePage',
        Main                : 'activeGames',
        CreateGame          : 'createGame',
        CreateGameFacebook  : 'createGameFB',
        CreateGameUsername  : 'CreateGameUsername',
        CreateGameEmail     : 'CreateGameEmail',
        AwardsScreen        : 'awards'
    },
   /////////////////////

    canvas:null,
    director:null,

    topBar:null,
    background:null,
    storeDialog:null,
    settingsDialog:null,
    dailyRewards:null,
    awardPopup:null,
    genericDialog:null,
    loadingDialog:null,
    inventory:null,
    fbProfilePics:null,
    audioManager:null,

    fsm:null,

    initialized:false,

    onDevice:false,
    platform:"",
    filePlatform:"",

    splashPreload:null,
    splashImage:null,
    splashAnim:null,
    loadComplete:false,
    splashTimerElapsed:0,
    postLoading:false,
    forceFindFriends:false,

    globalScale: { x: 1.0, y: 1.0 },
    globalOffset: { x: 0.0, y: 0.0 },
    mainSize: { x: 768, y: 904 },

    init : function (isOnDevice) {
        var self = this;

        // check if we're on a iPhone4 display and enable full resolution
        if (window.devicePixelRatio == 2 && window.innerWidth == 320)
        {
            $('head').append('<meta name="viewport" content="user-scalable=no, initial-scale=0.5, maximum-scale=0.5, minimum-scale=0.5, width=device-width, height=device-height, target-densitydpi=device-dpi" />');
        }

        //CAAT.DEBUG = true;
        //CAAT.DEBUGAABB = true;

        // flag that init has been called
        self.initialized = true;
        self.onDevice = isOnDevice;

        var useDefaultLayout = self.onDevice || !Game.ENABLE_FACEBOOK_LAYOUT;
        self.platform = useDefaultLayout ? "ipad" : "facebook";
        self.filePlatform = useDefaultLayout ? "" : ("_" + self.platform);

        // initialize game connection to the server
        self._createClientConnection();
        self.clientConnection.init(isOnDevice);

        // treat everything as mouse clicks
        CAAT.TOUCH_BEHAVIOR = CAAT.TOUCH_AS_MOUSE;

        // Set up our layout
        var width = 768;
        var height = 1024;

        var defaultSize = {x: width, y: height};

        if (self.platform == "facebook")
        {
            var approxScale = 580 / width;
            var extendedWidth = Math.ceil(760 / approxScale);
            var actualScale = width / extendedWidth;
            self.globalScale.x = actualScale;
            self.globalScale.y = actualScale;
            width = extendedWidth;
            height = self.mainSize.y;
        }
        else if (Game.ENABLE_AUTO_CROP || Game.ENABLE_AUTO_SCALE)
        {
            var windowSize = {x: window.innerWidth, y: window.innerHeight};

            // Make sure we are using the right orientation
            if (isOnDevice && (windowSize.x > windowSize.y))
            {
                var tmp = windowSize.x;
                windowSize.x = windowSize.y;
                windowSize.y = tmp;
            }

            // In case we're over by a pixel or something, don't show scroll bars
            $("body").css("overflow", "hidden");
            if (Game.ENABLE_AUTO_SCALE)
            {
                if (Game.ENABLE_AUTO_CROP || ((windowSize.x / windowSize.y) > (defaultSize.x / defaultSize.y)))
                {
                    self.globalScale.y = windowSize.y / defaultSize.y;
                    self.globalScale.x = self.globalScale.y;
                }
                else if (!Game.ENABLE_AUTO_CROP)
                {
                    self.globalScale.x = windowSize.x / defaultSize.x;
                    self.globalScale.y = self.globalScale.x;
                }
            }
            self.globalOffset.x = Math.floor((windowSize.x - defaultSize.x * self.globalScale.y) / 2);
            width = Math.ceil(self.globalOffset.x + (windowSize.y * defaultSize.x / defaultSize.y + Math.min(self.globalOffset.x * 2, 0)) / self.globalScale.x) - self.globalOffset.x;
            height = Math.floor(windowSize.y / self.globalScale.y);
        }

        self.fullWidth = Math.max(width, defaultSize.x);
        self.fullHeight = Math.max(height, defaultSize.y);

        // When scaling is enabled, and sometimes just in general, coordinate clamping will cause gaps to
        // show up between controls.
        CAAT.setCoordinateClamping(false);

        // create canvas and director
        self.canvas = SnTCanvasHelper.attachToCanvas('#mainCanvas',width,height);

        // create director, normally we'd chain calls but not all of CAAT.Director
        // functions are returning 'this' so we are separating everything to be safe.
        self.director = new (require('GameDirector').GameDirector)();
        self.director.initialize(width, height, self.canvas);
        //self.director.setClear(CAAT.Director.CLEAR_DIRTY_RECTS);
        self.director.setSoundEffectsEnabled(true);


        self.audioManager = new (require('AudioManager').AudioManager)();
        self.audioManager.init(self);

        // create the inventory
        self._createInventory();

        // create dialog classes
        self._createStore();
        self.storeDialog.create();
        self.settingsDialog = new (require('SettingsDialog').SettingsDialog)();
        self.dailyRewards = new (require('DailyRewards').DailyRewards)();
        self.awardPopup = new (require('AwardPopup').AwardPopup)();
        self.genericDialog = new (require('GenericDialog').GenericDialog)();
        self._createTopBar();

        // load settings
        self.settingsDialog.loadSettings();

        // create game fsm
        var FSceneM =  require('FSceneM').FSceneM;
        self.fsm = new FSceneM(self.director);
        self.fsm.addState(self.GameStates.Splash, self.director.createScene(), function () { self.enterSplash(); }, null, null);
        self.fsm.addState(self.GameStates.Loading, self.director.getScene(0), function () { self.enterLoading(); }, null, null);
        self.fsm.addSceneState(self.GameStates.Intro, new (require('Intro').Intro)(self, self.director));
        self.fsm.addSceneState(self.GameStates.LoginPage, new (require('LoginPage').LoginPage)(self, self.director));
        self.fsm.addSceneState(self.GameStates.EmailLoginPage, new (require('EmailLoginPage').EmailLoginPage)(self, self.director));
        self.fsm.addSceneState(self.GameStates.EmailCreatePage, new (require('EmailCreatePage').EmailCreatePage)(self, self.director));
        self.fsm.addSceneState(self.GameStates.Main, new (require('ActiveGames').ActiveGames)(self, self.director));
        self.fsm.addSceneState(self.GameStates.CreateGame, new (require('CreateGame').CreateGame)(self, self.director));
        self.fsm.addSceneState(self.GameStates.CreateGameFacebook, new (require('CreateGameFacebook').CreateGameFacebook)(self, self.director));
        self.fsm.addSceneState(self.GameStates.CreateGameUsername, new (require('CreateGameUsername').CreateGameUsername)(self, self.director));
        self.fsm.addSceneState(self.GameStates.CreateGameEmail, new (require('CreateGameEmail').CreateGameEmail)(self, self.director));
        self.fsm.addSceneState(self.GameStates.AwardsScreen, new (require('AwardsScreen').AwardsScreen)(self, self.director));

        self._addGameStates();   // derived classes should add their own states here

        self.fsm.gotoState(self.GameStates.Splash);
//        self.fsm.gotoState(self.GameStates.Main);


        // start ticking
        self.director.onRenderStart = self._createTickFunc();
        CAAT.loop(120);
    },

    _createTickFunc:function () {
        var self = this;
        return function (deltaTime) {
            self.fsm.tick(deltaTime);
            self.audioManager.tick(deltaTime);

            if (self.loadingDialog)
                self.loadingDialog.tick(deltaTime);

            if (self.storeDialog)
                self.storeDialog.fsm.tick(deltaTime);
        }
    },

    ///////////////////////////////////////////////////////////////////////////
    // "pure virtualish" type functions... must be overridden

    _createClientConnection : function() {
        throw new Error("_createClientConnection function must be overridden");
    },

    _createInventory : function() {
        throw new Error("_createInventory function must be overridden");
    },

    _addGameStates : function() {
        throw new Error("_addGameStates function must be overridden");
    },

    gotoGame : function( gameId, errorCallback ) {
        throw new Error("gotoGame function must be overridden");
    },

    _createSplashManifest : function() {
        throw new Error("_createSplashManifest function must be overridden and have 'splash1' and 'splash2' items");
    },

    _createMainManifest : function() {
        throw new Error("_createMainManifest function must be overridden and have 'background', 'mainLayout' and 'subLayout' items");
    },

    _createStore : function() {
        throw new Error("_createStore function must be overridden");
    },

    _initStore : function() {
        throw new Error("_initStore function must be overridden with top level store skus");
    },

    //////////////////////

    _createTopBar : function() {
        // override if you want a subclassed TopBar
        var self = this;
        self.topBar = new (require('TopBar').TopBar)();
    },

    _createSplashAnim : function() {
        // override if you want a splash anim in the startup sequence
    },

    getName : function()
    {
        // override in each game
        return "com.funtini";
    },

    alterBackground : function()
    {
        // override if you need to add anything to the background canvas
    },

///////////////////////////////////////////////////////////////////////////
    // splash state

    enterSplash:function ()
    {
        var self = this;

        // create loaders
        g_loader = new (require('Loader').Loader)();
        g_layout = new (require('LayoutManager').LayoutManager)(self.director.nativeWidth, self.director.nativeHeight);
        require('LayoutManager').LayoutManager.DEFAULT_FONT = "32px PosterCopy";
        require('LayoutManager').LayoutManager.DEFAULT_LINESPACE_FACTOR = -0.25;

        var manifest = self._createSplashManifest();

        g_loader.init(self.director, manifest, self.onDevice, self._onSplashLoadFinished());
    },

    ///////////////////////////////////////////////////////////////////////////
    // loading state

    enterLoading:function ()
    {
        var self = this;

        // asset list
        var manifest = self._createMainManifest();

        // add any common lib assets to manifest
        self.fsm.addAllStatesToManifest(manifest);
        self.topBar.addToManifest(manifest);
        self.storeDialog.addToManifest(manifest);
        self.settingsDialog.addToManifest(manifest);
        self.dailyRewards.addToManifest(manifest);
        self.awardPopup.addToManifest(manifest);
        self.genericDialog.addToManifest(manifest);
        addGameWidgetResourcesToManifest(manifest);

        async.parallel([
                function loadManifest(cb)
                {
                    g_loader.doLoad(manifest, self.onDevice, cb);
                },

                function loadSkuData(cb)
                {
                    self.clientConnection.getInventorySkuData(function(err,result){
                        if (!err)
                            self.inventory.setSkuData(result);
                        cb(err,result);
                    });
                }
            ],
            function(err)
            {
                self._onLoadFinished();
            });
    },

    ///////////////////////////////////////////////////////////////////////////
    // Callbacks from states

    _onSplashLoadFinished:function ()
    {
        var self = this;
        return function()
        {
            var scene = self.director.getScene(0);

            self.splashPreload = new CAAT.ActorContainer().setSize(768,1024);
            scene.addChild(self.splashPreload);

            self.splashImage = new CAAT.Actor().setBackgroundImage(g_loader.getResult('splash1'), true);
            scene.addChild(self.splashImage);

            window.setTimeout(self._onHideDeviceSplash(), Game.SPLASH_CHECK_INCR);
        }
    },

    _onHideDeviceSplash:function()
    {
        var self = this;
        return function()
        {
            if (self.onDevice)
            {
                console.log("Hiding PhoneGap splash screen");
                cordova.exec(null, null, "SplashScreen", "hide", []);
            }

            window.setTimeout(self._onFirstSplashExpire(), Game.MINIMUM_SPLASH_TIME / (self.onDevice ? 2 : 1));
        }
    },

    _onFirstSplashExpire:function()
    {
        var self = this;
        return function()
        {
            self.splashImage.setBackgroundImage(g_loader.getResult('splash2'), true);
            self._createSplashAnim();
            window.setTimeout(self._onLoadTimerExpire(), Game.SPLASH_CHECK_INCR);
            self.fsm.gotoState(self.GameStates.Loading);
        }
    },

    _onLoadTimerExpire:function ()
    {
        var self = this;
        return function()
        {
            if (self.postLoading)
                return;

            self.splashTimerElapsed += Game.SPLASH_CHECK_INCR;

            if (self.loadComplete && self.splashTimerElapsed > Game.MINIMUM_SPLASH_TIME)
            {
                self._playSplashAnimation();
            }
            else
            {
                window.setTimeout(self._onLoadTimerExpire(), Game.SPLASH_CHECK_INCR);
            }
        }
    },

    _onLoadFinished:function ()
    {
        var self = this;
        console.log("Finished loading assets");

        if (self.postLoading)
            return;

        // HACK: render everything for one frame to force cache
        for (var i = 0; i < self.director.imagesCache.length; i++)
        {
            var actor = new CAAT.Actor().setBackgroundImage( self.director.imagesCache[i].image );
            self.splashPreload.addChild(actor);
        }
        var count = 1;
        self.splashPreload.paintActor = function(director, time)
        {
            if (count == 1)
            {
                CAAT.ActorContainer.prototype.paintActor.call(self.splashPreload, director, time);
                count -= 1;

                window.setTimeout( self._PreRenderFinished.bind(self), 1);
            }
        }
    },

    _PreRenderFinished : function()
    {
        var self = this;

        self.loadComplete = true;

        // clear out or forced prerender
        if (self.splashPreload)
        {
            self.splashPreload.destroy();
            self.splashPreload = null;
        }

        // play the animation if it is time
        if (self.splashTimerElapsed > Game.MINIMUM_SPLASH_TIME)
        {
            self._playSplashAnimation();
        }
    },

    _playSplashAnimation : function()
    {
        var self = this;

        if (self.splashAnim)
        {
            self.splashAnim.play();
            window.setTimeout(self._doDelayedPostLoad(), Game.SPLASH_ANIM_TIME);
        }
        else
        {
            self._doPostLoad();
        }
    },

    _doDelayedPostLoad : function()
    {
        var self = this;

        return function()
        {
            self._doPostLoad();
        }
    },

    _doPostLoad : function()
    {
        var self = this;

        self.postLoading = true;

        // clean up splash screens
        if (self.splashImage)
        {
            self.splashImage.destroy();
            self.splashImage = null;
        }
        if (self.splashAnim)
        {
            self.splashAnim.destroy();
            self.splashAnim = null;
        }

        var mainView = g_loader.getResult('mainLayout');
        g_layout.addView(mainView);
        g_layout.addView(g_loader.getResult('subLayout'));
        self.fsm.postLoadAllStates();
        self.storeDialog.postLoadAllStates();

        self.createBackground();
        self.startGame();
    },

    ///////////////////////////////////////////////////////////////////////////
    // Helper functions

    adjustDomElementLayout : function(element)
    {
        var self = this;
        var offset = element.offset();
        offset.right = offset.left + element.innerWidth();
        offset.bottom = offset.top + element.innerHeight();
        var scaled = self.adjustRectangleLayout(offset);
        var scaledSize = {x: scaled.right - scaled.left, y: scaled.bottom - scaled.top};
        element.offset({left: scaled.left, top: scaled.top});
        element.css('width', scaledSize.x);
        element.css('height', scaledSize.y);
        if (element.attr('width'))
            element.attr('width', scaledSize.x);
        if (element.attr('height'))
            element.attr('height', scaledSize.y);
    },
    adjustRectangleLayout: function(area)
    {
        var self = this;
        return {
            left: Math.round(area.left * self.globalScale.x) + self.globalOffset.x,
            top: Math.round(area.top * self.globalScale.y) + self.globalOffset.y,
            right: Math.round(area.right * self.globalScale.x) + self.globalOffset.x,
            bottom: Math.round(area.bottom * self.globalScale.y) + self.globalOffset.y
        };
    },
    adjustPointLayout: function(point)
    {
        var self = this;
        return {
            x: point.x * self.globalScale.x + self.globalOffset.x,
            y: point.y * self.globalScale.y + self.globalOffset.y
        };
    },
    adjustOffsetLayout: function(point)
    {
        var self = this;
        return {
            x: point.x * self.globalScale.x,
            y: point.y * self.globalScale.y
        };
    },

    // TODO: Rename appropriately
    createBackground: function()
    {
        var self = this;

        // NOTE: these director will need to abide by the scale applied to the main director
        self.background = new (require('GameDirector').GameDirector)();
        self.background.setClear(CAAT.Director.CLEAR_NONE);

        var w = Math.min(self.mainSize.x, self.director.nativeWidth);
        var h = self.director.nativeHeight;
        self.background.initialize(w, h, SnTCanvasHelper.attachToCanvas('#backgroundCanvas', w,h));
        self.background.setSoundEffectsEnabled(false);

        // build the bg
        self.background.bgScene = self.background.createScene();
        self.background.bgScene.addChild
            (
                new CAAT.Actor().
                        setBackgroundImage(g_loader.getResult('background'), true).
                        enableEvents(false)
            );
        self.alterBackground();
        self.background.setScene(0);
        self.background.renderFrame();
        self.background.stopped = true;

        // The VERY FIRST canvas that is created is our proxy for ALL input events, passed to our new director here

        // setup the top bar
        self.topBar.init(Math.min(self.mainSize.x, self.director.nativeWidth), 78, "main", "topBar", self); // height taken from top bar bg image

        // setup the store
        self._initStore();

        // setup the daily rewards dialog
        self.dailyRewards.init();

        // setup the daily rewards dialog
        self.awardPopup.init();

        // setup the settings dialog
        self.settingsDialog.init();

        // setup the generic dialog
        self.genericDialog.init(self.storeDialog);

        // create the facebook profile picture getter
        self.fbProfilePics = new (require('FBProfilePicGetter').FBProfilePicGetter)();
    },

    showGenericDialog: function(title,body,ok,cancel,callback)
    {
        var self = this;
        title = title||"";
        body = body||"";
        ok = ok||"";
        cancel = cancel||"";
        self.genericDialog.show(title, body, ok, cancel, callback);
    },

    showLoadingDialog: function(title)
    {
        var self = this;
        title = title || "";

        // lazy initialization of loading screen
        if (!self.loadingDialog)
        {
            self.loadingDialog = new (require('LoadingDialog').LoadingDialog)();
            self.loadingDialog.init(self.fullWidth, self.fullHeight, title);
        }
        else
        {
            self.loadingDialog.setText(title);
        }

        // turn on rendering / display
        self.loadingDialog.stopped = false;
        $('#loadingCanvas').show();
    },

    hideLoadingDialog: function()
    {
        var self = this;

        // turn off rendering / display
        if (self.loadingDialog)
            self.loadingDialog.stopped = true;
        $('#loadingCanvas').hide();
    },

    startGame : function()
    {
        var self = this;

        self.fsm.gotoState(self.GameStates.Intro);
    },

    onAwardUpdated : function(awardId)
    {
        var self = this;

        return function(err, awardInfo)
        {
            if (err)
            {
                console.log("Error updating award: " + awardId);
            }
            else if (awardInfo.awarded)
            {
                self.awardPopup.show(awardInfo.data, null);
            }
        }
    }
};

///////////////////////////////////////////////////////////////////////////////
// Hooks into the main game / Namespace
///////////////////////////////////////////////////////////////////////////////

// prevent dragging of content
document.addEventListener("touchmove", function(e){ e.preventDefault(); }, false);

// bootstrap functions for kicking of main initialization
function onBodyLoad()
{
    window.setTimeout(bootstrapGame,1);
}

function bootstrapGame()
{
    if (window.onPhoneGap === true)
    {
        // Wait for the device to finish initializing
        document.addEventListener("deviceready",
            function()
            {
                console.log("Launching game on device");

                if (navigator.network.connection.type === Connection.NONE ||
                    navigator.network.connection.type === Connection.UNKNOWN)
                {
                    alert("A network connection is required to play");
                    return;
                }

                g_game.init(true);
            },
            false);
    }
    else
    {
        // Kill the hacked PhoneGap Facebook SDK
        delete window.FB;
        
        // Called by FB after its script loads
        window.fbAsyncInit = function()
        {
            console.log("Launching game on desktop");
            g_game.init(false);
        };

        // Load the Real Facebook SDK
        (function(d){
            var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
            if (d.getElementById(id)) {return;}
            js = d.createElement('script'); js.id = id; js.async = true;
            js.src = "http://connect.facebook.net/en_US/all.js";
            ref.parentNode.insertBefore(js, ref);
        }(document));
    }
}

// global singletons
var g_layout;
var g_loader;
