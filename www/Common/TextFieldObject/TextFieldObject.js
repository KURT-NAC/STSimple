(function(exports){

    var JSON_LOADED = false;

    function TextFieldObject()
    {
        TextFieldObject.superclass.constructor.call(this);

        if (!JSON_LOADED)
        {
            g_layout.mergePage('main', 'textFieldObject', g_loader.getResult('textFieldObjectLayout'));
            JSON_LOADED = true;
        }

        this.init();
        return this;
    }

    TextFieldObject.addResourcesToManifest = function(manifest)
    {
        manifest.textFieldObjectLayout = "Common/TextFieldObject/textfieldobject.json";

        if (typeof manifest.textFieldFrame === 'undefined')
            manifest.textFieldFrame = "Common/TextFieldObject/textFieldBackground.png";
    }

    TextFieldObject.prototype =
    {
        defaultTxt : '',
        userTxt : '',
        divId : '',
        txtId : '',
        clearDefault : null,
        centerText : null,
        maxLength : null,

        init : function()
        {
            var self = this;

            // bitmap frame around the text field
            var frame = new CAAT.Actor();
            frame.setBackgroundImage(g_loader.getResult('textFieldFrame'), true);
            self.addChild(frame);
            self.setSize(frame.width,frame.height);

            // generate random DOM ids
            self.divId = 'tfd' + Math.floor(Math.random()*100000);
            self.txtId = 'tfi' + Math.floor(Math.random()*100000);

            return self;
        },

        setup : function(defaultText, clearDefault, centerText, maxLength)
        {
            var self = this;

            self.centerText = centerText != null ? centerText : true;
            var alignment = self.centerText ? 'center' : 'left';

            self.maxLength = maxLength != null ? maxLength : 100;

            // if clearDefault is true, then the default value is technically empty
            // otherwise, the default value will be the defaultText
            self.clearDefault = clearDefault != null ? clearDefault : true;

            // don't use text in layout text since it is likely to change per instance
            self.defaultTxt = defaultText || '';
            if (self.clearDefault)
            {
                self.userTxt = '';
            }
            else
            {
                self.userTxt = defaultText || '';
            }

            // get world x & y
            var pt = self.modelToView( new CAAT.Point(0,0) );
            var pt2 = self.modelToView( new CAAT.Point(self.width, self.height));
            var width = pt2.x - pt.x;
            var height = pt2.y - pt.y;
            // Global offsets must be applied separately due to the use of modelToView
            pt.x += g_game.globalOffset.x;
            pt.y += g_game.globalOffset.y;

            // get layout tweaks
            var el = g_layout.getElementInPage('main','textFieldObject','input');

            var adjusted = [
                g_game.adjustOffsetLayout({x: el.x1 * self.scaleX, y: el.y1 * self.scaleY}),
                g_game.adjustOffsetLayout({x: el.x2 * self.scaleX, y: el.y2 * self.scaleY})
            ];

            var colonPos = el.font.lastIndexOf(':');
            var pixelPos = el.font.lastIndexOf('px');
            var strFontSize = el.font.substring(colonPos+1, pixelPos);
            var fontSize = Math.ceil(Number(strFontSize) * self.scaleY);
            var strNewSize = fontSize.toString();
            var newFont = el.font.replace(strFontSize, strNewSize);

            // add input field to HTML
            var txt = '';
            txt += '<div id="'+ self.divId +'" style="position:absolute; left:'+ (pt.x + adjusted[0].x) +'px; top:'+ (pt.y + adjusted[0].y) + 'px;">';
            txt += '<input type="text" maxlength="'+ self.maxLength +'" value="'+ self.defaultTxt + '" id="'+ self.txtId +'" style="'+ newFont + ' text-align:'+ alignment +'; border-style:none; outline:none; width:'+ (width-adjusted[1].x) + 'px; height:' + (height-adjusted[1].y) + 'px;"/>';
            txt += '</div>';
            $('#mainCanvasHolder').append(txt);

            // hook up key listeners
            var input = $('#'+self.txtId)[0];
            input.addEventListener('click', self._onClick(input) );
            input.addEventListener('keyup', self._onKeyUp(input) );
        },

        cleanup : function()
        {
            var self = this;
            $('#' + self.divId).remove();
            self.destroy();
        },

        show : function()
        {
            var self = this;
            $('#' + self.divId).show();
            self.visible = true;
        },

        hide : function()
        {
            var self = this;
            $('#' + self.divId).hide();
            self.visible = false;
        },

        _onClick : function(input)
        {
            var self = this;
            return function(event)
            {
                if (self.clearDefault && input.value === self.defaultTxt)
                    input.value = '';
                self.userTxt = input.value;
            }
        },

        _onKeyUp : function(input)
        {
            var self = this;
            return function(event)
            {
                if (event.keyCode === CAAT.Keys.ENTER)
                {
                    event.preventDefault();
                    return;
                }
                if (self.userTxt.length < 100)
                    self.userTxt = input.value;
                else
                    input.value = input.value.substring(0, input.value.length-1);
            }
        }
    };

    addGameWidget('TextFieldObject', TextFieldObject);

    extend(TextFieldObject, CAAT.ActorContainer);
    exports.TextFieldObject = TextFieldObject;

})(typeof exports === 'undefined'? _modules['TextFieldObject']={} : exports);
