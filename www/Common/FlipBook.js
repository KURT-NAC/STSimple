(function(exports){
    "use strict";

    function FlipBook()
    {
        FlipBook.superclass.constructor.call(this);
        return this;
    }

    FlipBook.prototype =
    {
        animData: null,

        init : function(image, animData)
        {
            var self = this;

            self.animData = g_loader.getResult(animData);

            if (!self.animData)
                return;

            var animSprite = new CAAT.SpriteImage();
            animSprite.initialize(g_loader.getResult(image), self.animData.rows, self.animData.cols);
            self.setBackgroundImage(animSprite.getRef(), true).setSpriteIndex(0);

            self.backgroundImage.setSpriteIndexAtTime = self._setSpriteIndexAtTime();
            self.setSpriteIndex(0);

            if (typeof self.animData.position !== 'undefined')
            {
                var pos = self.animData.position;
                self.setPositionAnchored(pos.x, pos.y, pos.regX, pos.regY);
            }

            return self;
        },

        _setSpriteIndexAtTime : function()
        {
            var self = this;

            return function(time)
            {
                if ( self.backgroundImage.animationImageIndex.length>1 )
                {
                    if ( self.backgroundImage.prevAnimationTime===-1 )
                    {
                        self.backgroundImage.prevAnimationTime= time;
                        self.backgroundImage.spriteIndex=0;
                    }
                    else
                    {
                        var ttime= time;
                        ttime-= self.backgroundImage.prevAnimationTime;
                        ttime/= self.backgroundImage.changeFPS;
                        ttime%= self.backgroundImage.animationImageIndex.length;

                        var nextIdx = self.backgroundImage.animationImageIndex[Math.floor(ttime)];
                        if (nextIdx ===-1)
                            self.backgroundImage.animationImageIndex = [ self.backgroundImage.spriteIndex ];
                        else
                            self.backgroundImage.spriteIndex= nextIdx;
                    }
                }
            }
        },

        play : function()
        {
            var self = this;

            if (!self.animData)
                return;

            self.backgroundImage.setAnimationImageIndex(self.animData.sequence)
                .setChangeFPS(1000/self.animData.fps);

            return self;
        }
    };

    extend(FlipBook, CAAT.Actor);
    exports.FlipBook = FlipBook;

})(typeof exports === 'undefined'? _modules['FlipBook']={} : exports);
