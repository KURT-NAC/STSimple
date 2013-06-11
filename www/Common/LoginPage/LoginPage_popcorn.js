(function(exports){

    function LoginPage(owner,director)
    {
        this.init(owner,director);
        return this;
    }

    LoginPage.prototype =
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
                    (!owner ? " Owner" : "") +
                    (!director ? " Director" : ""), self);
            }

            self.owner = owner;
            self.director = director;
            self.scene = scene||(director === null ? null : director.createScene());
            if (!self.scene)
                throw new Error("Scene state created with NULL scene", self);
        },

        addToManifest : function(manifest)
        {
            manifest.loginMainLayout = "Common/LoginPage/loginpage_main_view.json";
            manifest.loginSubLayout = "Common/LoginPage/loginpage_sub_view_" + g_game.platform + ".json";
			
		
            if (typeof manifest.bigEmail === 'undefined')
                manifest.bigEmail = "Common/SharedAssets/pg2_emailbutton.png";
            if (typeof manifest.bigFacebook === 'undefined')
                manifest.bigFacebook = "Common/SharedAssets/pg2_facebookbutton.png";
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'login', g_loader.getResult('loginMainLayout'));
            g_layout.mergePage('sub', 'login', g_loader.getResult('loginSubLayout'));
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            // initialize layout
            g_layout.setActive('main','login');

            self.popcorngame = new (require('PopcornGame').PopcornGame)(self.owner,self.director,self.scene);
			
			// footer
            var footer = new CAAT.Actor();
            footer.setBackgroundImage(g_loader.getResult('footer'), true);
            var element = g_layout.getElementInPage('sub', 'login', 'footer');
            g_layout.applyElementToCAATActor(element, footer, true, true);
            self.scene.addChild(footer);
        },

        tick : function(deltaTime)
        {
            var self = this;
            self.popcorngame.tick(deltaTime);
        },
            leave : function(targetStateName)
        {
            var self = this;
            CAAT.sceneCleanup(self.scene);
        },

		
        _onFBLoginClick : function(evt)
        {
            var self = this;
            self.owner.clientConnection.loginFacebook( function(err){self._onLoginCallback(err);} );
        },

        _onEmailLoginClick : function(evt)
        {
            var self = this;
            self.owner.fsm.gotoState(self.owner.GameStates.EmailLoginPage);
        },

        _onLoginCallback : function(err)
        {
            var self = this;
            if (!err)
            {
                self.owner.fsm.gotoState(self.owner.GameStates.Main);
            }
            else
            {
                self.owner.showGenericDialog("Login Failed",err.message,"OK");
            }
        }

    };

    exports.LoginPage = LoginPage;

})(typeof exports === 'undefined'? _modules['LoginPage']={} : exports);
