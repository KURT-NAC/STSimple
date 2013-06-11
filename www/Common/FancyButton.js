(function(exports){

    function FancyButton()
    {
        FancyButton.superclass.constructor.call(this);
        if (FancyButton.DEFAULT_BAR.length <= 0)
        {
            var el = g_layout.getUniversalElementInView("main", "stdButtonDefaults");
            if (el)
            {
                FancyButton.setDefaultsLayout.call(this, el);
                return this;
            }

            console.log("FancyButton has no defaults and could not set them from the LayoutManager");
        }
        return this;
    }

    FancyButton.ORIENTATION_HORIZONTAL = 0;
    FancyButton.ORIENTATION_VERTICAL = 1;

    FancyButton.DEFAULT_SFX = 'buttonClick1';
    FancyButton.DEFAULT_CAP_L = "";
    FancyButton.DEFAULT_BAR = "";
    FancyButton.DEFAULT_CAP_R = "";

    FancyButton.setDefaults = function(cap_left, bar, cap_right, adjust)
    {
        FancyButton.DEFAULT_CAP_L = cap_left;
        FancyButton.DEFAULT_BAR = bar;
        FancyButton.DEFAULT_CAP_R = cap_right;
    };

    FancyButton.setDefaultsLayout = function(layoutElement)
    {
        FancyButton.DEFAULT_CAP_L = layoutElement['cap_left'];
        FancyButton.DEFAULT_BAR = layoutElement['bar'];
        FancyButton.DEFAULT_CAP_R = layoutElement['cap_right'];
    };

    FancyButton.prototype =
    {
        backgroundImg: null,
        text: null,
        theButton: null,
        textFont: null,
        textAlign: null,
        textBaseline: null,
        textFill: null,
        arImages: null,
        vertAdjust: 0,
        horzAdjust: 0,
        orientation: 0,
        lineSpaceAdjust: 0,
        clickAudioID: null,

        /*
            config parameter to init function can have the following members:
            "backgroundImg":    image for the background behind a button
            "buttonImage":      image for the button itself (can be a 3-slice)
            "map":              json map data for a 3-slice
            "normalIdx":        index of button's normal state (non 3-slice)
            "overIdx":          index of button's over state (non 3-slice)
            "pressIdx":         index of button's pressed state (non 3-slice)
            "disabledIdx":      index of button's disabled state (non 3-slice)
            "bar":              name of bar element in 3-slice map
            "capL":             name of left cap element in 3-slice map
            "capR":             name of right cap element in 3-slice map
            "text":             text string for button
            "orientation":      is button oriented horizontal or vertical?
            "callback":         callback function for button's on-click
            "boundsX":          manual x bound (if not set, use backgroundImg, if null, use buttonImage)
            "boundsY":          manual y bound (if not set, use backgroundImg, if null, use buttonImage)
            "clickAudio":       sound fx to play on click
         */

        init : function(config)
        {
            var self = this;

            self.lineSpaceAdjust = require('LayoutManager').LayoutManager.DEFAULT_LINESPACE_FACTOR;

            if (typeof config.backgroundImg !== 'undefined')
            {
                self.backgroundImg = new CAAT.Actor().setBackgroundImage(config.backgroundImg, true);
                self.backgroundImg.setPosition(0, 0);
                self.backgroundImg.enableEvents(false);
                self.addChild(self.backgroundImg);
            }

            if (typeof config.map === 'undefined')
            {
                var sprite = new CAAT.SpriteImage();
                sprite.initialize(config.buttonImage, 2, 1);    //TODO: support more than just 2 rows, 1 col format

                var normal = config.normalIdx || 0;
                var over = config.overIdx || 0;
                var press = config.pressIdx || 0;
                var disabled = config.disabledIdx || 0;

                self.theButton = new CAAT.Actor();
                self.theButton.setAsButton(sprite, normal, over, press, disabled, config.callback).
                    enableEvents(false);
            }
            else
            {
                if (typeof config.bar === 'undefined')
                {
                    config.bar = FancyButton.DEFAULT_BAR;
                    config.capL = FancyButton.DEFAULT_CAP_L;
                    config.capR = FancyButton.DEFAULT_CAP_R;
                }

                var strNormal = config.capL + ',' + config.bar + ',' + config.capR;
                var strOver = config.capL + '_over,' + config.bar + '_over,' + config.capR + '_over';
                var strPress = config.capL + '_press,' + config.bar + '_press,' + config.capR + '_press';
                var strDisable = config.capL + '_disable,' + config.bar + '_disable,' + config.capR + '_disable';

                self.theButton = new (require('ThreeSliceActor').ThreeSliceActor)();
                self.theButton.setAsButton(config.buttonImage, config.map,
                    strNormal, strOver, strPress, strDisable, config.callback)
                    .enableEvents(false);
            }
            self.linkButtonStates();

            if (self.backgroundImg)
            {
                self.theButton.setPosition((self.backgroundImg.width - self.theButton.width)/2, (self.backgroundImg.height - self.theButton.height)/2);
            }

            self.addChild(self.theButton);

            var xBound = config.boundX || (self.backgroundImg ? self.backgroundImg.width : self.theButton.width);
            var yBound = config.boundY || (self.backgroundImg ? self.backgroundImg.height : self.theButton.height);

            self.setSize(xBound, yBound);
            self.setBounds(0, 0, xBound, yBound);

            self.text = new Array();
            var arInitText = new Array();
            self.text.push(arInitText);

            var theText = config.text || '';
            self.setText(theText);

            self.enableEvents(true);

            self.orientation = config.orientation || FancyButton.ORIENTATION_HORIZONTAL;
            self.clickAudioID = config.clickAudioID || FancyButton.DEFAULT_SFX;

            return self;
        },

        setClickCallback: function(fn)
        {
            var self = this;
            self.theButton.fnOnClick = fn;
            self.linkButtonStates();
            return self;
        },

        setAudioClip: function(clipID)
        {
            var self = this;

            if (clipID)
                self.clickAudioID = clipID;

            return self;
        },

        setOverallBounds: function (w, h)
        {
            var self = this;
            self.setBounds(0, 0, w, h);
            return self;
        },

        setOrientation: function(val)
        {
            var self = this;
            self.orientation = val;
            return self;
        },

        setLineSpaceAdjust: function(val)
        {
            var self = this;
            self.lineSpaceAdjust = val;
            return self;
        },

        setVerticalAdjust: function(val)
        {
            var self = this;
            self.vertAdjust = val;
            return self;
        },

        setHorizontalAdjust: function(val)
        {
            var self = this;
            self.horzAdjust = val;
            return self;
        },

        addBackgroundImage: function(image)
        {
            var self = this;
            self.backgroundImg = new CAAT.Actor().setBackgroundImage(image, true);
            self.addChildAt(self.backgroundImg, 0);
            self.setBounds(0, 0, self.backgroundImg.width, self.backgroundImg.height);
        },

        setButtonSize: function(w, h)
        {
            var self = this;
            self.theButton.setSize(w, h);
            return self;
        },

        setButtonPos: function(x, y, regX, regY)
        {
            regX = regX||0;
            regY = regY||0;

            var self = this;
            self.theButton.setPositionAnchored(x, y, regX, regY);
            return this;
        },

        setTextActorStyle: function(font, fillStyle, align, baseline, idx)
        {
            var self = this;

            idx = typeof idx !== 'undefined' ? idx : 0;
            if (!self.text || idx >= self.text.length)
                return self;

            self.setFont(font, idx)
                .setTextFillStyle(fillStyle, idx)
                .setTextAlign(align, idx)
                .setTextBaseline(baseline, idx);

            return self;
        },

        setFont: function(font, idx)
        {
            var self = this;

            self.textFont = font;

            idx = typeof idx !== 'undefined' ? idx : 0;
            if (!self.text || idx >= self.text.length)
                return self;

            var txt;
            for (var i = 0; i < self.text[idx].length; i++)
            {
                txt = self.text[idx][i];
                txt.setFont(font);

                txt.setSize(txt.textWidth, txt.textHeight);
                var posX = self.width/ 2;
                var yPos = (self.height - (self.text[idx].length * txt.height))/ 2 + i*txt.height;
                txt.setPosition(posX + self.horzAdjust, yPos + self.vertAdjust);
            }

            return self;
        },

        setTextFillStyle: function(fillStyle, idx)
        {
            var self = this;

            self.textFill = fillStyle;

            idx = typeof idx !== 'undefined' ? idx : 0;
            if (!self.text || idx >= self.text.length)
                return self;

            for (var i = 0; i < self.text[idx].length; i++)
            {
                self.text[idx][i].setTextFillStyle(fillStyle);
            }

            return self;
        },

        setTextBaseline: function(baseline, idx)
        {
            var self = this;

            self.textBaseline = baseline;

            idx = typeof idx !== 'undefined' ? idx : 0;
            if (!self.text || idx >= self.text.length)
                return self;

            for (var i = 0; i < self.text[idx].length; i++)
            {
                self.text[idx][i].setTextBaseline(baseline);
            }

            return self;
        },

        setTextAlign: function(align, idx)
        {
            var self = this;

            self.textAlign = align;

            idx = typeof idx !== 'undefined' ? idx : 0;
            if (!self.text || idx >= self.text.length)
                return self;

            for (var i = 0; i < self.text[idx].length; i++)
            {
                self.text[idx][i].setTextAlign(align);
            }

            return self;
        },

        setScale: function(scaleW, scaleH)
        {
            var self = this;
            if (!self.theButton)
                return self;

            self.theButton.setSize(scaleW * self.theButton.width, scaleH * self.theButton.height);

            if (self.backgroundImg)
                self.setBounds( self.x, self.y, self.backgroundImg.width, self.backgroundImg.height)
            else
                self.setBounds( self.x, self.y, self.theButton.width, self.theButton.height)

            if (!self.text || self.text.length <= 0)
                return self;

            for (var i = 0; i < self.text[0].length; i++)
            {
                var curTxt = self.text[0][i];
                var yPos = (self.height - (self.text[0].length * curTxt.height))/ 2 + i*curTxt.height;
                curTxt.setPosition( ((self.width - curTxt.width)/ 2) + self.horzAdjust, yPos + self.vertAdjust);
            }

            return self;
        },

        getText: function(idx)
        {
            var self = this;

            idx = typeof idx !== 'undefined' ? idx : 0;

            var theText = "";

            if (self.text && self.text.length > idx)
            {
                for (var i = 0; i < self.text[idx].length; i++)
                {
                    theText += self.text[idx][i].text;
                    if (i < self.text[idx].length-1)
                        theText += "\n";
                }
            }

            return theText;
        },

        setText: function(text, idx, align, fill, font)
        {
            var self = this;

            idx = typeof idx !== 'undefined' ? idx : 0;

            var origX = 0;
            var origY = 0;
            var origFont = null;
            var useOrigPos = false;

            if (self.text && self.text.length > idx)
            {
                if (self.text[idx].length > 0)
                {
                    useOrigPos = true;
                    origX = self.text[idx][0].x;
                    origY = self.text[idx][0].y;
                    origFont = self.text[idx][0].font;
                }

                for (var i = 0; i < self.text[idx].length; i++)
                {
                    var curTxt = self.text[idx][i];
                    self.removeChild(curTxt);
                    curTxt.setParent(null);
                    curTxt.setDiscardable(true);
                    curTxt.setExpired();
                    //curTxt = null;
                }

                self.text[idx] = self.text[idx].slice(0, self.text[idx].length);
                self.text[idx].length = 0;
            }

            if (idx >= self.text.length)
                return self;

            var arTxt = text.split('\n');

            font = font || (useOrigPos ? origFont : self.textFont);
            fill = fill || self.textFill;

            for (var i = 0; i < arTxt.length; i++)
            {
                var txt = new CAAT.TextActor()
                    .setFont(font ? font : '32px PosterCopy')
                    .setTextFillStyle(fill ? fill : 'white')
                    .setTextAlign(align ? align : 'center')
                    .setBaseline(self.textBaseline ? self.textBaseline : 'top')
                    .enableEvents(false)
                    .setText(arTxt[i]);

                txt.setSize(txt.textWidth, txt.textHeight);

                var posX, posY;

                var posX = useOrigPos ? origX : self.width / 2;
                var lineSpace = txt.height + (txt.height * self.lineSpaceAdjust);
                var posY = useOrigPos && self.orientation === FancyButton.ORIENTATION_VERTICAL ? origY :
                    (self.height - (arTxt.length * lineSpace))/ 2 + (i * lineSpace);

                txt.setPosition(posX + self.horzAdjust, posY + self.vertAdjust);
                self.text[idx].push(txt);
                self.addChild(txt);
            }

            if (self.textAlign)
                self.setTextAlign(self.textAlign);

            return self;
        },

        positionText: function(idx, pos, align)
        {
            var self = this;

            if (idx < 0 || idx >= self.text.length)
                return self;

            align = align || self.textAlign;

            for (var i = 0; i < self.text[idx].length; i++)
            {
                var curTxt = self.text[idx][i];
                curTxt.setTextAlign(align ? align : 'center');
                var lineSpace = curTxt.height + (curTxt.height * self.lineSpaceAdjust);
                var totalHeight = (self.text[idx].length - 1) * lineSpace + curTxt.height;
                var vertYPos = self.text[idx].length > 1 ? pos - totalHeight/2 + (i * lineSpace) : pos;
                var yPos = self.orientation === FancyButton.ORIENTATION_HORIZONTAL ?
                                (self.height - totalHeight)/ 2 + (i * lineSpace) : vertYPos;
                var xPos = self.orientation === FancyButton.ORIENTATION_VERTICAL ? self.width/ 2 : pos;
                curTxt.setPosition( xPos + self.horzAdjust, yPos + self.vertAdjust);
            }
        },

        addText: function(text, pos, align, fill, font, adjust)
        {
            var self = this;

            var arTxt = text.split('\n');

            var arNewText = new Array();

            font = font || self.textFont;
            fill = fill || self.textFill;
            adjust = adjust || 0;
            align = align || self.textAlign;

            for (var i = 0; i < arTxt.length; i++)
            {
                var txt = new CAAT.TextActor()
                    .setFont(font ? font : '32px PosterCopy')
                    .setTextFillStyle(fill ? fill : 'white')
                    .setTextAlign(align ? align : 'center')
                    .setBaseline(self.textBaseline ? self.textBaseline : 'top')
                    .enableEvents(false)
                    .setText(arTxt[i]);

                txt.setSize(txt.textWidth, txt.textHeight);
                var lineSpace = txt.height + (txt.height * self.lineSpaceAdjust);
                var yPos = self.orientation === FancyButton.ORIENTATION_HORIZONTAL ?
                                (self.height - (arTxt.length * lineSpace))/ 2 + (i * lineSpace) + adjust :
                                pos;
                var xPos = self.orientation === FancyButton.ORIENTATION_VERTICAL ?
                                self.width/ 2 + adjust :
                                pos;
                txt.setPosition( xPos + self.horzAdjust, yPos + self.vertAdjust);
                arNewText.push(txt);
                self.addChild(txt);
            }

            self.text.push(arNewText);

            //if (self.textAlign)
            //    self.setTextAlign(self.textAlign, self.text.length - 1);

            return self;
        },

        addImage: function(theImage, pos, centered, adjust)
        {
            var self = this;

            if (!self.arImages)
                self.arImages = new Array();

            var newImg = new CAAT.Actor();
            newImg.setBackgroundImage(theImage, true);

            var xPos, yPos, xA, yA;

            adjust = adjust || 0;

            if (self.orientation === FancyButton.ORIENTATION_HORIZONTAL)
            {
                xPos = pos;
                yPos = self.height / 2 + adjust;
                xA = centered ? 0.5 : 0;
                yA = 0.5;
            }
            else
            {
                xPos = self.width / 2 + adjust;
                yPos = pos;
                xA = 0.5;
                yA = centered ? 0.5 : 0;
            }

            newImg.setPositionAnchored( xPos + self.horzAdjust, yPos + self.vertAdjust, xA, yA);
            newImg.enableEvents(false);

            self.arImages.push(newImg);
            self.addChild(newImg);

            return self;
        },

        scaleImage: function(idx, sizeX, sizeY)
        {
            var self = this;

            if (idx < 0 || idx >= self.arImages.length)
                return self;

            var curImg = self.arImages[idx];
            curImg.setScale(sizeX/curImg.width, sizeY/curImg.height);

            return self;
        },

        setImageSpiteIndex: function(idx, spriteIdx)
        {
            var self = this;

            if (idx < 0 || idx >= self.arImages.length)
                return self;

            var curImg = self.arImages[idx];
            curImg.setSpriteIndex(spriteIdx);

            return self;
        },

        setImageAlpha: function(idx, alpha)
        {
            var self = this;

            if (idx < 0 || idx >= self.arImages.length)
                return self;

            var curImg = self.arImages[idx];
            curImg.setAlpha(alpha);

            return self;
        },

        positionImage: function(idx, pos, centered)
        {
            var self = this;

            if (idx < 0 || idx >= self.arImages.length)
                return self;

            centered = centered || false;

            var curImg = self.arImages[idx];

            var xPos, yPos, xA, yA;

            if (self.orientation === FancyButton.ORIENTATION_HORIZONTAL)
            {
                xPos = pos;
                yPos = self.height / 2;
                xA = centered ? 0.5 : 0;
                yA = 0.5;
            }
            else
            {
                xPos = self.width / 2;
                yPos = pos;
                xA = 0.5;
                yA = centered ? 0.5 : 0;
            }

            curImg.setPositionAnchored( xPos + self.horzAdjust, yPos + self.vertAdjust, xA, yA);

            return self;
        },

        getImagePosition: function(idx)
        {
            var self = this;
            var curImg = self.arImages[idx];
            return self.orientation === FancyButton.ORIENTATION_HORIZONTAL ? curImg.x : curImg.y;
        },

        setImageVisible: function(idx, vis)
        {
            var self = this;

            if (idx < 0 || idx >= self.arImages.length)
                return self;

            var curImg = self.arImages[idx];

            curImg.setVisible(vis);

            return self;
        },

        replaceImage: function(idx, image)
        {
            var self = this;

            if (idx < 0 || idx >= self.arImages.length)
                return self;

            var curImg = self.arImages[idx];
            curImg.setBackgroundImage(image, true);

            return self;
        },

        getImage: function(idx)
        {
            var self = this;

            if (idx < 0 || idx >= self.arImages.length)
                return self;

            var curImg = self.arImages[idx].backgroundImage.image;

            return curImg;
        },

        linkButtonStates: function()
        {
            var self = this;

            self.setEnabled= function( enabled ) {
                self.theButton.setEnabled(enabled);
            };

            self.actionPerformed= function(event) {
                if (self.clickAudioID)
                    g_game.audioManager.playSound(self.clickAudioID);

                self.theButton.actionPerformed(event);
            };

            self.mouseEnter= function(mouseEvent) {
                if (self.collisionOK(mouseEvent.x, mouseEvent.y))
                {
                    self.theButton.mouseEnter(mouseEvent);
                }
            };

            self.mouseExit= function(mouseEvent) {
                self.theButton.mouseExit(mouseEvent);
            };

            self.mouseDown= function(mouseEvent) {
                if (self.collisionOK(mouseEvent.x, mouseEvent.y))
                {
                    self.theButton.mouseDown(mouseEvent);
                }
            };

            self.mouseUp= function(mouseEvent) {
                if (self.collisionOK(mouseEvent.x, mouseEvent.y))
                {
                    self.theButton.mouseUp(mouseEvent);
                }
            };

            self.mouseClick= function(mouseEvent) {
                if (self.collisionOK(mouseEvent.x, mouseEvent.y))
                {
                    self.theButton.mouseClick(mouseEvent);
                }
            };

            self.mouseDrag= function(mouseEvent)  {
                self.theButton.mouseDrag(mouseEvent);
            };
        },

        collisionOK: function(x, y)
        {
            var self = this;

            if (!self.backgroundImg || !self.theButton)
                return true;

            var startX = self.theButton.x - self.theButton.width * self.theButton.tAnchorX;
            var startY = self.theButton.y - self.theButton.height * self.theButton.tAnchorY;

            return x >= startX && x <= startX + self.theButton.width &&
                    y >= startY && y <= startY + self.theButton.height;
        },

        setCallback: function(callback)
        {
            var self = this;

            self.enableEvents(true);

            if (self.theButton)
            {
                if (!self.theButton['iNormals'])
                    self.mouseClick = callback;

                self.theButton.fnOnClick = callback;
            }

            self.linkButtonStates();
        },

        textActorByString: function(text)
        {
            var self = this;
            var tAr = null;
            for (var i = 0; i < self.text.length; i++)
            {
                tAr = self.text[i];
                for (var j = 0; j < tAr.length; j++)
                {
                    if (tAr[j].text === text)
                        return tAr[j];
                }
            }
            return null;
        },

        imageActorBySource: function(image,autoLoad)
        {
            var self = this;
            if (autoLoad)
            {
                image = g_loader.getResult(image);
            }
            var testSrc = typeof image === 'string';

            if (self.backgroundImg)
            {
                if (!testSrc)
                {
                    if (self.backgroundImg.backgroundImage.image === image)
                        return self.backgroundImg;
                }
                else
                {
                    if (self.backgroundImg.backgroundImage.image.src.search(image) !== -1)
                        return self.backgroundImg;
                }
            }

            var img = null;
            for (var i = 0; i < self.arImages.length; i++)
            {
                img = self.arImages[i];
                if (!testSrc)
                {
                    if (img.backgroundImage.image === image)
                        return img;
                }
                else
                {
                    if (img.backgroundImage.image.src.search(image) !== -1)
                        return img;
                }
            }

            return null;
        },

        cleanup: function(destroy)
        {
            console.log("cleaning up FancyButton");

            var self = this;
            self.emptyChildren();

            if (self.theButton.cleanup)
                self.theButton.cleanup(destroy);

            if (destroy)
            {
                self.setDiscardable(true);
                self.setExpired();
            }
        }

    };

    extend(FancyButton, CAAT.ActorContainer);
    exports.FancyButton = FancyButton;

})(typeof exports === 'undefined'? _modules['FancyButton']={} : exports);