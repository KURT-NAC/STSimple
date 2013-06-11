(function(exports){

    var ErrorCode = require('ErrorCode').ErrorCode;

    function EmailCreatePage(owner,director)
    {
        this.init(owner,director);
        return this;
    }

    EmailCreatePage.prototype =
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
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'emailCreate', g_loader.getResult('loginMainLayout'));
            g_layout.mergePage('sub', 'emailCreate', g_loader.getResult('loginSubLayout'));

        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            // initialize layout
            g_layout.addAllElementsToObject(self.scene, 'main', 'emailCreate');
            g_layout.addAllElementsToObject(self.scene, 'sub', 'emailCreate');

            // username
            self.userName = g_layout.getActorFromArrayByID(self.scene.childrenList,"name");
            self.userName.setup("Username");

            // email
            self.email = g_layout.getActorFromArrayByID(self.scene.childrenList,"email");
            self.email.setup("Email");

            // password 1
            self.passwd1 = g_layout.getActorFromArrayByID(self.scene.childrenList,"passwd1");
            self.passwd1.setup("Password", null, null, null, "password");

            // password 2
            self.passwd2 = g_layout.getActorFromArrayByID(self.scene.childrenList,"passwd2");
            self.passwd2.setup("Password", null, null, null, "password");

            // create button
            var create = g_layout.getActorFromArrayByID(self.scene.childrenList,"createBtn");
            create.enableEvents(true).mouseClick = self._onCreateClick();

            // back button
            var back = g_layout.getActorFromArrayByID(self.scene.childrenList,"back");
            back.enableEvents(true).mouseClick = self._onBackClick();

            // terms link
            var termsLink = g_layout.getActorFromArrayByID(self.scene.childrenList, "termsLink");
            termsLink.setText("Terms of service");
            g_layout.createExtLink(self.scene, termsLink, "http://s3.amazonaws.com/improv_config/terms-privacy/terms.html", false);

            // policy link
            var policyLink = g_layout.getActorFromArrayByID(self.scene.childrenList, "policyLink");
            policyLink.setText("Privacy Policy");
            g_layout.createExtLink(self.scene, policyLink, "http://s3.amazonaws.com/improv_config/terms-privacy/privacy.html", false);

            self._createFirstTimePopup();
        },

        leave : function(nextStateName)
        {
            var self = this;
            CAAT.sceneCleanup(self.scene);
            self.userName = null
            self.email = null;
            self.passwd1 = null;
            self.passwd2 = null;
        },

        _onCreateClick : function()
        {
            var self = this;
            return function()
            {
                var user = self.userName.userTxt.toLowerCase();
                var email = self.email.userTxt.toLowerCase();
                var passwd1 = self.passwd1.userTxt;
                var passwd2 = self.passwd2.userTxt;
                var error;

                error = self._validateUserName(user);
                if (error)
                {
                    self.owner.showGenericDialog("Invalid Username",error,"Ok");
                    return;
                }

                error = self._validateEmail(email);
                if (error)
                {
                    self.owner.showGenericDialog("Invalid Email",error,"Ok");
                    return;
                }

                error = self._validatePassword(passwd1,passwd2);
                if (error)
                {
                    self.owner.showGenericDialog("Invalid Password",error,"Ok");
                    return;
                }

                $('input').blur();
                self.owner.showLoadingDialog("Logging in...");
                self.owner.clientConnection.createEmail(email,passwd1,user,self._onCreateResult());
            }
        },

        _onCreateResult : function()
        {
            var self = this;
            return function(err)
            {
                if (!err)
                {
                    var email = self.email.userTxt.toLowerCase();
                    var passwd1 = self.passwd1.userTxt;

                    //store the users email and password
                    window.localStorage.setItem(g_game.getName() +".email",email);
                    window.localStorage.setItem(g_game.getName() +".passwd",passwd1);

                    self.owner.clientConnection.loginEmail(email,passwd1,self._onLoginResult());
                }
                else
                {
                    self.owner.hideLoadingDialog();

                    if (err.code == ErrorCode.ACCOUNT_ALREADY_EXISTS.code)
                    {
                        self.owner.showGenericDialog("Create Failed","Account already exists", "OK");
                    }
                    else if (err.code == ErrorCode.NICKNAME_ALREADY_EXISTS.code)
                    {
                        self.owner.showGenericDialog("Create Failed","Username already exists", "OK");
                    }
                    else
                    {
                        self.owner.showGenericDialog("Create Failed","Unknown error", "OK");
                    }
                }
            }
        },

        _onLoginResult : function()
        {
            var self = this;
            return function(err)
            {
                self.owner.hideLoadingDialog();

                if (!err)
                {
                    self._showFirstTime();
                }
                else
                {
                    console.log(JSON.stringify(err));
                    console.log(err);
                    self.owner.showGenericDialog("Login Failed","Unknown error", "OK");
                    self.owner.fsm.gotoState(self.owner.GameStates.EmailLoginPage);
                }
            }
        },

        _onBackClick : function()
        {
            var self = this;
            return function()
            {
                self.owner.fsm.gotoState(self.owner.GameStates.EmailLoginPage);
            }
        },

        _onPopClick : function()
        {
            var self = this;
            return function()
            {
                self.owner.fsm.gotoState(self.owner.GameStates.Main);
            }
        },

        _validateUserName : function(name)
        {
            if (!name || name.length < 3)
                return "Username must be at least 3 letters";

            var re = /[^a-zA-Z0-9]/;
            if( re.test( name ) )
                return "Username can only contain a-z or a number";

            return null;
        },

        // http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
        _validateEmail : function(email)
        {
            if (!email || email.length < 6)
                return "Please enter a valid email address";

            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if (!re.test(email))
                return "Please enter a valid email address";

            return null;
        },

        _validatePassword : function(passwd1,passwd2)
        {
            if (!passwd1)
                return "Please enter a password";

            if (passwd1 !== passwd2)
                return "Passwords must match";
        },

        _createFirstTimePopup: function()
        {
            var self = this;
            var b1,b2,b3;

            //Load the background to determine the size of the container for the risk popup
            var bkgd = g_loader.getResult('background');

            //Create the pop up actor
            self.firstTimePopup = new CAAT.ActorContainer()
                                        .setSize(bkgd.width, bkgd.height);

            g_layout.addAllElementsToObject(self.firstTimePopup, "main", "firstTimePopup");

            b1 = g_layout.getActorFromArrayByID(self.firstTimePopup.childrenList, 'intro1', false);
            b2 = g_layout.getActorFromArrayByID(self.firstTimePopup.childrenList, 'intro2', false);
            b2.setVisible(false);
            b3 = g_layout.getActorFromArrayByID(self.firstTimePopup.childrenList, 'intro3', false);
            b3.setVisible(false);

            b1.enableEvents(true).mouseClick=function() {
                g_game.audioManager.playSound("buttonClick2");
                b1.setVisible(false);
                b2.setVisible(true);
            };
            b2.enableEvents(true).mouseClick=function() {
                g_game.audioManager.playSound("buttonClick2");
                b2.setVisible(false);
                b3.setVisible(true);
            };
            b3.enableEvents(true).mouseClick=function() {
                g_game.audioManager.playSound("buttonClick2");
                var topCanvas=$('#topCanvas');
                topCanvas.show();
                self.owner.fsm.gotoState(self.owner.GameStates.Main);
            };

            self.firstTimePopup.visible = false;
            self.scene.addChild(self.firstTimePopup);
        },

        _showFirstTime: function()
        {
            var self=this;
            self.firstTimePopup.visible = true;
            var topCanvas=$('#topCanvas');
            topCanvas.hide();

            //fields outside of canvas
            $('#mainCanvasHolder > div').toggle();
        }
    }

    exports.EmailCreatePage = EmailCreatePage;

})(typeof exports === 'undefined'? _modules['EmailCreatePage']={} : exports);