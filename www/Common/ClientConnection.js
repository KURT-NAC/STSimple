(function(exports){
    "use strict";

    // modules
    var FSM = require('FSM').FSM;
    var ErrorCode = require('ErrorCode').ErrorCode;

    function ClientConnection()
    {
        return this;
    }

    ClientConnection.prototype =
    {
        constants : {
            'URL_CHANNEL' : 'http://api.funcini.com/channel.html',

            'URL' : {
                // user urls
                'USER' : 'http://api.funcini.com/user',
                'USER_INFO' : 'http://api.funcini.com/user/me',
                'SESSION' : 'http://api.funcini.com/user/session',

                // inventory urls
                'INVEN_SKUS' : 'http://api.funcini.com/inventory/skus',
                'INVEN_GET' : 'http://api.funcini.com/inventory/user/me',
                'INVEN_BUY' : 'http://api.funcini.com/inventory/user/me/buy',
                'INVEN_CONSUME' : 'http://api.funcini.com/inventory/user/me/consume',
                'INVEN_UNLOCK' : 'http://api.funcini.com/inventory/user/me/unlock',
                'INVEN_BUYLOCKED' : 'http://api.funcini.com/inventory/user/me/buylocked',

                'VERIFY_IAP_RECEIPT' : 'http://api.funcini.com/inventory/verify',
                'PUSH_DEVICE' : 'http://api.funcini.com/push/device',
                'PUSH_NUDGE' : 'http://api.funcini.com/push/nudge',

                'AWARD_DEFS' : 'http://api.funcini.com/awards/defs',
                'AWARD_STATUS' : 'http://api.funcini.com/awards/status',
                'AWARD_INCREMENT' : 'http://api.funcini.com/awards/increment',
                'AWARD_RESET' : 'http://api.funcini.com/awards/reset',
                'AWARD_BEST' : 'http://api.funcini.com/awards/best'
            }
        },

        isOnDevice : false,

        fsm : null,

        userId : null,
        userName : null,
        userInventory : null,
        sessionToken : null,
        isFacebook : false,

        friends : null,
        activeGames : null,
        game : null,

        inAppPurchaseQueue : null,
        pushNotifications : null,
        launchGameFromPushId : null,

        dailyReward : null,

        init : function(isOnDevice)
        {
            var self = this;

            // remember if we're on device or not
            self.isOnDevice = isOnDevice;

            // initialize facebook
            var options = {
                "appId": self.constants.APP_ID,
                "status": true
            };

            if (isOnDevice)
            {
                options.nativeInterface = CDV.FB;
            }
            else
            {
                options.channel  = true;
                options.channelUrl = self.constants.URL_CHANNEL;
                options.viewMode = "website";
            }
            FB.init(options);

            // subscribe to facebook events
            FB.Event.subscribe('auth.logout', function(response) { self._onFBLogout(response);});
            FB.Event.subscribe('auth.login', function(response) { self._onFBLogin(response);});

            // initialize FSM
            self.fsm = new FSM();
            self.fsm.addState('checkAuthentication', function(){self._enterCheckAuthentication();}, null, null );
            self.fsm.addState('notAuthenticated', function(){self._enterNotAuthenticated();}, null, null );
            self.fsm.addState('authenticated', function(){console.log("Authenticated!!!");}, null, null );
            self.fsm.addState('loggingIntoEmail', null, null, null);
            self.fsm.addState('loggingIntoFB', null, null, null);
            self.fsm.addState('creatingAccount', null, null, null);
            self.fsm.gotoState('checkAuthentication');

            self.inAppPurchaseQueue = new Array();
        },

        checkNetworkConnection : function()
        {
            var self = this;

            if (!self.isOnDevice)
                return true;

            if (navigator.network.connection.type === Connection.NONE ||
                navigator.network.connection.type === Connection.UNKNOWN)
            {
                console.log("Aborting call due to lack of network connection");

                if (g_game.genericDialog === null || !g_game.genericDialog.initialized)
                {
                    alert("A network connection is required to play");
                }
                else
                {
                    g_game.hideLoadingDialog();
                    g_game.showGenericDialog("Error", "A network connection is required to play", "OK", null, function(ok)
                        {
                            g_game.fsm.gotoState(g_game.GameStates.LoginPage);
                        });
                }
                return false;
            }

            return true;
        },

        isRunningFromFile : function()
        {
            var self = this;

            return !self.isOnDevice && window.location.protocol === 'file:';
        },

        getAccessTokenFromFileURL : function()
        {
            var idx = window.location.href.indexOf('?');
            if (idx >= 0)
                return window.location.href.substr(idx+1);
            else
                return null;
        },

        isAuthenticationPending : function()
        {
            var self = this;
            var current = self.fsm.currentState();
            return !(current === 'authenticated' || current === 'notAuthenticated');
        },

        isAuthenticated : function()
        {
            var self = this;
            var current = self.fsm.currentState();
            return (current === 'authenticated');
        },

        initPushNotifications : function()
        {
            var self = this;

            if (!(window.plugins && window.plugins.pushNotification))
            {
                console.log("No push plugin!");
                self.fsm.gotoState('authenticated');
                return;
            }

            self.pushNotifications = window.plugins.pushNotification;

            document.addEventListener('push-notification', function(event) {
                console.log('push-notification listener callback received');
            });

            self.pushNotifications.getPendingNotifications(function(notificationObjs) {
                console.log('getPendingNotifications:' + JSON.stringify(notificationObjs));

                if (notificationObjs.notifications.length > 0 && notificationObjs.notifications[0].pushType === 'nudge')
                {
                    self.launchGameFromPushId = notificationObjs.notifications[0].gameId;
                }
            });

            self.pushNotifications.registerDevice({alert:true, badge:true, sound:true}, function(status) {
                // if successful status is an object that looks like this:
                // {"type":"7","pushBadge":"1","pushSound":"1","enabled":"1","deviceToken":"blablahblah","pushAlert":"1"}
                console.log('registerDevice: ' + JSON.stringify(status));

                self.fsm.gotoState('authenticated');

                self.sendPushNotificationDeviceToken(status.deviceToken, function(err, response) {
                    if (err)
                        console.log('Error occurred uploading device token');
                });
            });

            self.clearLocalPushNotifications(); // launching the app, from a push or not, will clear everything in notification center
        },

        clearLocalPushNotifications : function()
        {
            var self = this;

            if (!self.isOnDevice)
                return;

            self.pushNotifications.cancelAllLocalNotifications(function() {
                console.log('Cleared all push notifications');
            });
        },

        getInventorySkuData : function(callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            $.ajax({
                'type': 'GET',
                'cache': false,
                'dataType': 'json',
                'url': self.constants.URL.INVEN_SKUS
            }).done(function(response){
                callback(null,response);
            });
        },

        getInventory : function(callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            $.ajax({
                'type': 'GET',
                'cache' : false,
                'url': self.constants.URL.INVEN_GET,
                'dataType': 'json',
                'data' : {'access_token' : self.sessionToken }
            }).done(function(response){
                if (response && response.data)
                    self.userInventory = response.data;
                else
                    self.userInventory = null;
                callback(null,response);
            });
        },

        clearInventory : function(callback)
        {
            var self = this;
            var now = new Date();

            if (!self.checkNetworkConnection())
                return;

            $.ajax({
                'type': 'DELETE',
                'cache' : false,
                'url': self.constants.URL.INVEN_GET,
                'dataType': 'json',
                'data' : {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken
                }
            }).done(function(response){
                if (response && response.data)
                    self.userInventory = response.data;
                else
                    self.userInventory = null;
                callback(null,response);
            });
        },

        buyInventory : function(sku,qty,callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache' : false,
                'url': self.constants.URL.INVEN_BUY,
                'dataType': 'json',
                'data' : {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'sku' : sku,
                    'qty' : qty
                }
            }).done(function(response){
                if (response)
                {
                    if (response.code === ErrorCode.OK.code)
                    {
                        self.userInventory = response.data;
                        callback(null,response.data);
                    }
                    else if (response.code === ErrorCode.NOT_ENOUGH_COINS)
                    {
                        callback(ErrorCode.NOT_ENOUGH_COINS);
                    }
                    else
                    {
                        callback(ErrorCode.UNKNOWN_ERROR);
                    }
                }
                else
                    callback(ErrorCode.UNKNOWN_ERROR);
            });

        },

        useInventory : function(sku,qty,callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache' : false,
                'url': self.constants.URL.INVEN_CONSUME,
                'dataType': 'json',
                'data' : {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'sku' : sku,
                    'qty' : qty
                }
            }).done(function(response){
                    if (response)
                    {
                        if (response.code === ErrorCode.OK.code)
                        {
                            self.userInventory = response.data;
                            callback(null,response.data);
                        }
                        else if (response.code === ErrorCode.NOT_ENOUGH_SKUS)
                        {
                            callback(ErrorCode.NOT_ENOUGH_SKUS);
                        }
                        else
                        {
                            callback(ErrorCode.UNKNOWN_ERROR);
                        }
                    }
                    else
                        callback(ErrorCode.UNKNOWN_ERROR);
                });

        },

        unlockInventory : function(sku,callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache': false,
                'url': self.constants.URL.INVEN_UNLOCK,
                'dataType': 'json',
                'data' : {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'sku' : sku
                }
            }).done(function(response){
                    if (response)
                    {
                        if (response.code === ErrorCode.OK.code)
                        {
                            self.userInventory = response.data;
                            callback(null,response.data);
                        }
                        else if (response.code === ErrorCode.NOT_ENOUGH_COINS)
                        {
                            callback(ErrorCode.NOT_ENOUGH_COINS);
                        }
                        else
                        {
                            callback(ErrorCode.UNKNOWN_ERROR);
                        }
                    }
                    else
                        callback(ErrorCode.UNKNOWN_ERROR);
                });

        },

        buyLockedInventory : function(sku,qty,callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache': false,
                'url': self.constants.URL.INVEN_BUYLOCKED,
                'dataType': 'json',
                'data' : {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'sku' : sku,
                    'qty' : qty
                }
            }).done(function(response){
                    if (response)
                    {
                        if (response.code === ErrorCode.OK.code)
                        {
                            self.userInventory = response.data;
                            callback(null,response.data);
                        }
                        else if (response.code === ErrorCode.NOT_ENOUGH_COINS)
                        {
                            callback(ErrorCode.NOT_ENOUGH_COINS);
                        }
                        else
                        {
                            callback(ErrorCode.UNKNOWN_ERROR);
                        }
                    }
                    else
                        callback(ErrorCode.UNKNOWN_ERROR);
                });

        },

        getAwardDefData : function(callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            $.ajax({
                'type': 'GET',
                'cache': false,
                'dataType': 'json',
                'url': self.constants.URL.AWARD_DEFS
            }).done(function(response){
                    callback(null,response);
                });
        },

        getAwardStatus : function(callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'GET',
                'cache': false,
                'url': self.constants.URL.AWARD_STATUS,
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'game' : self.constants.GAME
                }
            }).done(function(response){
                    callback(null,response);
                });
        },

        incrementAward : function(awardName, callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache': false,
                'url': self.constants.URL.AWARD_INCREMENT,
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'awardName' : awardName,
                    'game' : self.constants.GAME
                }
            }).done(function(response){
                    callback(null,response);
                });
        },

        resetAward : function(awardName, callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache': false,
                'url': self.constants.URL.AWARD_RESET,
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'awardName' : awardName,
                    'game' : self.constants.GAME
                }
            }).done(function(response){
                    callback(null,response);
                });
        },

        getBestAwardOwned : function(userId, count, callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'GET',
                'cache': false,
                'url': self.constants.URL.AWARD_BEST,
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'userId': userId,
                    'game' : self.constants.GAME,
                    'count' : count
                }
            }).done(function(response){
                    callback(null,response);
                });
        },

        createEmail : function(email,password,nickname,callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache' : false,
                'url': self.constants.URL.USER,
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'email' : email,
                    'passwd' : password,
                    'nick' : nickname,
                    'game' : self.constants.GAME
                }
            }).done(function(response){
                self._onCreateResponse(response,callback);
            });

            self.fsm.gotoState('loggingIntoEmail');
        },

        loginEmail : function(email,password,callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache' : false,
                'url': self.constants.URL.SESSION,
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'email' : email,
                    'passwd' : password,
                    'game' : self.constants.GAME
                }
            }).done(function(response){
                self._onLoginResponse(response,callback);
            });

            self.fsm.gotoState('loggingIntoEmail');
        },

        loginFacebook : function(callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            // Hack to login into facebook via local file
            if (self.isRunningFromFile())
            {
                var token = self.getAccessTokenFromFileURL();
                if (token)
                {
                    var result = { authResponse : { accessToken : token } };
                    self._onFBLogin(result,  callback);
                    return;
                }
            }

            // kick off facebook login process
            FB.login(
                function(response)
                {
                    self._onFBLogin(response, callback);
                },
                {
                    "scope": "email,publish_stream"
                });

            self.fsm.gotoState('loggingIntoFB');
        },

        logout : function()
        {
        },

        lookupEmail : function(email, callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache' : false,
                'url': self.constants.URL.GAME_EMAIL,
                'dataType':'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'email' : email
                }
            }).done(function(response){
                self._onLookupEmailResponse(response,callback);
            });
        },

        lookupUsername : function(nickname, callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache' : false,
                'url': self.constants.URL.GAME_NICKNAME,
                'dataType':'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'nickname' : nickname
                }
            }).done(function(response){
                self._onLookupEmailResponse(response,callback);
            });
        },

        getFriendsList : function(callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            $.ajax({
                'type': 'GET',
                'cache': false,
                'url': self.constants.URL.GAME_FRIENDS,
                'dataType': 'json',
                'data': { 'access_token' : self.sessionToken }
            }).done( function(response){
                self._onFriendsResponse(response,callback);
            });
        },

        getActiveGameList : function(callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            $.ajax({
                'type': 'GET',
                'cache' : false,
                'url': self.constants.URL.GAMES,
                'dataType': 'json',
                'data': { 'access_token': self.sessionToken }
            }).done(function(response){
                    self._onGameListResponse(response,callback);
                });
        },

        createGame : function(players, callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();
            $.ajax({
                'type': 'POST',
                'cache': false,
                'url': self.constants.URL.GAME,
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'players' : JSON.stringify(players)
                }
            }).done(function(response){
                self._onCreateGameResponse(response,callback);
            });
        },

        matchmakeGame : function(callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();
            $.ajax({
                'type': 'POST',
                'cache': false,
                'url': self.constants.URL.GAME_RANDOM,
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken
                }
            }).done(function(response){
                    self._onMatchmakeGameResponse(response,callback);
                });
        },

        deleteGame : function(gameId, callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();
            $.ajax({
                'type': 'DELETE',
                'cache' : false,
                'url': self.constants.URL.GAME_INFO.replace(':id', gameId),
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken
                }
            }).done(function(response){
                self._onCreateDeleteResponse(gameId,response,callback);
            });
        },

        loadGame : function(gameId, callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            // delete existing game if it exists
            if (self.game)
                delete self.game;

            $.ajax({
                'type': 'GET',
                'cache' : false,
                'url': self.constants.URL.GAME_INFO.replace(':id', gameId),
                'dataType': 'json',
                'data': { 'access_token' : self.sessionToken, 'r' : Math.random() }
            }).done(function(response){
                self._onLoadGameResponse(gameId,response,callback);
            });
        },

        turnGame : function(turnData, callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache' : false,
                'url': self.constants.URL.GAME_TURN.replace(':id', self.game.id),
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'turn' : JSON.stringify(turnData)
                }
            }).done(function(response){
                self._onTurnGameResponse(self.game.id,response,callback);
            });
        },

        sendInAppPurchaseReceipt : function(receipt, productId, callback)
        {
            var self = this;

            if (!self.isOnDevice)
            {
                callback(ErrorCode.NOT_SUPPORTED);
                return;
            }

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache' : false,
                'url': self.constants.URL.VERIFY_IAP_RECEIPT,
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'receipt-data' : receipt,
                    'productId' : productId
                }
            }).done(function(response){
                    self._onVerifyReceiptResponse(response,callback);
                });
        },

        queueInAppPurchaseReceipt : function(receipt, productId, callback)
        {
            var self = this;
            console.log("Resumed IAP transaction happening before login");

            self.inAppPurchaseQueue.push({ 'receipt' : receipt, 'productId' : productId, 'callback' : callback });
        },

        processQueuedInAppPurchaseReceipts : function()
        {
            var self = this;

            console.log("Processing queued IAP transactions");
            g_game.showLoadingDialog("Transacting...");

            while (self.inAppPurchaseQueue.length > 0)
            {
                var transaction = self.inAppPurchaseQueue.shift();
                self.sendInAppPurchaseReceipt(transaction.receipt, transaction.productId, transaction.callback);
            }
        },

        sendPushNotificationDeviceToken : function(token, callback)
        {
            var self = this;

            if (!self.isOnDevice)
            {
                callback(ErrorCode.NOT_SUPPORTED);
                return;
            }

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache' : false,
                'url': self.constants.URL.PUSH_DEVICE,
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'device_token' : token,
                    'game' : self.constants.GAME
                }
            }).done(function(response){
                    if (response.code === ErrorCode.OK.code)
                        callback(null);
                    else
                        callback(ErrorCode.UNKNOWN_ERROR);
                });
        },

        sendNudge : function(gameId, oppId, bNewGame, callback)
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                'type': 'POST',
                'cache' : false,
                'url': self.constants.URL.PUSH_NUDGE,
                'dataType': 'json',
                'data': {
                    '_' : now.getTime(),
                    'access_token' : self.sessionToken,
                    'opponent' : oppId,
                    'game_id' : gameId,
                    'nudge_type' : (bNewGame ? 'new' : 'nudge'),
                    'game' : self.constants.GAME
                }
            }).done(function(response){
                    console.log("returned from sendNudge");
                    if (response.code === ErrorCode.OK.code)
                        callback(null);
                    else
                        callback(ErrorCode.UNKNOWN_ERROR);
                });
        },

        pushNotifyNewGame : function()
        {
            var self = this;

            var oppId;

            if (self.game && self.game.turn === 1)
            {
                if (self.userId === self.game.players[0].id)
                    oppId = self.game.players[1].id;
                else
                    oppId = self.game.players[0].id;

                self.sendNudge(self.game.id, oppId, true, function(err, response) {
                    if (err)
                        console.log('Error occurred nudging opponent');
                });
            }
        },

        ///////////////////////////////////////////////////////////////////////
        // State Functions

        _enterCheckAuthentication : function()
        {
            var self = this;

            if (!self.checkNetworkConnection())
                return;

            if (sessionToken && sessionToken != '{{data.token}}')
            {
                self.isFacebook = true;
                self.sessionToken = sessionToken;
                $.ajax({
                    type: 'GET',
                    cache : false,
                    url: self.constants.URL.USER_INFO,
                    data: { 'access_token' : self.sessionToken },
                    dataType: 'json',
                    success: function(response){ self._onUserInfoResponse(response,null); }
                });
            }
            else
            {
                self.fsm.gotoState('notAuthenticated');
            }
        },

        _enterNotAuthenticated : function()
        {
            var self = this;
            self.userId  = null;
            self.userName = null;
            self.userInventory = null;
            self.sessionToken = null;
            self.isFacebook = false;
        },


        ///////////////////////////////////////////////////////////////////////
        // Event Handlers

        _onUserInfoResponse : function(response,callback)
        {
            var self = this;
            if (!response || response.code != ErrorCode.OK.code)
            {
                self.fsm.gotoState('notAuthenticated');
            }
            else
            {
                self.userId = response.data.id;
                self.userName = response.data.nickname || repsonse.data.email;
                self.fsm.gotoState('authenticated');
            }
        },

        _onCreateResponse : function(response, callback)
        {
            var self = this;

            self.fsm.gotoState('notAuthenticated');
            if (response && response.code === ErrorCode.OK.code)
            {
                callback(null);
            }
            else if (response && response.code === ErrorCode.ACCOUNT_ALREADY_EXISTS.code)
            {
                callback(ErrorCode.ACCOUNT_ALREADY_EXISTS);
            }
            else
            {
                callback(ErrorCode.UNKNOWN_ERROR);
            }
        },

        _onFBLogin : function(response, callback)
        {
            var self = this;

            if (!response || !response.authResponse || !response.authResponse.accessToken)
            {
                self.fsm.gotoState('notAuthenticated');
                return;
            }
            else
            {
                self.isFacebook = true;
                self.fsm.gotoState('loggingIntoFB');
            }

            if (!self.checkNetworkConnection())
                return;

            var now = new Date();

            $.ajax({
                type: 'POST',
                cache : false,
                url: self.constants.URL.SESSION,
                data: {
                    '_' : now.getTime(),
                    'token': response.authResponse.accessToken,
                    'game' : self.constants.GAME
                },
                dataType: 'json',
                success: function(response){ self._onLoginResponse(response,callback);}
            });
        },

        _onLoginResponse : function(response, callback)
        {
            var self = this;

            if (!response || response.code != ErrorCode.OK.code)
            {
                self.fsm.gotoState('notAuthenticated');
                if (callback)
                    callback(ErrorCode.ACCESS_DENIED);
            }
            else
            {
                self.userId = response.data.id;
                self.sessionToken = response.data.token;
                self.initPushNotifications();

                if (callback)
                    callback(null);
            }
        },

        _onFBLogout : function(response)
        {
            var self = this;
            self.fsm.gotoState('notAuthenticated');
        },

        _onLookupEmailResponse : function(response,callback)
        {
            var self = this;

            if (!response || response.code != ErrorCode.OK.code)
            {
                callback(ErrorCode.NOT_FOUND);
            }
            else
            {
                callback(response);
            }
        },

        _onFriendsResponse : function(response,callback)
        {
            var self = this;

            if (!response || response.code != ErrorCode.OK.code)
            {
                callback(ErrorCode.UNKNOWN_ERR,null);
            }
            else
            {
                self.friends = response.data;
                callback(null,self.friends);
            }
        },

        _onGameListResponse : function(response,callback)
        {
            var self = this;

            // reset cached values
            self.activeGames = [];
            self.game = null;

            if (!response)
            {
                callback(ErrorCode.UNKNOWN_ERR,null);
            }
            else if (response.code != ErrorCode.OK.code)
            {
                callback(response,null);
            }
            else
            {
                self.activeGames = response.data;
                self.dailyReward = response.dailyReward;

                if (self.isOnDevice && self.pushNotifications !== null)
                {
                    var nYourTurns = 0;

                    for (var i = 0; i < self.activeGames.length; i++)
                    {
                        var g = self.activeGames[i];
                        var seat;

                        if (self.isUserPlayerIdx(0, i))
                            seat = 0;
                        else if (self.isUserPlayerIdx(1, i))
                            seat = 1;
                        else
                            continue;

                        var playerTurn = g.turn % g.players.length;
                        if (playerTurn === seat)
                            nYourTurns++;
                    }

                    self.pushNotifications.setApplicationIconBadgeNumber(nYourTurns, function(status) {
                        console.log('setApplicationIconBadgeNumber: ' + JSON.stringify(status));
                    });

                    // set icon badges
                    if (self.pushNotifications)
                    {
                        self.pushNotifications.setApplicationIconBadgeNumber(nYourTurns, function(status) {
                            console.log('setApplicationIconBadgeNumber: ' + status);
                        });
                    }
                }

                callback(null,self.games);
            }
        },

        _onCreateGameResponse : function(response,callback)
        {
            var self = this;

            if (!response)
            {
                callback(ErrorCode.UNKNOWN_ERR,null);
            }
            else if (response.code != ErrorCode.OK.code)
            {
                callback(response,null);
            }
            else
            {
                self.activeGames.push( response.data );
                callback(null,response.data);
            }
        },

        _onMatchmakeGameResponse : function(response,callback)
        {
            var self = this;

            if (!response)
            {
                callback(ErrorCode.UNKNOWN_ERR,null);
            }
            else if (response.code != ErrorCode.OK.code)
            {
                callback(response,null);
            }
            else
            {
                self.activeGames.push( response.data );
                callback(null,response.data);
            }
        },

        _onCreateDeleteResponse : function(gameId,response,callback)
        {
            var self = this;

            if (!response)
            {
                callback(ErrorCode.UNKNOWN_ERR,null);
            }
            else if (response.code != ErrorCode.OK.code)
            {
                callback(response,null);
            }
            else
            {
                // remove game from active list
                for (var i = self.activeGames.length - 1; i >= 0; i--)
                {
                    if (self.activeGames[i].id === gameId)
                    {
                        self.activeGames.splice(i,1);
                        break;
                    }
                }

                // delete current game if a match
                if (self.game && self.game.id === gameId)
                    delete self.game;

                callback(null,response);
            }
        },

        _onLoadGameResponse : function(gameId,response,callback)
        {
            var self = this;

            if (!response)
            {
                callback(ErrorCode.UNKNOWN_ERR,null);
            }
            else if (response.code != ErrorCode.OK.code)
            {
                callback(response,null);
            }
            else
            {
                if (!self.game || self.game.id == response.data.id)
                    self.game = response.data;
                callback(null,self.game);
            }
        },

        _onTurnGameResponse : function(gameId,response,callback)
        {
            var self = this;

            if (!response)
            {
                console.log("Error <no data> >processing turn!");
                callback(ErrorCode.UNKNOWN_ERR,null);
            }
            else if (response.code != ErrorCode.OK.code)
            {
                console.log("Error processing turn!");
                callback(response,null);
            }
            else
            {
                if (self.game)
                {
                    if (self.game.id === response.data.id)
                    {
                        self.game = response.data;
                    }
                    else
                    {
                        console.log('Unexpected mismatch, old(' + self.game.id + ") vs new(" +response.data.id + ")");
                        self.game = response.data;
                    }
                }
                else
                {
                    self.game = response.data;
                }

                callback(null,self.game);
            }
        },

        _onVerifyReceiptResponse : function(response, callback)
        {
            var self = this;

            if (!response || response.code != ErrorCode.OK.code)
            {
                if (response.code === ErrorCode.RECEIPT_ALREADY_EXISTS.code)
                {
                    console.log("Duplicate receipt. Closing IAP transaction. Id = " + response.transactionId);
                    window.plugins.inAppPurchaseManager.finishTransaction(response.transactionId);
                }

                callback(response.code,null);
            }
            else
            {
                self.userInventory = response.data;
                console.log("Transaction successful. Closing Id = " + response.transactionId);
                window.plugins.inAppPurchaseManager.finishTransaction(response.transactionId);
                callback(null);
            }
        },

        ////////////////////////////
        // Game Helper functions

        isMyTurn : function(gameIdx)
        {
            var self = this;

            var curGame = (typeof gameIdx === 'undefined' ? self.game : self.activeGames[gameIdx]);
            if (!curGame)
                return false;

            var turn = curGame.turn % curGame.players.length;
            return (self.getUserPlayerIdx() === turn);
        },

        isUserPlayerIdx : function(idx, gameIdx)
        {
            var self = this;

            var curGame = (typeof gameIdx === 'undefined' ? self.game : self.activeGames[gameIdx]);

            if (!curGame || idx < 0 || idx > 1)
                return false;

            if (curGame.pending)
                return true;

            return self.userId === curGame.players[idx].id;
        },

        getUserPlayerIdx : function()
        {
            var self = this;
            return self.isUserPlayerIdx(0) ? 0 : 1;
        },

        getOpponentPlayerIdx : function()
        {
            var self = this;
            return self.isUserPlayerIdx(0) ? 1 : 0;
        }
    };

    exports.ClientConnection = ClientConnection;

})(typeof exports === 'undefined'? _modules['ClientConnection']={} : exports);