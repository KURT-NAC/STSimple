(function(exports){

    // Debugging and Development flags
    var FORCE_LOCAL_SERVER = true;

    // modules
    var ErrorCode = require('ErrorCode').ErrorCode;
    var ClientConnection = require('ClientConnection').ClientConnection;

    var Constants = {
        // facebook
        'APP_ID' : '423019514406757',

        // general
        'GAME' : "puzzlepix2",

        'URL' : {

            // game urls
            'GAME' : 'http://api.funcini.com/game/puzzlepix2',
            'GAMES' : 'http://api.funcini.com/game/puzzlepix2/user/me/games',
            'GAME_FRIENDS' : 'http://api.funcini.com/game/puzzlepix2/user/me/friends',
            'GAME_INFO' : 'http://api.funcini.com/game/puzzlepix2/:id',
            'GAME_TURN' : 'http://api.funcini.com/game/puzzlepix2/:id/turn',
            'GAME_UPLOAD' : 'http://api.funcini.com/game/puzzlepix2/:id/upload',
            'GAME_EMAIL' : 'http://api.funcini.com/game/puzzlepix2/user/email',
            'GAME_NICKNAME' : 'http://api.funcini.com/game/puzzlepix2/user/nickname',

            // media urls
            'PICTURE_UPLOAD' : 'http://api.funcini.com/pic'
        }
    };

    function PuzzleClientConnection()
    {
        PuzzleClientConnection.superclass.constructor.call(this);
        return this;
    }

    PuzzleClientConnection.prototype =
    {

        init : function(isOnDevice)
        {
            var self = this;

            // merge constants
            $.extend(true, self.constants, Constants);

            // swap live URLs with localhost:3000 during development
            if (FORCE_LOCAL_SERVER)
            {
                for (key in self.constants.URL)
                {
                    if (typeof key === 'string')
                    {
                        self.constants.URL[key] = self.constants.URL[key].replace('api.funcini.com','localhost:3000');
                    }
                }
            }

            // chain to parent
            PuzzleClientConnection.superclass.init.call(self,isOnDevice);
        },

        uploadPicture : function(fileURI,note,callback)
        {
            var self = this;

            // this only works on PhoneGap
            if (!self.isOnDevice){
                return callback(ErrorCode.NOT_SUPPORTED,null);}

            if (!self.checkNetworkConnection())
                return;

            // first step is to get an upload token based on the game state
            $.ajax({
                'type': 'GET',
                'cache' : false,
                'url': self.constants.URL.GAME_UPLOAD.replace(':id', self.game.id),
                'dataType': 'json',
                'data': { 'access_token' : self.sessionToken }
            }).done(function(response){
                self._onUploadToken(response,fileURI,note,callback);
            });
        },

        _onUploadToken : function(response, fileURI, note, callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            // early out on error
            if (!response || response.code != ErrorCode.OK.code)
                return callback(response,null);

            // upload video file to server
            var options = new FileUploadOptions();
            options.fileKey = 'file';
            options.fileName = fileURI.substr(fileURI.lastIndexOf('/')+1);
            options.mimeType = 'image/jpeg';
            options.params = {
                'upload_token' : response.data.upload_token,
                'proxy_turn' : self.constants.GAME,
                'turn_note' : note
            };
            var ft = new FileTransfer();
            ft.upload(fileURI, self.constants.URL.PICTURE_UPLOAD, self._onUploadSuccess(callback), self._onUploadFail(callback), options );
        },

        _onUploadFail : function(callback)
        {
            var self = this;
            return function(error)
            {
                self.owner.showGenericDialog("Error", 'upload failed', "OK");
                callback(ErrorCode.UNKNOWN_ERROR);
            }
        },

        _onUploadSuccess : function(callback)
        {
            var self = this;
            return function(result)
            {
                // process post results
                var tmp = decodeURI(result.response);
                var response = JSON.parse(tmp);
                if (!response || !response.data || !response.data.game)
                    return callback(ErrorCode.UNKNOWN_ERROR);

                // update game state
                if (!self.game || self.game.id == response.data.game.id)
                    self.game = response.data.game;

                callback(null,self.game);
            }
        }
    };

    extend(PuzzleClientConnection, ClientConnection, null);

    exports.PuzzleClientConnection = PuzzleClientConnection;

})(typeof exports === 'undefined'? _modules['PuzzleClientConnection']={} : exports);