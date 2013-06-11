function Game()
{
}

Game.prototype =
{
    canvas:null,
    director:null,

    fsm:null,

    loader:null,
    initialized:false,

    onDevice : false,

    init:function (onDevice) {
        CAAT.TOUCH_BEHAVIOR = CAAT.TOUCH_AS_MOUSE;

        // flag that init has been called
        this.initialized = true;

        // capture this pointer
        var self = this;
        self.onDevice = onDevice;

        // Full the screen
        //NOTE: use window.innerWidth/Height when running on device.
        //TODO: find a better way to detect running on device to implement above NOTE:
        var width = 768;//window.innerWidth;
        var height = 1024;//window.innerHeight;

        // create canvas and director
        self.canvas = document.createElement('canvas');
        self.canvas.width = width;
        self.canvas.height = height;
        document.body.appendChild(self.canvas);

        self.director = new CAAT.Director().
            initialize(width, height, self.canvas).
            setClear(CAAT.Director.CLEAR_DIRTY_RECTS)// prevents the director from clearing the background, our scene will do that
        self.director.setSoundEffectsEnabled(true);

        // create loader
        g_loader = new (require('Loader').Loader)();

        // create game fsm
        self.fsm = new (require('FSceneM').FSceneM)(self.director);

        self.fsm.addState('loading', self.director.createScene(),
            function () {
                that.enterLoading();
            },
            null,
            null);
        self.fsm.addSceneState('test', new (require('ScrollScene').ScrollScene)(this, self.director.createScene()));

        self.fsm.gotoState('loading');

        // start ticking
        self.director.onRenderStart = self._tick();
        CAAT.loop(30);
    },

    _tick:function () {
        var self = this;
        return function (deltaTime) {
            self.fsm.tick(deltaTime);
        }
    },

    ///////////////////////////////////////////////////////////////////////////
    // loading state

    enterLoading:function () {
        var self = this;

        // load required assets
        var manifest = [
            {id:"button",   url:"assets/button_bg.png"}

            {id:"sound",   url:"assets/beep.mp3"}
        ];

        // start the loading process
        g_loader.init(self.director, manifest, self.onDevice,
            function () {
                self.onLoadFinished();
            });
    },
    ///////////////////////////////////////////////////////////////////////////
    // Callbacks from states

    onLoadFinished:function () {
        var self = this;

        self.fsm.loadAllStates(g_loader);
        self.fsm.gotoState('sample');
        self.fsm.removeState('loading');
    },

    ///////////////////////////////////////////////////////////////////////////
    // Helper functions
    playSound : function(id)
    {
        var self = this;
        if (self.onDevice)
            g_loader.getResult(id).play();
        else
            self.lDirector.playSound(id);
    }

};


///////////////////////////////////////////////////////////////////////////////
// Hooks into the main game / Namespace
///////////////////////////////////////////////////////////////////////////////
var game = new Game();

// prevent dragging of content
document.addEventListener("touchmove", function(e){ e.preventDefault(); }, false);

// bootstrap functions for kicking of main initialization
function onBodyLoad()
{
    if (!window.cordova)
        console.log('Cordova was not loaded');
    else
    {   // Wait for the device to initalize
        document.addEventListener("deviceready",
            function()
            {
                console.log("Launching game on device");
                game.init(true);
            },
            false);

        // Fallback to "desktop" mode if the above fails
        window.setTimeout(
            function()
            {
                if (!game.initialized)
                {
                    console.log("Launching game on desktop");
                    game.init(false);
                    //TODO: may be prudent to remove the deviceready event listener here
                }
            }, 125);

    }

    /*if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/))
     {
     document.addEventListener("deviceready", function(){ game.init(); }, false);
     } else {
     game.init();
     }*/
}