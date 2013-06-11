(function(exports){

    var ErrorCode = require('ErrorCode').ErrorCode;

    function CreateGameEmail(owner,director)
    {
        this.init(owner,director);
    }

    CreateGameEmail.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        fsm : null,

        email : "",
        emailField : null,

        init : function(owner, director, scene)
        {
            var self = this;

            // validate args
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
            self.fsm.addState("email", self._enterEmail(), null, self._leaveEmail());
            self.fsm.addState("notfound", self._enterNotFound(), null, self._leaveNotFound() );
        },

        addToManifest : function(manifest)
        {
            // assumes CreateGame has already added assets to manifest
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'createGameEmail', g_loader.getResult('createMainLayout'));
            g_layout.mergePage('main', 'inviteGameEmail', g_loader.getResult('createMainLayout'));
            g_layout.mergePage('main', 'inviteEmailCopy', g_loader.getResult('createMainLayout'));
            g_layout.mergePage('sub', 'createGameEmail', g_loader.getResult('createSubLayout'));
            g_layout.mergePage('sub', 'inviteGameEmail', g_loader.getResult('createSubLayout'));
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;
            self.fsm.gotoState('email');
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
            self.fsm.stop();
        },

        //////////////////////
        // Email State

        _enterEmail : function()
        {
            var self = this;
            return function(prevState)
            {
                // initialize layout
                g_layout.addAllElementsToObject(self.scene, 'main', 'createGameEmail');
                g_layout.addAllElementsToObject(self.scene, 'sub', 'createGameEmail');

                // email field
                self.emailField = g_layout.getActorFromArrayByID(self.scene.childrenList,"email");
                self.emailField.setup("Email Address");
                self.email = '';

                // start button
                var find = g_layout.getActorFromArrayByID(self.scene.childrenList,"findBtn");
                find.enableEvents(true).mouseClick = self._onStartClick();

                // back button
                var back = g_layout.getActorFromArrayByID(self.scene.childrenList,"back");
                back.enableEvents(true).mouseClick = self._onBackClick();
            }
        },

        _onStartClick : function()
        {
            var self = this;
            return function(evt)
            {
                self.email = self.emailField.userTxt;

                var error = self._validateEmail(self.email);
                if (error)
                {
                    self.owner.showGenericDialog("Invalid Email", error, "Ok" );
                    return;
                }

                self.owner.showLoadingDialog("Looking for player...");
                self.owner.clientConnection.lookupEmail(self.email,self._onEmailResponse() );
            }
        },

        _onEmailResponse : function()
        {
            var self = this;
            return function(response)
            {
                if (response.code === ErrorCode.OK.code)
                {
                    // can't play with yourself
                    if (self.owner.clientConnection.userId == response.data.id)
                    {
                        self.owner.hideLoadingDialog();
                        self.owner.showGenericDialog("Bad Email", "Please enter other\nplayer's email.", "OK");
                        return;
                    }

                    // make sure we don't already have a game with this person
                    if (self._alreadyHasGame(response.data.id))
                    {
                        self.owner.hideLoadingDialog();
                        self.owner.showGenericDialog("Sorry", "You already have a game\nwith this user", "OK");
                        return;
                    }

                    // create game with new player
                    var players = [ self.owner.clientConnection.userId, response.data.id];
                    self.owner.clientConnection.createGame(players,function(err,result){
                        if (err)
                        {
                            self.owner.hideLoadingDialog();
                            self.owner.showGenericDialog("Error creating game", err, "OK");
                        }
                        else
                        {
                            self.owner.gotoGame(result.id);
                        }
                    });
                }
                else
                {
                    self.fsm.gotoState("notfound");
                }
            }
        },

        _onBackClick : function()
        {
            var self = this;
            return function(evt)
            {
                self.owner.fsm.gotoState(self.owner.GameStates.CreateGame);
            }
        },

        _leaveEmail : function()
        {
            var self = this;
            return function(nextState)
            {
                CAAT.sceneCleanup(self.scene);
                self.owner.hideLoadingDialog();
                self.emailField = null;
            }
        },

        //////////////////////
        // Email Not Found State

        _enterNotFound : function()
        {
            var self = this;
            return function(prevState)
            {
                // initialize layout
                g_layout.addAllElementsToObject(self.scene, 'main', 'inviteGameEmail');
                g_layout.addAllElementsToObject(self.scene, 'sub', 'inviteGameEmail');

                // email
                var emailTxt = g_layout.getActorFromArrayByID(self.scene.childrenList,"email");
                emailTxt.setText(self.email);

                // invite
                var invite = g_layout.getActorFromArrayByID(self.scene.childrenList,"inviteBtn");
                invite.enableEvents(true).mouseClick = self._onInviteClick();

                // back button
                var back = g_layout.getActorFromArrayByID(self.scene.childrenList,"back");
                back.enableEvents(true).mouseClick = self._onBackInviteClick();
            }
        },

        _leaveNotFound : function()
        {
            var self = this;
            return function(nextState)
            {
                CAAT.sceneCleanup(self.scene);
            }
        },

        _onBackInviteClick : function()
        {
            var self = this;
            return function(evt)
            {
                self.fsm.gotoState("email");
            }
        },

        _onInviteClick : function()
        {
            var self = this;
            return function(evt)
            {
                // get email content from layout file
                var elSubject = g_layout.getElementInPage('main', 'inviteEmailCopy', 'subject');
                var elBody = g_layout.getElementInPage('main', 'inviteEmailCopy', 'body');

                // create mailto link
                var subject = encodeURI(elSubject.text);
                var body = encodeURI(elBody.text);
                var mailto_link = 'mailto:'+self.email+'?subject='+subject+'&body='+body;

                // open mailto link
                var win = window.open(mailto_link,'emailWindow');
                if (win && win.open &&!win.closed)
                    win.close();

                // return to email enter screen
                self.fsm.gotoState("email");
            }
        },

        ///////////////////
        // Helpers

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

        // check if specified user is already in one of the user's active games
        _alreadyHasGame : function(userId)
        {
            var self = this;
            for (var i = self.owner.clientConnection.activeGames.length - 1; i >= 0; i--)
            {
                var game = self.owner.clientConnection.activeGames[i];
                for (var j = game.players.length - 1; j >= 0; j--)
                {
                    if (game.players[j].id === userId)
                        return true;
                }
            }
            return false;
        }

    };

    exports.CreateGameEmail = CreateGameEmail;

})(typeof exports === 'undefined'? _modules['CreateGameEmail']={} : exports);