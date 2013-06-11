(function(exports){

    function Intro(owner,director)
    {
        this.init(owner,director);
        return this;
    }

    Intro.prototype =
    {
        owner : null,
        director : null,
        scene : null,

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
            self.owner.topBar.setStatus("");

            console.log("Starting music");
            g_game.audioManager.playSound('music', true);
        },

        tick : function(deltaTime)
        {
            var self = this;

            // poll connection status
            if (!self.owner.clientConnection.isAuthenticationPending())
            {
                if (self.owner.clientConnection.isAuthenticated())
                    self.owner.fsm.gotoState(self.owner.GameStates.Main);
                else
                    self.owner.fsm.gotoState(self.owner.GameStates.LoginPage);
            }
        },

        leave : function(targetStateName)
        {
            var self = this;
        }
    };

    exports.Intro = Intro;

})(typeof exports === 'undefined'? _modules['Intro']={} : exports);