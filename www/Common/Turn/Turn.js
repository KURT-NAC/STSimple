(function(exports){

    function Turn(owner,director)
    {
        this.init(owner,director);
    }

    Turn.prototype =
    {

        owner : null,
        director : null,
        scene : null,

        fsm: null,

        arNumPos2 : null,
        arNumPos3 : null,

        numberSprite : null,
        arNumImages : null,

        exitStepName : null,
        exitState1 : null,
        exitState2 : null,

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

        setExitStates : function(serverSolveStepName, state1, state2)
        {
            var self = this;
            self.exitSolveStepName = serverSolveStepName;
            self.exitState1 = state1;
            self.exitState2 = state2;
            return self;
        },

        addToManifest : function(manifest)
        {
            manifest.turnMainLayout = "Common/Turn/turn_main_view.json";
            manifest.turnSubLayout = "Common/Turn/turn_sub_view_" + g_game.platform + ".json";
            manifest.turnBalloon = "Common/Turn/turn_balloon.png";
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'turn', g_loader.getResult('turnMainLayout'));
            g_layout.mergePage('sub', 'turn', g_loader.getResult('turnSubLayout'));
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            // background
            var bg = new CAAT.Actor();
            var element = g_layout.getElementInPage('main', 'turn', 'bg');
            bg.setBackgroundImage(g_loader.getResult(element.id), true);
            g_layout.applyElementToCAATActor(element, bg, true, true);
            self.scene.addChild(bg);

            // animated character
            var element = g_layout.getElementInPage('main', 'turn', 'animation');
            if (typeof element.id !== 'undefined')
            {
                var anim = g_layout.createFlipBook(element);
                self.scene.addChild(anim);
            }

            // balloon
            var balloon = new CAAT.Actor();
            var element = g_layout.getElementInPage('main', 'turn', 'balloon');
            balloon.setBackgroundImage(g_loader.getResult(element.id), true);
            g_layout.applyElementToCAATActor(element, balloon, true, true);
            self.scene.addChild(balloon);

            // pre-create images
            if (self.arNumPos2 == null)
            {
                self.arNumPos2 = new Array();
                self.arNumPos2.push(g_layout.getElementInPage('main', 'turn', 'num1a'));
                self.arNumPos2.push(g_layout.getElementInPage('main', 'turn', 'num2a'));

                self.arNumPos3 = new Array();
                self.arNumPos3.push(g_layout.getElementInPage('main', 'turn', 'num1'));
                self.arNumPos3.push(g_layout.getElementInPage('main', 'turn', 'num2'));
                self.arNumPos3.push(g_layout.getElementInPage('main', 'turn', 'num3'));

                self.numberSprite = new CAAT.SpriteImage();
                self.numberSprite.initialize(g_loader.getResult(self.arNumPos2[0].id), 2, 5);

                self.arNumImages = new Array();
            }

            for (var i = 0; i < 3; i++)
            {
                var img = new CAAT.Actor()
                    .setBackgroundImage(self.numberSprite.getRef(), true)
                    .setSpriteIndex(0)
                    .enableEvents(false);

                self.scene.addChild(img);
                self.arNumImages.push(img);
            }

            var serverTurn = self.owner.clientConnection.game.turn;
            var isSolveState = self.owner.clientConnection.game.state.step == self.exitSolveStepName;
            var screenTurn = serverTurn + (isSolveState ? 0 : 1);
            console.log("Turn Screen shows round " + screenTurn.toString());


            //screenTurn = 0;   // For manually testing round numbers

            var strTurn = screenTurn.toString();

            var posArray = self.arNumPos3;
            if (strTurn.length == 2)
                posArray = self.arNumPos2;

            for (var i = 0; i < 3; i++)
            {
                if (i < strTurn.length)
                {
                    self.arNumImages[i].setVisible(true);

                    var digit = parseInt(strTurn[i]);
                    self.arNumImages[i].setSpriteIndex(digit);

                    var el = posArray[strTurn.length == 1 ? 1 : i];
                    self.arNumImages[i].setPositionAnchored(el['x'], el['y'], el['regX'], el['regY']);
                }
                else
                {
                    self.arNumImages[i].setVisible(false);
                }
            }

            // sub area
            var footer = new CAAT.Actor();
            var element = g_layout.getElementInPage('sub', 'turn', 'footer');
            footer.setBackgroundImage(g_loader.getResult(element.id), true);
            g_layout.applyElementToCAATActor(element, footer, true, true);
            self.scene.addChild(footer);

            var nextState = isSolveState ? self.exitState1 : self.exitState2;
            var element = g_layout.getElementInPage('sub', 'turn', 'goBtn');
            var button = g_layout.createNavigationButton(element, self._goButtonClicked(nextState) );
            self.scene.addChild(button);
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
            self.arNumImages = self.arNumImages.slice(0, self.arNumImages.length);
            self.arNumImages.length = 0;

            CAAT.sceneCleanup(self.scene);
        },

        _goButtonClicked : function(nextState)
        {
            var self = this;
            return function(evt)
            {
                self.owner.fsm.gotoState(nextState);
            }
        }
   };

    exports.Turn = Turn;

})(typeof exports === 'undefined'? _modules['Turn']={} : exports);
