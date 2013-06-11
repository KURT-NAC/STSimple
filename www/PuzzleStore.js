(function(exports){

    function PuzzleStore()
    {
        PuzzleStore.superclass.constructor.call(this);
        return this;
    }

    PuzzleStore.prototype =
    {
        // StoreState Names
        AddedStoreStates :
        {
            StockPhotos      : 'stock',
            SlidePuzzle      : 'slide',
            ChooseStock      : 'choose'
        },

        _addStoreStates : function()
        {
            var self = this;

            // merge constants
            $.extend(true, self.StoreStates, self.AddedStoreStates);

            self.fsm.addSceneState(self.StoreStates.StockPhotos, new (require('StockPhotos').StockPhotos)(g_game, self));
            self.fsm.addSceneState(self.StoreStates.SlidePuzzle, new (require('SlidePuzzle').SlidePuzzle)(g_game, self));
            self.fsm.addSceneState(self.StoreStates.ChooseStock, new (require('ChooseStock').ChooseStock)(g_game, self));

            return self;
        },

        onNoPackagesClicked : function(button)
        {
            var self = this;
            self.fsm.gotoState(self.StoreStates.StockPhotos, { "fromStore":true });
        },

        getIAPPrefixName : function() {
            return "JigsawTestApp_";
        }
    };

    extend(PuzzleStore, require('Store').Store);
    exports.PuzzleStore = PuzzleStore;

})(typeof exports === 'undefined'? _modules['PuzzleStore']={} : exports);
