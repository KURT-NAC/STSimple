(function(exports){

    function RatingObject()
    {
        RatingObject.superclass.constructor.call(this, CAAT.ActorContainer.AddHint.CONFORM);

        if (!RatingObject.JSON_LOADED)
        {
            g_layout.mergePage('main', 'ratingObject', g_loader.getResult('ratingObjectLayout'));

            RatingObject.JSON_LOADED = true;
        }

        this.init();
        return this;
    }

    RatingObject.addResourcesToManifest = function(manifest)
    {
        manifest.ratingObjectLayout = "Common/RatingObject/ratingobject.json";

        if (typeof manifest.starGold === 'undefined')
            manifest.starGold = "Common/RatingObject/rate_stargold.png";
        if (typeof manifest.starGrey === 'undefined')
            manifest.starGrey = "Common/RatingObject/rate_stargrey.png";
    }

    RatingObject.JSON_LOADED = false;

    RatingObject.prototype =
    {
        starsGold: [],
        starsGrey: [],
        locked: false,
        curValue: 0,

        init : function()
        {
            var self = this;

            g_layout.addAllElementsToObject(self, "main", "ratingObject");

            // setup star buttons
            self.starsGold = [];
            self.starsGrey = [];

            var t = g_layout.getActorFromArrayByID(self.childrenList, "starGrey", true);
            for (var i = 0; i < 5; i++)
                self.starsGrey.push(t[i]);

            var actor = null;
            t = g_loader.getResult('starGold');
            for (var i = 0; i < self.starsGrey.length; i++)
            {
                actor = self.starsGrey[i];

                self.starsGold.push(
                    (new CAAT.Actor()).
                        setBackgroundImage(t, true).
                        setPositionAnchored(actor.x, actor.y, actor.tAnchorX, actor.tAnchorY).
                        setRotationAnchored(actor.rotationAngle, actor.rotationX, actor.rotationY)
                );

                self.starsGold[i].enableEvents(true).mouseDown = self._disableStarsTo(i);
                actor.enableEvents(true).mouseDown = self._enableStarsTo(i);

                self.starsGold[i].added = false;
            }

            self.enableEvents(true);
            return self;
        },

        lock : function(bLock)
        {
            var self = this;
            self.locked = bLock;
            return self;
        },

        getValue : function()
        {
            var self = this;
            return self.curValue;
        },

        setStars : function(index)
        {
            var self = this;

            self.curValue = index;
            var i;

            for (i = 0; i < self.starsGold.length; i++)
            {
                a = self.starsGold[i];
                if (a.added)
                {
                    self.removeChild(a);
                    a.setParent(null);
                    a.added = false;
                }
            }

            for (i = 0; i <= index-1; i++)
            {
                a = self.starsGold[i];
                if (!a.added)
                {
                    self.addChildAt(a, self.childrenList.indexOf(self.starsGrey[i])+1);
                    a.added = true;
                }
            }

            return self;
        },

        _enableStarsTo : function(index)
        {
            var self = this;
            var i, a;
            return function(event)
            {
                if (self.locked)
                    return;

                self.curValue = index+1;

                for (i = 0; i <= index; i++)
                {
                    a = self.starsGold[i];
                    if (!a.added)
                    {
                        self.addChildAt(a, self.childrenList.indexOf(self.starsGrey[i])+1);
                        a.added = true;
                    }
                }
            }
        },

        _disableStarsTo : function(index)
        {
            var self = this;
            var i, a;
            return function(event)
            {
                if (self.locked)
                    return;

                self.curValue = index+1;

                for (i = self.starsGold.length-1; i > index ; i--)
                {
                    a = self.starsGold[i];
                    if (a.added)
                    {
                        self.removeChild(a);
                        a.setParent(null);
                        a.added = false;
                    }
                }
            }
        }
    };

addGameWidget('RatingObject', RatingObject);

extend(RatingObject, CAAT.ActorContainer);
exports.RatingObject = RatingObject;

})(typeof exports === 'undefined'? _modules['RatingObject']={} : exports);
