(function(exports){

    function PassTurn(owner,director)
    {
        this.init(owner,director);
    }

    PassTurn.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        exitState : null,

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

        addToManifest : function(manifest)
        {
            manifest.passMainLayout = "Common/PassTurn/passturn_main_view.json";
            manifest.passSubLayout = "Common/PassTurn/passturn_sub_view_ipad.json";
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'passTurn', g_loader.getResult('passMainLayout'));
            g_layout.mergePage('sub', 'passTurn', g_loader.getResult('passSubLayout'));
        },

        setExitState : function(state)
        {
            var self = this;
            self.exitState = state;
            return self;
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;
            self.enterPass();
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;

            CAAT.sceneCleanup(self.scene);
        },

        enterPass : function()
        {
            var self = this;

            self.owner.topBar.setStatus("Playing With\n%s");

            g_layout.addAllElementsToObject(self.scene, "main", "passTurn");
            g_layout.addAllElementsToObject(self.scene, "sub", "passTurn");

            var go = g_layout.getActorFromArrayByID(self.scene.childrenList, "navigationButton");
            go.setCallback(function() { self.owner.fsm.gotoState(self.exitState, { 'passed': true }); });
        }
    };

    exports.PassTurn = PassTurn;

})(typeof exports === 'undefined'? _modules['PassTurn']={} : exports);