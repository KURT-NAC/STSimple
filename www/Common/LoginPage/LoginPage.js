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
            if (typeof manifest.loginStarburst === 'undefined')
                manifest.loginStarburst = "Common/LoginPage/login_starburst.jpg";
            if (typeof manifest.loginButton === 'undefined')
                manifest.loginButton = "Common/LoginPage/login_button.png";
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

            //We are done with the splash screen assets
            //Remove them from the image cache
//            g_loader.deleteImage("splash1");
//            g_loader.deleteImage("splash2");

            //Check to see if we have cached credentials
            //If we do login immediately (no need to initiate the layout)
            if(window.localStorage.getItem(g_game.getName() +".email"))
            {
                self.owner.fsm.gotoState(self.owner.GameStates.EmailLoginPage);
                return;
            }

            g_layout.addAllElementsToObject(self.scene, "main", "login");
            g_layout.addAllElementsToObject(self.scene, "sub", "login");

            var buttons = g_layout.getActorFromArrayByID(self.scene.childrenList, "fancyButton", true);
            var callback = function(evt){ self._onFBLoginClick(evt); };
            buttons[0].setCallback(callback);
            callback = function(evt){ self._onEmailLoginClick(evt); };
            buttons[1].setCallback(callback);
        },

        _autoLogin:function()
        {

        },

        _createTitle : function()
        {
            var self = this;
            var img = g_loader.getResult('topDarkener');
            var title = new CAAT.ActorContainer().setSize(img.width, img.height);
            g_layout.addAllElementsToObject(title, 'main', 'login', 'title');
            return title;
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

        _onFBLoginClick : function(evt)
        {
            var self = this;
            self.owner.clientConnection.loginFacebook( function(err){self._onLoginCallback(err);} );
            // self.owner.clientConnection.loginFacebook( function(err){ self._doFTUPopup() } );
        },

        _doFTUPopup : function()
        {
            var self = this;

            var b1,b2,b3;

            //Load the background to determine the size of the container for the risk popup
            var bkgd = g_loader.getResult('background');

            //Create the pop up actor
            self.firstTimePopup = new CAAT.ActorContainer()
                                        .setSize(bkgd.width, bkgd.height);

            g_layout.addAllElementsToObject(self.firstTimePopup, "main", "firstTimePopup");
            var topCanvas=$('#topCanvas');
            topCanvas.hide();
//            b1 = g_layout.getActorFromArrayByID(self.firstTimePopup.childrenList, 'intro1', false);
//            b2 = g_layout.getActorFromArrayByID(self.firstTimePopup.childrenList, 'intro2', false);
//            b2.setVisible(false);
//            b3 = g_layout.getActorFromArrayByID(self.firstTimePopup.childrenList, 'intro3', false);
//            b3.setVisible(false);
//
//            b1.enableEvents(true).mouseClick=function() {
//                g_game.audioManager.playSound("buttonClick2");
//                b1.setVisible(false);
//                b2.setVisible(true);
//            };
//            b2.enableEvents(true).mouseClick=function() {
//                g_game.audioManager.playSound("buttonClick2");
//                b2.setVisible(false);
//                b3.setVisible(true);
//            };
//            b3.enableEvents(true).mouseClick=function() {
//                g_game.audioManager.playSound("buttonClick2");
//                var topCanvas=$('#topCanvas');
//                topCanvas.show();
//                self.owner.fsm.gotoState(self.owner.GameStates.Main);
//            };

            // self.firstTimePopup.visible = false;
            self.scene.addChild(self.firstTimePopup);


            //store setting in localStorage
            window.localStorage.setItem(g_game.getName() + ".ftpu", true);
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
                //FLURRY
                if(window.onPhoneGap)
                    flurry.logEvent("Login:facebook",null,null);

                //if the user has already seen the FTU popup just skip ahead
                var hasSeen = window.localStorage.getItem(g_game.getName() + ".ftpu");

                if( !hasSeen )              
                    self._doFTUPopup("Cali");
                else
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
