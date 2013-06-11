(function(exports){

    function DifficultyPage(owner,director)
    {
        this.init(owner,director);
    }

    DifficultyPage.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        fsm: null,

        facebookPic : null,
        oppIdx : 0,

        FACEBOOK_FRAME: 1,
        FACEBOOK_PIC: 2,
        FIRST_COIN: 3,
        LAST_COIN: 7,

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

            g_layout.addAllElementsToObject(self.scene, "main", "difficulty");

            self.oppIdx = self.owner.clientConnection.getOpponentPlayerIdx();

            // difficulty buttons
            self._createDifficultyButton(0,'easy', 16, 1);
            self._createDifficultyButton(1,'medium', 30, 2);
            self._createDifficultyButton(2,'hard', 64, 3);
            self._createDifficultyButton(3,'crazy', 96, 5);

            // footer
            var footer = new CAAT.Actor();
            footer.setBackgroundImage(g_loader.getResult('footer'), true);
            var el = g_layout.getElementInPage("sub","difficulty","footer");
            g_layout.applyElementToCAATActor(el,footer,true,true);
            self.scene.addChild(footer);

            // back button [depends on mode]
            if (!stateData || stateData.type == 'self' )
            {
                var el = g_layout.getElementInPage("sub","difficulty","back");
                var button = g_layout.createNavigationButton(el, self._onBackClick());
                button.id = "backBtn";
                self.scene.addChild(button);
            }
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
            CAAT.sceneCleanup( self.scene );
        },

        _createDifficultyButton : function(level,name,pieces,coins)
        {
            var self = this;

            var elBkgd = g_layout.getElementInPage('main', 'difficulty', name + "Background");
            var el = g_layout.getElementInPage('main', 'difficultyDynamic', 'buttonTemplate');
            var button = g_layout.createFancyButton( el, self._onMouseClick() );
            button.difficulty = level;

            var game = self.owner.clientConnection.game;
            var isOppButton = game.state.step === 'oppDifficulty' && game.state.stats[self.oppIdx].difficulty === level;

            if (isOppButton)
            {
                // time bkgd
                var bkgd = new CAAT.Actor();
                var el = g_layout.getElementInPage('main','difficultyDynamic','timeBkgd');
                bkgd.setBackgroundImage(g_loader.getResult(el.id), true);
                g_layout.applyElementToCAATActor(el,bkgd,true,true);
                bkgd.y += elBkgd.y;
                self.scene.addChild(bkgd);

                // time label
                var text = new CAAT.TextActor();
                var el = g_layout.getElementInPage('main','difficultyDynamic','timeLabel');
                g_layout.applyElementToCAATActor(el,text,true,true);
                text.y += elBkgd.y;
                self.scene.addChild(text);

                // time background
                var el = g_layout.getElementInPage('main','difficultyDynamic','timer');
                var timer = g_layout.createTimerActor(el);
                timer.setTime(game.state.stats[self.oppIdx].time);
                timer.y += elBkgd.y;
                self.scene.addChild(timer);

                var opponent = game.players[self.oppIdx];
                self.owner.fbProfilePics.getPicture(opponent.fbId, require('FBProfilePicGetter').FBProfilePicGetter.PIC_TYPE_SQUARE, self._createButtonPicCallback(button));
            }

            var pcCnt = button.textActorByString("XX");
            if (pcCnt)
                pcCnt.setText(pieces.toString());

            button.setImageVisible(self.FACEBOOK_FRAME, isOppButton);
            button.setImageVisible(self.FACEBOOK_PIC, isOppButton);

            for (var i = self.LAST_COIN; i >= self.FIRST_COIN + coins; i--)
                button.setImageVisible(i, false);

            button.y = elBkgd.y - (isOppButton ? 2 : 0);
            self.scene.addChild(button);
        },

        _createButtonPicCallback : function(button)
        {
            var self = this;
            return function(image)
            {
                button.replaceImage(self.FACEBOOK_PIC, image);
            }
        },

        _onMouseClick : function()
        {
            var self = this;
            return function(button)
            {
                var turn = { 'difficulty' : button.parent.difficulty };
                self.owner.clientConnection.turnGame(turn,function(err){
                    self.owner.gotoGame( self.owner.clientConnection.game.id);
                });
            }
        },

        _onBackClick : function()
        {
            var self = this;
            return function()
            {
                var backBtn = g_layout.getActorFromArrayByID(self.scene.childrenList,"backBtn");
                backBtn.enableEvents(false);
                self.owner.clientConnection.turnGame( {'back':true}, function(err){
                    // TODO: Error handling
                    self.owner.fsm.gotoState( self.owner.GameStates.RecordClip );
                });
            }
        }
    };

    exports.DifficultyPage = DifficultyPage;

})(typeof exports === 'undefined'? _modules['DifficultyPage']={} : exports);