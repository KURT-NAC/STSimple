(function(exports){

    function TurnButton()
    {
        TurnButton.superclass.constructor.call(this);

        if (!TurnButton.JSON_LOADED)
        {
            g_layout.mergePage('main', 'turnButton', g_loader.getResult('turnButtonLayout'));

            TurnButton.JSON_LOADED = true;
        }

        return this;
    }

    TurnButton.addResourcesToManifest = function(manifest)
    {
        manifest.turnButtonLayout = "Common/TurnButton/turnbutton.json";

        if (typeof manifest.turnButtonImg === 'undefined')
            manifest.turnButtonImg = "Common/TurnButton/Turn_arrow.png";
        if (typeof manifest.turnButtonGo === 'undefined')
            manifest.turnButtonGo = "Common/TurnButton/Go.png";
        if (typeof manifest.turnButtonTurn === 'undefined')
            manifest.turnButtonTurn = "Common/TurnButton/Turn.png";
        if (typeof manifest.turnButtonNumbers === 'undefined')
            manifest.turnButtonNumbers = "Common/TurnButton/number_sheet_sml.png";
    }

    TurnButton.JSON_LOADED = false;

    TurnButton.prototype =
    {
        init : function()
        {
            var self = this;

            var config = new Object();
            config.buttonImage = g_loader.getResult('turnButtonImg');
            config.normalIdx = 0;
            config.pressIdx = 1;

            TurnButton.superclass.init.call(self, config);
            self.vertAdjust = g_layout.getElementInPage('main', 'turnButton', 'adjust');

            var element = g_layout.getElementInPage('main', 'turnButton', 'numberImages');
            for (var i = 0; i < element.length; i++)
            {
                self.addImage(g_loader.getResult(element[i].id), element[i].pos, true);
            }

            return self;
        },

        setTurn : function(turn)
        {
            var self = this;

            var strTurn = turn.toString();
            var turnLen = strTurn.length;

            var numberSprite = new CAAT.SpriteImage();
            numberSprite.initialize(g_loader.getResult('turnButtonNumbers'), 2, 5);

            for (var i = 0; i < 3; i++)
            {
                self.replaceImage(i, numberSprite.getRef());
                self.setImageVisible(i, turnLen === 3  || (turnLen === 2 && i >= 1) || (turnLen === 1 && i == 2));
            }

            for (var i = 0; i < turnLen; i++)
            {
                var digit = parseInt(strTurn[i]);

                switch (turnLen)
                {
                    case 1:
                        self.setImageSpiteIndex(2, digit);
                        break;
                    case 2:
                        self.setImageSpiteIndex(1+i, digit);
                        break;
                    case 3:
                        self.setImageSpiteIndex(i, digit);
                        break;
                }
            }

            var element = g_layout.getElementInPage('main', 'turnButton', 'turn');
            self.addImage(g_loader.getResult(element[turnLen-1].id), element[turnLen-1].pos, true);

            var element = g_layout.getElementInPage('main', 'turnButton', 'go');
            self.addImage(g_loader.getResult(element.id), element.pos, true);
        }
    };

    addGameWidget('TurnButton', TurnButton);

    extend(TurnButton, require('FancyButton').FancyButton);
    exports.TurnButton = TurnButton;

})(typeof exports === 'undefined'? _modules['TurnButton']={} : exports);
