(function(exports){

    function SlidePuzzle(owner,director)
    {
        this.init(owner,director);
    }

    SlidePuzzle.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        puzzleImage : null,
        categorySku : null,
        fromStore : false,

        init : function(owner, director, scene)
        {
            var self = this;

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

        postLoad : function()
        {
            var self = this;
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            if (typeof stateData === 'undefined')
                throw new Error("Sku not passed to slide puzzle");

            self.fromStore = (typeof stateData !== 'undefined') && stateData.fromStore === true;
            self.categorySku = stateData.sku;
            self._enterSlidePuzzle();
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;

            // clear everything out
            for (var i = 0; i < self.scene.childrenList.length; i++)
            {
                self.scene.childrenList[i].
                    setDiscardable(true).
                    setExpired().
                    setParent(null);
            }

            self.scene.emptyChildren();
        },

        ///////////////////////////////////////////////////////////////////////////
        // Sub States

        ////////////////////
        // Roundup
        _enterSlidePuzzle: function()
        {
            var self = this;

            self.puzzleImage = new CAAT.Actor();
            var element = g_layout.getElementInPage('main', 'slidePuzzle', 'bg');
            self.puzzleImage.setBackgroundImage(g_loader.getResult(element.id), true);
            g_layout.applyElementToCAATActor(element, self.puzzleImage, true, true);
            self.puzzleImage.mouseClick = function() { self._onSolvePuzzle(); }
            self.scene.addChild(self.puzzleImage);
        },

        _onSolvePuzzle: function()
        {
            var self = this;

            self.puzzleImage.setBackgroundImage(g_loader.getResult('slideBkgd2'), true);

            g_game.showLoadingDialog("Unlocking");
            g_game.clientConnection.unlockInventory(self.categorySku.id, self._onUnlockResponse());
        },

        _onUnlockResponse : function()
        {
            var self = this;
            return function(err,response)
            {
                g_game.hideLoadingDialog();

                if (err)
                {
                    g_game.showGenericDialog("Sorry!", "Unable to unlock\ncategory at this time.", "Ok", null, null);
                }
                else
                {
                    g_game.inventory.setUserInventory(g_game.clientConnection.userInventory);
                }

                var footer = new CAAT.Actor();
                footer.setBackgroundImage(g_loader.getResult('footer'), true);
                var element = g_layout.getElementInPage('sub', 'slidePuzzle', 'footer');
                g_layout.applyElementToCAATActor(element, footer, true, true);
                self.scene.addChild(footer);

                var callback;
                if (self.fromStore)
                    callback = function(evt) { g_game.storeDialog.fsm.gotoState(g_game.storeDialog.StoreStates.StockPhotos, { "fromStore":true }); }
                else
                    callback = function(evt) { g_game.fsm.gotoState(g_game.GameStates.StockPhotos, { "fromStore":false }); }

                var element = g_layout.getElementInPage('sub', 'slidePuzzle', 'backBtn');
                var button = g_layout.createNavigationButton(element, callback);
                self.scene.addChild(button);
            }
        }
    };

    exports.SlidePuzzle = SlidePuzzle;

})(typeof exports === 'undefined'? _modules['SlidePuzzle']={} : exports);