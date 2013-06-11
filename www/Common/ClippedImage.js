(function(exports){

    function ClippedImage()
    {
        ClippedImage.superclass.constructor.call(this);
        return this;
    }

    ClippedImage.prototype =
    {
        clipOffsetX : 0,
        clipOffsetY : 0,
        clipWidth : 0,
        clipHeight : 0,

        init : function(image)
        {
            var self = this;
            self.setBackgroundImage(image, true);
            return self;
        },

        setClipInfo : function(cX, cY, cW, cH)
        {
            var self = this;
            self.clipOffsetX = cX || 0;
            self.clipOffsetY = cY || 0;
            self.clipWidth = cW || 0;
            self.clipHeight = cH || 0;
            return self;
        },

        // override Actor paint
        paint : function(director, time)
        {
            var self = this;

            if (self.backgroundImage)
            {
                director.ctx.drawImage(self.backgroundImage.image,
                    self.clipOffsetX, self.clipOffsetY, self.clipWidth, self.clipHeight,
                    self.clipOffsetX, self.clipOffsetY, self.clipWidth, self.clipHeight);
            }
        }
    };

    extend(ClippedImage, CAAT.Actor);
    exports.ClippedImage = ClippedImage;

})(typeof exports === 'undefined'? _modules['ClippedImage']={} : exports);