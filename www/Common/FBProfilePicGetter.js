(function(exports){

    function FBProfilePicGetter()
    {
        return this;
    }

    FBProfilePicGetter.PIC_TYPE_SMALL = 0;
    FBProfilePicGetter.PIC_TYPE_NORMAL = 1;
    FBProfilePicGetter.PIC_TYPE_LARGE = 2;
    FBProfilePicGetter.PIC_TYPE_SQUARE = 3;

    FBProfilePicGetter.prototype =
    {
        profilePics : null,

        getPicture : function(userID, size, callback)
        {
            var self = this;

            // ignore if missing userId (email account)
            if (!userID || userID == -1)
                return;

            if (self.profilePics === null)
                self.profilePics = new Object();

            var url = '/' + userID + '/picture?type=';

            switch(size)
            {
                case FBProfilePicGetter.PIC_TYPE_SMALL:
                    url += 'small';
                    break;
                case FBProfilePicGetter.PIC_TYPE_NORMAL:
                    url += 'normal';
                    break;
                case FBProfilePicGetter.PIC_TYPE_LARGE:
                    url += 'large';
                    break;
                default:
                    url += 'square';
                    break;
            }

            if (typeof self.profilePics[userID] === 'undefined' || self.profilePics[userID][size] === null)
                FB.api(url, self._onReceivePicURL(userID, size, callback));
            else
                callback(self.profilePics[userID][size]);
        },

        _onReceivePicURL : function(userID, size, callback)
        {
            var self = this;

            return function(response)
            {
                var img = new Image();
                img.onload = function() { callback(self.profilePics[userID][size]); }
                img.onerror = function() { console.log("Failed to load profile pic for user " + userID); }
                img.src = response.data.url;

                if (typeof self.profilePics[userID] === 'undefined')
                {
                    var imgArray = new Array(4);
                    for (var i = 0; i < imgArray.length; i++)
                        imgArray[i] = null;

                    imgArray[size] = img;
                    self.profilePics[userID] = imgArray;
                }
                else
                {
                    self.profilePics[userID][size] = img;
                }
            }
        }
    };

    exports.FBProfilePicGetter = FBProfilePicGetter;

})(typeof exports === 'undefined'? _modules['FBProfilePicGetter']={} : exports);