(function(exports){

    var ErrorCode = require('ErrorCode').ErrorCode;

    function CreateGameUsername(owner,director)
    {
        this.init(owner,director);
    }

    CreateGameUsername.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        username : "",
        usernameField : null,

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
        },

        addToManifest : function(manifest)
        {
            // assumes CreateGame has already added assets to manifest
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'createGameUsername', g_loader.getResult('createMainLayout'));
            g_layout.mergePage('sub', 'createGameUsername', g_loader.getResult('createSubLayout'));
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;
            self._enterUsername();
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;

            CAAT.sceneCleanup(self.scene);
            self.owner.hideLoadingDialog();
            self.usernameField = null;
        },

        //////////////////////
        // Username State

        _enterUsername : function()
        {
            var self = this;

            // initialize layout
            g_layout.addAllElementsToObject(self.scene, 'main', 'createGameUsername');
            g_layout.addAllElementsToObject(self.scene, 'sub', 'createGameUsername');

            // email field
            self.usernameField = g_layout.getActorFromArrayByID(self.scene.childrenList,"username");
            self.usernameField.setup("Username");
            self.username = '';

            // start button
            var find = g_layout.getActorFromArrayByID(self.scene.childrenList,"findBtn");
            find.enableEvents(true).mouseClick = self._onStartClick();

            // back button
            var back = g_layout.getActorFromArrayByID(self.scene.childrenList,"back");
            back.enableEvents(true).mouseClick = self._onBackClick();
        },

        _onStartClick : function()
        {
            var self = this;
            return function(evt)
            {
                self.username = self.usernameField.userTxt;

                self.owner.showLoadingDialog("Looking for player...");
                self.owner.clientConnection.lookupUsername(self.username,self._onUsernameResponse() );
            }
        },

        _onUsernameResponse : function()
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
                        self.owner.showGenericDialog("Bad Username", "Please enter other\nplayer's username.", "OK");
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
                    self.owner.hideLoadingDialog();
                    self.owner.showGenericDialog("Sorry", "Username not found", "OK");
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

        ///////////////////
        // Helpers

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

    exports.CreateGameUsername = CreateGameUsername;

})(typeof exports === 'undefined'? _modules['CreateGameUsername']={} : exports);