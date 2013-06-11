(function(exports){

    var ErrorCode = require('ErrorCode').ErrorCode;

    function EmailPasswdResetPage(owner, director)
    {
        this.init(owner, director);
        return this;
    }

    EmailPasswdResetPage.prototype =
    {
        owner:null,
        director:null,
        scene:null,

        init:function (owner, director, scene) {
            var self = this;

            if (owner === null || director === null) {
                throw new Error("Scene initiated with NULL" +
                    (!owner ? " Owner" : "") +
                    (!director ? " Director" : ""), self);
            }

            self.owner = owner;
            self.director = director;
            self.scene = scene || (director === null ? null : director.createScene());
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
            g_layout.mergePage('main', 'emailPasswdReset', g_loader.getResult('loginMainLayout'));
            g_layout.mergePage('sub', 'emailPasswdReset', g_loader.getResult('loginSubLayout'));
        },

        enter:function () {
            var self = this;

            // initialize layout
            g_layout.addAllElementsToObject(self.scene, 'main', 'emailPasswdReset');
            g_layout.addAllElementsToObject(self.scene, 'sub', 'emailLogin');

            // username field
            self.emailField = g_layout.getActorFromArrayByID(self.scene.childrenList,"email");
            self.emailField.setup("Email");

            // submit button
            var submit = g_layout.getActorFromArrayByID(self.scene.childrenList,"submitBtn");
            submit.enableEvents(true).mouseClick = self._onSubmitClick();

            //back button
            var back = g_layout.getActorFromArrayByID(self.scene.childrenList,"back");
            back.enableEvents(true).mouseClick = self._onBackClick();

        },

        leave:function () {
            var self = this;
            self.owner.hideLoadingDialog();
            CAAT.sceneCleanup(self.scene);
        },

        _onBackClick : function()
        {
            var self = this;
            return function()
            {
                self.owner.fsm.gotoState(self.owner.GameStates.EmailLoginPage);
            }
        },

        _onSubmitClick : function()
        {
            var self = this;
            return function()
            {
                var email = self.emailField.userTxt.toLowerCase();

                if(!email || email.length <= 3 || !self._validateEmail(email))
                {
                    self.owner.showGenericDialog(
                        "Invalid Email", 
                        "Please enter a valid email address", 
                        "Ok"
                    );
                    return;
                }
                self.owner.clientConnection.resetPassword(
                    email, 
                    self._generateOnResetResponseCallback() 
                );
            }
        },

        _generateOnResetResponseCallback : function()
        {
            var self = this
              , fsm  = self.owner.fsm;

            function showDialog(title, message, useYesNo, callback) {
                self.owner.showGenericDialog(
                    title,
                    message,
                    useYesNo ? "Yes" : "Ok",
                    useYesNo ? "No"  : null,
                    callback 
                        ? callback 
                        : function() { fsm.gotoState(self.owner.GameStates.LoginPage); }
                );
            }

            return function(response)
            {
                if (response.code === ErrorCode.OK.code)
                {
                    showDialog(
                        "Success",
                        "Please check your email\nto reset your password"
                    );
                }
                else if (response.code === ErrorCode.NOT_FOUND.code)
                {
                    showDialog(
                        "Invalid Email",
                        "Sorry, we didn't find your email \nin our system. Try Again?",
                        true,
                        function(clickResult) {
                            if (!clickResult) {
                                fsm.gotoState(self.owner.GameStates.LoginPage);
                            }
                        }
                    );
                }
                else if (response.code === ErrorCode.RATE_LIMIT.code)
                {
                    showDialog(
                        "Too Soon",
                        "Sorry, you requested a password reset" +
                        "\ntoo recently. If you meant to do this," +
                        "\ntry again in a few minutes."
                    );
                }
                else 
                {
                    showDialog(
                        "Error",
                        "Sorry, an unknown error occurred." +
                        "\nPlease try again in a few minutes."
                    );
                }
            }
        },

        // http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
        _validateEmail : function(email)
        {
            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(email);
        }

    };

    exports.EmailPasswdResetPage = EmailPasswdResetPage;

})(typeof exports === 'undefined'? _modules['EmailPasswdResetPage']={} : exports);