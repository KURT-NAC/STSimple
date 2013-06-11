(function(exports){

    function ClipCritique(owner,director)
    {
        this.init(owner,director);
    }

    ClipCritique.PROFILE_MAX_SIZE = 200;

    ClipCritique.prototype =
    {
        ////////////////////
        // Constants
        States :
        {
            Critique : 'cq'
        },
        ////////////////////

        owner : null,
        director : null,
        scene : null,

        fsm: null,

        facebookPic : null,

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

            self.fsm = new (require('FSM').FSM)();
            self.fsm.addState(self.States.Critique,
                self._enter_Critique(),   // enter
                null,   // tick
                self._leave_Critique()    // leave
            );
        },

        postLoad : function()
        {
            var self = this;
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;
            self.fsm.gotoState(self.States.Critique);
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
            self.fsm.stop();
            // clear everything out
            self.scene.emptyChildren();
        },

        ///////////////////////////////////////////////////////////////////////////
        // Sub States

        ////////////////////
        // Roundup
        _enter_Critique: function()
        {
            var self = this;
            return function(prevState)
            {
                g_layout.addAllElementsToObject(self.scene, "main", "roundup");

                // set feedback
                var feedback = g_layout.getActorFromArrayByID(self.scene.childrenList, "feedbackObject", false);
                feedback.setup(self.director);

                // set coins
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

                // advance button
                g_layout.addAllElementsToObject(self.scene, "sub", "roundup");
                self.scene.childrenList[self.scene.childrenList.length-1].
                    enableEvents(true).
                    setCallback(
                    function(event)
                    {
                        self.owner.fsm.gotoState(self.owner.GameStates.Turn);
                    });
            }
        },

        _leave_Critique: function()
        {
            var self = this;
            return function(nextState)
            {
                for (var i = 0; i < self.scene.childrenList.length; i++)
                {
                    self.scene.childrenList[i].
                        setDiscardable(true).
                        setExpired().
                        setParent(null);
                }
                self.scene.emptyChildren();
            }
        }
    };

    exports.ClipCritique = ClipCritique;

})(typeof exports === 'undefined'? _modules['ClipCritique']={} : exports);