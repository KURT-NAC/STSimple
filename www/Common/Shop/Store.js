(function(exports){

    function Store()
    {
        Store.superclass.constructor.call(this);
    }

    Store.MONEY_NAME = "Cashanova";

    Store.prototype =
    {
        div: null,
        owner : null,
        scene : null,
        prevDirector: null,
        callback: null,
        scrollView: null,
        frontEndSkus: null,

        active : false,

        fsm : null,

        StoreStates :
        {
            Shop            : 'shop'
        },

        /////////////////////

        create : function()
        {
            var self = this;

            var FSceneM =  require('FSceneM').FSceneM;
            self.fsm = new FSceneM(self);
            self.fsm.addSceneState(self.StoreStates.Shop, new (require('Shop').Shop)(self, self));
            self._addStoreStates();   // derived classes should add their own states here
        },

        init : function(owner, arSkuNames)
        {
            var self = this;

            self.owner = owner;

            self.frontEndSkus = arSkuNames;
            g_game.inventory.initItemCounts(arSkuNames);

            var element = g_layout.getUniversalElementInView('sub', 'shop');
            var totalWidth = element.x + element.width;
            var totalHeight = element.y + element.height;
            self.initialize(0, 0, SnTCanvasHelper.attachToCanvas('#storeCanvas',totalWidth,totalHeight));
            self.setSoundEffectsEnabled(false);

            self.div = $("#storeCanvas");
            //self.div.css('z-index', 500);
            self.div.css('position', 'relative');
            self.div.css('left', parseFloat(self.div.css('left')) - element.x);
            self.div.css('top', parseFloat(self.div.css('top')) - element.y);
            self.hide();

            // Adjust position of the canvas holder
            var holder = self.div.parent();
            var top = holder.offset().top;
            holder.css('top', top * g_game.globalScale.y);
        },

        addToManifest : function(manifest)
        {
            var self = this;
            self.fsm.addAllStatesToManifest(manifest);
        },

        postLoadAllStates : function()
        {
            var self = this;
            self.fsm.postLoadAllStates();
        },

        show : function(prevDirector, callback)
        {
            var self = this;

            self.active = true;

            //self.scene.setPaused(false);
            self.stopped = false;

            self.prevDirector = prevDirector||null;
            self.callback = callback||null;

            if (self.prevDirector)
                self.prevDirector.stopped = true;

            // NOTE: this timer fixes a bug where when the dialog shows itself it renders a garbage layout for a few seconds
            //          moving to using director.stopped instead of just scene.paused alleviated this partially and this timer
            //          seems to be the final touch
            /*self.timer = self.scene.createTimer(self.scene.time, 100,
                function(sceneTime, timerTaskTime, timerTask)
                {
                    self.div.show();
                    self.timer = null;
                },
                null,null);*/

            self.div.show();

            self.fsm.gotoState(self.StoreStates.Shop, self.frontEndSkus);
        },

        hide : function()
        {
            var self = this;

            self.active = false;

            if (self.prevDirector)
                self.prevDirector.stopped = false;

            //self.scene.setPaused(true);
            self.stopped = true;

            self.div.hide();

            if (self.callback)
                self.callback();
        },

        ///////////////////////////////////////////////////////////////////////////
        // "pure virtualish" type functions... must be overridden

        _addStoreStates : function() {
            throw new Error("addStoreStates function must be overridden");
        },

        onNoPackagesClicked : function(button) {
            console.log("onNoPackagesClicked should be overridden if you want to use it")
        },

        getIAPPrefixName : function() {
            console.log("onNoPackagesClicked must be overridden");
            return "";
        }
    };

    extend(Store, require('GameDirector').GameDirector);
    exports.Store = Store;

})(typeof exports === 'undefined'? _modules['Store']={} : exports);
