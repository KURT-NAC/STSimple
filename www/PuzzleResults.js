(function(exports){

    function PuzzleResults(owner,director)
    {
        this.init(owner,director);
    }

    PuzzleResults.prototype =
    {

        owner : null,
        director : null,
        scene : null,
        commentBar : null,

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

            g_layout.addAllElementsToObject(self.scene, "main", "correctGuess");
            g_layout.addAllElementsToObject(self.scene, "sub", "correctGuess");

            // set number of coins
            var coins = g_layout.getActorFromArrayByID(self.scene.childrenList, "largeCoin", true);
            var difficulty = 3; // TODO: get difficulty from game state
            if (difficulty === 0)// 1 coin
            {
                coins[0].setDiscardable(true).
                    setExpired().
                    setParent(null);
                coins[2].setDiscardable(true).
                    setExpired().
                    setParent(null);
                self.scene.removeChild(coins[0]);
                self.scene.removeChild(coins[2]);
            }
            else if (difficulty === 1)// 2 coins
            {
                coins[1].setDiscardable(true).
                    setExpired().
                    setParent(null);
                self.scene.removeChild(coins[1]);

                var dist = (coins[1].x-coins[0].x)/2;
                coins[0].setPosition(coins[0].x+dist, coins[0].y);
                coins[2].setPosition(coins[2].x-dist, coins[2].y);
            }

            // award coins
            self.owner.inventory.addMoney(difficulty + 1);

            // comment input
            self.commentBar = g_layout.getActorFromArrayByID(self.scene.childrenList, "textFieldObject");
            self.commentBar.setup("Tap to add a comment");

            // capture go button
            var target = g_layout.getElementInPage("sub", "correctGuess", "goBtn").text;
            var go = g_layout.getActorFromArrayByID(self.scene.childrenList, "navigationButton");
            go.enableEvents(true);
            go.mouseClick = function() { self._done(); }
        },

        _done: function()
        {
            var self = this;

            // submit turn
            self.owner.clientConnection.turnGame(
                {
                    'solved' : true,
                    'rating' : 1,
                    'note' : self.commentBar.userTxt
                },
                function(err)
                {
                    if (!err)
                    {
                        self.owner.fsm.gotoState(self.owner.GameStates.Turn);
                    }
                    else
                    {
                        self.owner.showGenericDialog("Error", err.message, "OK");
                    }
                });
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
            self.commentBar.cleanup();
            self.commentBar = null;
            CAAT.sceneCleanup(self.scene);
        }
    };

    exports.PuzzleResults = PuzzleResults;

})(typeof exports === 'undefined'? _modules['PuzzleResults']={} : exports);