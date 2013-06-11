(function(exports){

    function EmailLoginPage(owner,director)
    {
        this.init(owner,director);
        return this;
    }

    EmailLoginPage.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        nameField : null,
        passwordField : null,
        email : null,
        passwd : null,

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
            g_layout.mergePage('main', 'emailLogin', g_loader.getResult('loginMainLayout'));
            g_layout.mergePage('sub', 'emailLogin', g_loader.getResult('loginSubLayout'));
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;


            //Check to see if we have cached credentials
            //If we do login immediately (no need to initiate the layout)
            if(window.localStorage.getItem(g_game.getName() +".email"))
            {
                console.log("Cached email account credentials found");
                self.email=window.localStorage.getItem(g_game.getName() +".email");
                self.passwd=window.localStorage.getItem(g_game.getName() +".passwd");
                self._autoLogin();
                return;
            }

            // initialize layout
            g_layout.addAllElementsToObject(self.scene, 'main', 'emailLogin');
            g_layout.addAllElementsToObject(self.scene, 'sub', 'emailLogin');

            // username field
            self.nameField = g_layout.getActorFromArrayByID(self.scene.childrenList,"name");
            if(!window.localStorage.getItem(g_game.getName() +".email"))
                self.nameField.setup("Email",null,null,null,"email");
            else
            {
                self.email=window.localStorage.getItem(g_game.getName() +".email");
                self.nameField.setup(self.email);
                self.nameField.userTxt=self.email;
            }

            // password field
            self.passwordField = g_layout.getActorFromArrayByID(self.scene.childrenList,"passwd");
            if(!window.localStorage.getItem(g_game.getName() +".passwd"))
                self.passwordField.setup('Password',null,null,null,"password");
            else
            {
                self.passwd=window.localStorage.getItem(g_game.getName() +".passwd");
                var passwordMask="";
                for(var i=0;i<self.passwd.length;i++)
                    passwordMask+= '&#149';
                self.passwordField.setup(passwordMask);
                self.passwordField.userTxt=self.passwd;
            }

            // login button
            var login = g_layout.getActorFromArrayByID(self.scene.childrenList,"loginBtn");
            login.enableEvents(true).mouseClick = self._onLoginClick();

            // create button
            var create = g_layout.getActorFromArrayByID(self.scene.childrenList,"createBtn");
            create.enableEvents(true).mouseClick = self._onCreateClick();

            // reset passwd
            var create = g_layout.getActorFromArrayByID(self.scene.childrenList,"resetPasswdBtn");
            create.enableEvents(true).mouseClick = self._onResetClick();

            // back button
            var back = g_layout.getActorFromArrayByID(self.scene.childrenList,"back");
            back.enableEvents(true).mouseClick = self._onBackClick();
        },

        leave : function(nextStateName)
        {
            var self = this;
            self.owner.hideLoadingDialog();
            CAAT.sceneCleanup(self.scene);
            self.nameField = null;
            self.passwordField = null;
        },

        _onBackClick : function()
        {
            var self = this;
            return function()
            {
                self.owner.fsm.gotoState(self.owner.GameStates.LoginPage);
            }
        },

        _onLoginClick : function()
        {
            var self = this;
            return function()
            {
                self.email = self.nameField.userTxt.toLowerCase();
                self.passwd = self.passwordField.userTxt;

                if (!self.email || self.email.length <= 3 || !self._validateEmail(self.email))
                {
                    self.owner.showGenericDialog("Invalid Email","Please enter a valid email address","Ok");
                    return;
                }
                if (!self.passwd)
                {
                    self.owner.showGenericDialog("Invalid Password","Please enter a password","Ok");
                    return;
                }

                self.owner.showLoadingDialog("Logging in...");
                self.owner.clientConnection.loginEmail(self.email,self.passwd,self._onLoginResult());
            }
        },

        _autoLogin : function()
        {
            var self = this;
            self.owner.showLoadingDialog("Logging in...");
            self.owner.clientConnection.loginEmail(self.email,self.passwd,self._onLoginResult());
        },

        _onCreateClick : function()
        {
            var self = this;
            return function()
            {
                self.owner.fsm.gotoState(self.owner.GameStates.EmailCreatePage);
            }
        },

        _onResetClick : function()
        {
            var self = this;
            return function() {
                self.owner.fsm.gotoState(self.owner.GameStates.EmailPasswdResetPage);
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
                    //Login success store the users email and password
                    window.localStorage.setItem(g_game.getName() +".email",self.email);
                    window.localStorage.setItem(g_game.getName() +".passwd",self.passwd);

                    //FLURRY
                    if(window.onPhoneGap)
                        flurry.logEvent("Login:email",null,null);

                    //Transition to the next state
                    self.owner.fsm.gotoState(self.owner.GameStates.Main);
                }
                else
                {
                    //SInce the credtials didnt work clear them out
                    window.localStorage.removeItem(g_game.getName() +".email");
                    window.localStorage.removeItem(g_game.getName() +".passwd");
                    self.owner.showGenericDialog("Login Failed","Email and password did not match", "OK");
                }
            }
        },

        // http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
        _validateEmail : function(email)
        {
            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(email);
        }
    }

    exports.EmailLoginPage = EmailLoginPage;

})(typeof exports === 'undefined'? _modules['EmailLoginPage']={} : exports);