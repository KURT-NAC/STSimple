(function(exports){

    function ThreeSliceActor()
    {
        ThreeSliceActor.superclass.constructor.call(this);
        return this;
    }

    ThreeSliceActor.BUTTON_NORMAL = 0;
    ThreeSliceActor.BUTTON_OVER = 1;
    ThreeSliceActor.BUTTON_PRESSED = 2;
    ThreeSliceActor.BUTTON_DISABLED = 3;

    ThreeSliceActor.prototype =
    {
        bar: null,
        capL: null,
        capR: null,

        totalWidth: 0,

        progress: 0.0,
        pbScaleStart: 1.0,
        pbXStart: 0,
        pbWStart: 0,

        ////////////////////////////////////////////////
        // Custom methods
        /*
        * Optional
        * img - Sprite Sheet  (optional if capL, bar and capR are used and are images, required if the button states are used)
        * map - map for above (optional)
        *
        * ONE of the following sets of data is required
        * {
            * capL -
             *      init w/ img && map  - map obj name
             *      init w/ img         - integer index into sprite sheet
             *      init w/o img || map - bg image for left cap
            * bar -
             *      init w/ img && map  - map obj name
             *      init w/ img         - integer index into sprite sheet
             *      init w/o img || map - bg image for bar
            * capR -
             *      init w/ img && map  - map obj name
             *      init w/ img         - integer index into sprite sheet
             *      init w/o img || map - bg image for right cap
        * }
        * OR
        * {
            * Normals   - comma delimited string describing indexes into the sprite sheet for the normal button state
        * }
        *
        * Optional if using the second set or required data
            * Overs     - comma delimited string describing indexes into the sprite sheet for the mouse over button state (integer or map obj)
            * Presseds  - comma delimited string describing indexes into the sprite sheet for the pressed button state (integer or map obj)
            * Disableds - comma delimited string describing indexes into the sprite sheet for the disabled button state (integer or map obj)
            * fn        - a call back function to call when the button is pressed
        * */
        initializeWithObject: function(init,forceCache)
        {
            if (!init)
                throw new Error("Cannot init 3 slice from NULL object");

            var self = this;

            init['map'] = init['map']||null;
            if (init['Normals'])
            {
                if (!init['img'])
                    throw new Error("a source image is required when creating a 3 slice button");

                init['Overs'] = init['Overs']||null;
                init['Presseds'] = init['Presseds']||null;
                init['Disableds'] = init['Disableds']||null;
                init['fn'] = init['fn']||null;

                self.setAsButton(init['img'], init['map'], init['Normals'], init['Overs'], init['Presseds'], init['Disableds'], init['fn']);
            }
            else
            {
                if (!init['capL'] || !init['bar'] || !init['capR'])
                    throw new Error("capL, bar and capR are required in some fashion when creating a 3 slice");

                if (init['img'])
                    self.initializeFromSpriteSheet(init['img'], init['map'], init['capL'], init['bar'], init['capR'],forceCache);
                else
                    self.initializeFromImages(init['capL'], init['bar'], init['capR'],forceCache);
            }

            return self;
        },

        initializeFromImages: function (capL,bar,capR,forceCache)
        {
            if (!bar || !capL)
                throw new Error("ThreeSliceActor initalized with NULL"+(!bar ? " bar" : "")+(!capL ? " capL" : ""));

            var self = this;
            self.create();

            // mirror the left cap if nothing is provided or we've been explicitly told to
            var flipCap = (capR === undefined || capR === null);
            if (flipCap)
                capR = capL;

            self.capL.setBackgroundImage(capL,true).
                      enableEvents(false);
            self.bar.setBackgroundImage(bar,true).
                      enableEvents(false);
            self.capR.setBackgroundImage(capR,true).
                      enableEvents(false);
            if (flipCap)
                self.capR.setImageTransformation(CAAT.SpriteImage.prototype.TR_FLIP_HORIZONTAL);

            self.calcWidth();
            if (forceCache)
                self.cacheAsBitmap();

            return self;
        },

        initializeFromSpriteSheet: function(img,map,capL,bar,capR,forceCache)
        {
            var self = this;
            self.create();

            if (!img || !bar || !capL)
                throw new Error("ThreeSliceActor (Sprite) initalized with NULL"+
                                (!img ? " sprite sheet" : "")+
                                (!bar ? " bar" : "")+(!capL ? " capL" : ""));

            // mirror the left cap if nothing is provided or we've been explicitly told to
            var flipCap = (capR === undefined || capR === null);
            if (flipCap)
                capR = capL;

            var autoSize = map === null;
            self.capL.setBackgroundImage(img, autoSize).
                enableEvents(false);
            self.bar.setBackgroundImage(img, autoSize).
                enableEvents(false);
            self.capR.setBackgroundImage(img, autoSize).
                enableEvents(false);
            if (flipCap)
                self.capR.setImageTransformation(CAAT.SpriteImage.prototype.TR_FLIP_HORIZONTAL);

            if (map)
            {
                self.capL.backgroundImage.initializeFromMap(img, map);
                self.bar.backgroundImage.initializeFromMap(img, map);
                self.capR.backgroundImage.initializeFromMap(img, map);
            }

            self.capL.setSpriteIndex(capL);
            self.bar.setSpriteIndex(bar);
            self.capR.setSpriteIndex(capR);

            if (!autoSize)
            {
                self.capL.setSize(self.capL.backgroundImage.getWidth(), self.capL.backgroundImage.getHeight());
                self.bar.setSize(self.bar.backgroundImage.getWidth(), self.bar.backgroundImage.getHeight());
                self.capR.setSize(self.capR.backgroundImage.getWidth(), self.capR.backgroundImage.getHeight());
            }

            self.calcWidth();
            if (forceCache)
                self.cacheAsBitmap();

            return self;
        },

        setAsProgressBar: function(alignment)
        {
            var self = this;

            self.pbScaleStart = self.bar.scaleX;
            self.pbWStart = self.bar.width;
            self.pbXStart = self.bar.x;
            var anchor = this.getAnchorPercent(alignment);
            self.setPositionAnchor(anchor.x, anchor.y);
            self.setPosition(self.x+(self.width*anchor.x), self.y+(self.height*anchor.y));
            self.calcWidth();

            return self;
        },

        setProgress: function(progress)
        {
            var self = this;

            // Bounds check amount
            self.progress = Math.max(0.0, Math.min(1.0, progress));

            // Scale
            self.bar.setScale(self.progress * self.pbScaleStart, self.bar.scaleY);
            self.calcWidth();

            return self;
        },

        ////////////////////////////////////////////////
        // Overloaded methods
        setSize: function(width,height)
        {
            var self = this;
            self.bar.setScale(self.barWidthFromTotal(width)/self.bar.width, height/self.bar.height);
            self.capL.setScale(1, height/self.bar.height);
            self.capR.setScale(1, height/self.bar.height);
            self.calcWidth();// this will call the superclass setSize
            return self;
        },

        setAsButton : function(buttonImage, map, Normals, Overs, Presseds, Disableds, fn)
        {
            var self = this;
            self.create();

            if (map === null)
            {
                Normals = Normals||"0,0,0";
                self.iNormals = self.intArrayFromString(Normals);
                self.iOvers =   Overs ? self.intArrayFromString(Overs) : self.iNormals;
                self.iPresseds =Presseds ? self.intArrayFromString(Presseds) : self.iNormals;
                self.iDisableds=Disableds ? self.intArrayFromString(Disableds) : self.iNormals;
            }
            else
            {
                self.iNormals = Normals.split(',');
                self.iOvers =   Overs ? Overs.split(',') : self.iNormals;
                self.iPresseds =Presseds ? Presseds.split(',') : self.iNormals;
                self.iDisableds=Disableds ? Disableds.split(',') : self.iNormals;
            }
            self.fnOnClick=     fn||null;
            self.enabled=       true;

            if (buttonImage !== null)
                self.initializeFromSpriteSheet(buttonImage, map, self.iNormals[0], self.iNormals[1], self.iNormals[2]);

            // default to normal
            self.setButtonState(ThreeSliceActor.BUTTON_NORMAL);

            // below is taken and modified from CAAT.Actor.setAsButton()
            /**
             * Enable or disable the button.
             * @param enabled {boolean}
             * @ignore
             */
            self.setEnabled= function( enabled ) {
                self.enabled= enabled;
                self.setButtonState(self.enabled ? ThreeSliceActor.BUTTON_NORMAL : ThreeSliceActor.BUTTON_DISABLED);
                return self;
            };

            /**
             * This method will be called by CAAT *before* the mouseUp event is fired.
             * @param event {CAAT.MouseEvent}
             * @ignore
             */
            self.actionPerformed= function(event) {
                if ( self.enabled && null!==self.fnOnClick ) {
                    self.fnOnClick(self);
                }
            };

            /**
             * Button's mouse enter handler. It makes the button provide visual feedback
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            self.mouseEnter= function(mouseEvent) {
                if ( !self.enabled ) {
                    return;
                }

                if ( self.dragging ) {
                    self.setButtonState(ThreeSliceActor.BUTTON_PRESSED);
                } else {
                    self.setButtonState(ThreeSliceActor.BUTTON_OVER);
                }
                CAAT.setCursor('pointer');
            };

            /**
             * Button's mouse exit handler. Release visual apperance.
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            self.mouseExit= function(mouseEvent) {
                if ( !self.enabled ) {
                    return;
                }

                //this.setSpriteIndex( this.iNormal );
                self.setButtonState(ThreeSliceActor.BUTTON_NORMAL);
                CAAT.setCursor('default');
            };

            /**
             * Button's mouse down handler.
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            self.mouseDown= function(mouseEvent) {
                if ( !self.enabled ) {
                    return;
                }

                self.setButtonState(ThreeSliceActor.BUTTON_PRESSED);
            };

            /**
             * Button's mouse up handler.
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            self.mouseUp= function(mouseEvent) {
                if ( !self.enabled ) {
                    return;
                }

                self.setButtonState(ThreeSliceActor.BUTTON_NORMAL);
                self.dragging= false;
            };

            /**
             * Button's mouse click handler. Do nothing by default. This event handler will be
             * called ONLY if it has not been drag on the button.
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            self.mouseClick= function(mouseEvent) {
            };

            /**
             * Button's mouse drag handler.
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            self.mouseDrag= function(mouseEvent)  {
                if ( !self.enabled ) {
                    return;
                }

                self.dragging= true;
            };

            self.setButtonImageIndex= function(_normals, _overs, _presss, _disableds ) {
                Normals = Normals||"0,0,0";
                self.iNormals = self.intArrayFromString(Normals);
                self.iOvers =   Overs ? self.intArrayFromString(Overs) : self.iNormals;
                self.iPresseds =Presseds ? self.intArrayFromString(Presseds) : self.iNormals;
                self.iDisableds=Disableds ? self.intArrayFromString(Disableds) : self.iNormals;
                self.setButtonState(ThreeSliceActor.BUTTON_NORMAL);
                return self;
            };

            return self;
        },

        ////////////////////////////////////////////////
        // Helper methods
        calcWidth: function()
        {
            var self = this;
            self.totalWidth = Math.ceil(self.capL.width+(self.bar.width*self.bar.scaleX)+this.capR.width);
            var oddPixel = self.totalWidth % 2;
            self.totalWidth += oddPixel; // Make sure the width is even
            ThreeSliceActor.superclass.setSize.call(self, self.totalWidth, self.bar.height);
            self.setBounds(self.x, self.y, self.totalWidth, self.height);// NOTE: this call seems to prevent rounding errors

            // NOTE: this assumes height is identical across all slices
            self.capL.setPosition(0, 0);
            self.capR.setPosition(self.width-(self.capR.width + oddPixel), 0);
            var mid = self.capL.width + ((self.bar.width*self.bar.scaleX)*0.5);
            self.bar.centerAt(mid, self.height*0.5);
        },

        barWidthFromTotal: function(width)
        {
            var self = this;
            width = width||self.totalWidth;
            var wl = (!self.capL || !self.capL.width) ? 0 : self.capL.width;
            var wr = (!self.capR || !self.capR.width) ? 0 : self.capR.width;
            return width-wl-wr;
        },

        intArrayFromString: function(array, split)
        {
            if (typeof array !== "string")
                throw new Error("Cannot split a non-string Object");
            split = split||',';
            var sArray = array.split(split);
            var iArray = [];
            for (var i = 0; i < sArray.length; i++)
                iArray[i] = parseInt(sArray[0]);
            return iArray;
        },

        setButtonState: function(state)
        {
            var self = this;

            if (!self.capL || !self.capR)
                return;

            var array = null;
            switch (state)
            {
                case ThreeSliceActor.BUTTON_NORMAL:
                    array = self.iNormals;
                    break;

                case ThreeSliceActor.BUTTON_OVER:
                    array = self.iOvers;
                    break;

                case ThreeSliceActor.BUTTON_PRESSED:
                    array = self.iPresseds;
                    break;

                case ThreeSliceActor.BUTTON_DISABLED:
                    array = self.iDisableds;
                    break;
            }

            if (self.capL.backgroundImage.mapInfo[array[0]] != null)
                self.capL.setSpriteIndex(array[0]);
            if (self.bar.backgroundImage.mapInfo[array[1]] != null)
                self.bar.setSpriteIndex(array[1]);
            if (self.capR.backgroundImage.mapInfo[array[2]] != null)
                self.capR.setSpriteIndex(array[2]);
        },

        create: function()
        {
            var self = this;
            if (self.bar === null)
            {
                self.bar = new CAAT.Actor();
                self.capL = new CAAT.Actor();
                self.capR = new CAAT.Actor();
                self.addChild(self.capL).addChild(self.bar).addChild(self.capR);
            }
        },

        cleanup: function(destroy)
        {
            console.log("cleaning up three slice");

            var self = this;
            self.emptyChildren();

            self.capL.setParent(null);
            self.bar.setParent(null);
            self.capR.setParent(null);

            self.capL.setDiscardable(true);
            self.bar.setDiscardable(true);
            self.capR.setDiscardable(true);

            self.capL.setExpired();
            self.bar.setExpired();
            self.capR.setExpired();

            self.capL = null;
            self.bar = null;
            self.capR = null;

            self.fnOnClick = null;
            self.setEnabled = function(enabled){};
            self.actionPerformed = function(evt){};
            self.mouseEnter = function(evt){};

            if (destroy)
            {
                self.setDiscardable(true);
                self.setExpired();
            }
        }
    };

    extend(ThreeSliceActor, CAAT.ActorContainer);
    exports.ThreeSliceActor = ThreeSliceActor;

})(typeof exports === 'undefined'? _modules['ThreeSliceActor']={} : exports);