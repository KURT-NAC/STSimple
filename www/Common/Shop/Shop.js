(function(exports){
    "use strict";
    var Store = require('Store').Store;

    function Shop(owner,director)
    {
        this.init(owner,director);
    }

    Shop.prototype =
    {
        div: null,
        owner : null,
        scene : null,
        prevDirector: null,
        callback: null,
        scrollView: null,
        frontEndSkus: null,
        bannerTitle: null,
        bannerText: null,
        bannerCoin: null,
        backButton: null,
        thePackage: null,
        selSkuIdx: null,

        active : false,

        /////////////////////

        init : function(owner, director, scene)
        {
            var self = this;

            if (owner === null || director === null)
            {
                throw new Error("Scene initiated with NULL" +
                    (owner === null ? " Owner" : "") +
                    (director == null ? " Director" : ""));
            }

            self.owner = owner;
            self.director = director;
            self.scene = scene||(director === null ? null : director.createScene());
            if (self.scene === null)
                throw new Error("Scene state created with NULL scene");

            // scroll view
            self.scrollView =  require('ScrollViewFactory').ScrollViewFactory();

            if (window.plugins && window.plugins.inAppPurchaseManager)
            {
                // in-app purchasing callbacks
                window.plugins.inAppPurchaseManager.onPurchased = self._onInAppPurchased();
                window.plugins.inAppPurchaseManager.onRestored = self._onInAppRestored();
                window.plugins.inAppPurchaseManager.onFailed = self._onInAppFailed();
            }
        },

        addToManifest : function(manifest)
        {
            manifest.shopMainLayout = "Common/Shop/shop_main_view.json";
            manifest.shopSubLayout = "Common/Shop/shop_sub_view_" + g_game.platform + ".json";

            if (typeof manifest.crossIcon === 'undefined')
                manifest.crossIcon = "Common/Shop/xicon.png";
            if (typeof manifest.stockIcon === 'undefined')
                manifest.stockIcon = "Common/Shop/stockicon.png";
            if (typeof manifest.themeIcon === 'undefined')
                manifest.themeIcon = "Common/Shop/themeicon.png";
            if (typeof manifest.hintIcon === 'undefined')
                manifest.hintIcon = "Common/Shop/puzzleicon.png";   // usually overridden
            if (typeof manifest.lifelineIcon === 'undefined')
                manifest.lifelineIcon = "Common/Shop/Lifeline_big.png";
            if (typeof manifest.coinIco === 'undefined')
                manifest.coinIco = "Common/SharedAssets/coinplus.png";
            if (typeof manifest.itemCircle === 'undefined')
                manifest.itemCircle = "Common/Shop/pg2_orangecircle_large.png";
        },

        enter : function(prevStateName, skuNames)
        {
            var self = this;

            if (skuNames && !self.frontEndSkus)
                self.frontEndSkus = skuNames;

            var bg = new CAAT.Actor();
            var element = g_layout.getElementInPage('main', 'shop', 'bg');
            bg.setBackgroundImage(g_loader.getResult(element.id), true);
            g_layout.applyElementToCAATActor(element, bg, true, true);
            self.scene.addChild(bg);

            self._enterStoreFront();
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
            self.scene.emptyChildren();
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'shop', g_loader.getResult('shopMainLayout'));
            g_layout.mergePage('sub', 'shop', g_loader.getResult('shopSubLayout'));
        },

        _initScroll: function(callback)
        {
            var self = this;
            var el = g_layout.getElementInPage('main', 'shop', 'scroll');
            self.scrollView.init(el.x,el.y, el.width, el.height, false, self, self.scene, callback);
            self.scrollView.buttonsEnabled = true;
        },

        _enterStoreFront : function()
        {
            var self = this;

            var backCallback = function(evt) { self._onStoreFrontBackClick(evt); }
            self._buildPageFramework('store', backCallback);
            self._createFrontEndPage();
        },

        _onStoreFrontBackClick : function(evt)
        {
            var self = this;
            self.owner.hide();
        },

        _buildPageFramework : function(elemFilter, backCallback)
        {
            var self = this;

            var img = g_loader.getResult('bannerLarge');
            var title = new CAAT.ActorContainer().setSize(img.width, img.height);
            g_layout.addAllElementsToObject(title, 'main', 'shop', elemFilter);
            self.scene.addChild(title);

            self.bannerTitle = g_layout.getActorFromArrayByID(title.childrenList, "Store", false);
            self.bannerText = g_layout.getActorFromArrayByID(title.childrenList, "Item", false);
            self.bannerCoin = g_layout.getActorFromArrayByID(title.childrenList, "coinIco", false);

            var pgBreak = new CAAT.Actor();
            var element = g_layout.getElementInPage('main', 'shop', 'break');
            pgBreak.setBackgroundImage(g_loader.getResult(element.id), true);
            g_layout.applyElementToCAATActor(element, pgBreak, true, true);
            self.scene.addChild(pgBreak);

            // sub area
            var footer = new CAAT.Actor();
            var element = g_layout.getElementInPage('sub', 'shop', 'footer');
            footer.setBackgroundImage(g_loader.getResult(element.id), true);
            g_layout.applyElementToCAATActor(element, footer, true, true);
            self.scene.addChild(footer);

            var element = g_layout.getElementInPage('sub', 'shop', 'back');
            self.backButton = g_layout.createNavigationButton(element, null);
            self.scene.addChild(self.backButton);
        },

        _createStoreButton : function(elemName, callback)
        {
            var self = this;

            var element = g_layout.getElementInPage('main', 'shop', elemName);
            var button = g_layout.createFancyButton(element, callback);
            self.scrollView.addActor(button, 4.0);
            return button;
        },

        _onClickPackage : function(clickedButton)
        {
            var self = this;
            self.thePackage = clickedButton.skuData.packages[clickedButton.skuPackage];

            var itemName = clickedButton.skuData.name;
            var buyingMoney = clickedButton.skuData.isMoney;
            var strCost = null;

            if (buyingMoney)
            {
                strCost = "$" + self.thePackage.price.toString();

                if (g_game.clientConnection.isOnDevice)
                {
                    self._doTransaction(true, true, self.frontEndSkus[self.selSkuIdx]);
                    return;
                }
            }
            else
            {
                // check user has enough coins
                if (self.thePackage.price > g_game.inventory.getBalance())
                    return self._showNotEnoughCoins();

                strCost = (buyingMoney ? "$" : "") + self.thePackage.price.toString();
            }

            // confirmation dialog
            var msg = "Are you sure you want to purchase\n" + self.thePackage.qty.toString() + " " +
                itemName + " for " + strCost + (buyingMoney ? "" : (" " + Store.MONEY_NAME)) + "?";
            g_game.showGenericDialog("Confirm Purchase", msg, "Yes", "No", function(ok){self._doTransaction(ok, buyingMoney, self.frontEndSkus[self.selSkuIdx]);});
        },

        _showNotEnoughCoins : function()
        {
            g_game.showGenericDialog("Sorry!", "You don't have enough " + Store.MONEY_NAME + "\nto complete this purchase.", "Ok", null, null);
        },

        _doTransaction : function(ok, buyingMoney, skuName)
        {
            var self = this;

            if (ok && self.thePackage != null)
            {
                g_game.showLoadingDialog("Transacting...");

                if (buyingMoney && g_game.clientConnection.isOnDevice)
                {
                    var IAPname = self.owner.getIAPPrefixName() + self.thePackage.IAP;

                    window.plugins.inAppPurchaseManager.requestProductData(IAPname, function(productId, title, description, price) {
                            console.log("productId: " + productId + " title: " + title + " description: " + description + " price: " + price);
                            window.plugins.inAppPurchaseManager.makePurchase(productId, 1);
                        }, function(id) {
                            console.log("Invalid product id: " + id);
                        }
                    );
                }
                else
                {
                    g_game.clientConnection.buyInventory(skuName, self.thePackage.qty, self._onBuyResponse() );
                }
            }
        },

        _onBuyResponse : function()
        {
            var self = this;
            return function(err,response)
            {
                self._cleanupPurchase(err);
            }
        },

        _cleanupPurchase : function(err)
        {
            var self = this;

            self.thePackage = null;
            g_game.hideLoadingDialog();

            if (err)
                g_game.showGenericDialog("Sorry!", "Unable to complete\ntransaction at this time.", "Ok", null, null);
            else
                g_game.inventory.setUserInventory(g_game.clientConnection.userInventory);
        },

        _onFrontEndClick : function(clickedButton)
        {
            var self = this;

            if (typeof clickedButton.skuData.packages === 'undefined')
                self.owner.onNoPackagesClicked(clickedButton);
            else
                self._createStorePage(clickedButton);
        },

        _createStorePage : function(clickedButton)
        {
            var self = this;

            var backFn = function(evt) { self._createFrontEndPage(); }
            self.backButton.setClickCallback(backFn);

            self._initScroll(function(clickedActor){ self._onClickPackage(clickedActor);});

            self.bannerText.setText(clickedButton.skuData.name);
            self.bannerText.visible = true;
            self.bannerTitle.visible = false;
            self.bannerCoin.visible = false;

            self.selSkuIdx = clickedButton.skuIdx;

            for (var i = 0; i < clickedButton.skuData.packages.length; i++)
            {
                var button = self._createStoreButton(clickedButton.skuData.packages[i].btnType, null);

                var btnName = clickedButton.skuData.name;
                if (btnName.length > 10)
                    btnName = require('TextBreaker').TextBreaker.splitText(btnName);

                button.setText(btnName);
                button.replaceImage(0, g_loader.getResult(clickedButton.skuData.icon));

                if (clickedButton.skuData.packages[i].btnType === "btnMoney")
                {
                    button.setText(clickedButton.skuData.packages[i].qty.toString(), 1);
                    button.setText("$" + clickedButton.skuData.packages[i].price.toString(), 2);
                }
                else if (clickedButton.skuData.packages[i].btnType === "btnItem")
                {
                    button.setText("X" + clickedButton.skuData.packages[i].qty.toString(), 1);
                    button.setText(clickedButton.skuData.packages[i].price.toString(), 2);
                }

                button.skuData = clickedButton.skuData;
                button.skuPackage = i;
            }
        },

        _createFrontEndPage : function()
        {
            var self = this;

            var backFn = function(evt) { self._onStoreFrontBackClick(evt); }
            self.backButton.setClickCallback(backFn);
            self._initScroll(function(clickedActor){ self._onFrontEndClick(clickedActor);});

            self.bannerText.visible = false;
            self.bannerTitle.visible = true;
            self.bannerCoin.visible = true;

            self.selSkuIdx = -1;

            for (var i = 0; i < self.frontEndSkus.length; i++)
            {
                var theSku = g_game.inventory.getSkuElement(self.frontEndSkus[i]);
                var button = self._createStoreButton(theSku.btnType, null);
                button.setText(theSku.name);
                button.replaceImage(0, g_loader.getResult(theSku.icon));

                if (theSku.btnType === "btnFrontMoney")
                {
                    button.setText("You Own\n" + g_game.inventory.getBalance(), 1);
                }
                else if (theSku.btnType === "btnFrontCount")
                {
                    button.setText(g_game.inventory.getCount(self.frontEndSkus[i]).toString(), 2);
                }

                button.skuData = theSku;
                button.skuIdx = i;
            }
        },

        _onInAppPurchased : function()
        {
            var self = this;
            return function(transactionIdentifier, productId, transactionReceipt)
            {
                console.log("In-app purchase succeeded! Purchased: " + productId);

                // verify receipt with server
                if (g_game.clientConnection.isAuthenticated())
                    g_game.clientConnection.sendInAppPurchaseReceipt(transactionReceipt, productId, self._onInAppPurchaseCompleted());
                else
                    g_game.clientConnection.queueInAppPurchaseReceipt(transactionReceipt, productId, self._onInAppPurchaseCompleted());
            }
        },

        _onInAppRestored : function()
        {
            var self = this;
            return function(originalTransactionIdentifier, productId, originalTransactionReceipt)
            {
                console.log("In-app purchase succeeded. Restored: " + productId);
            }
        },

        _onInAppFailed : function()
        {
            var self = this;
            return function(errorCode, errorText)
            {
                console.log("In-app purchase error, code: " + errorCode + " message: " + errorText);
                self._cleanupPurchase(errorCode);
            }
        },

        _onInAppPurchaseCompleted : function()
        {
            var self = this;
            return function(err,result)
            {
                if (err)
                    console.log("In-app purchase failed to verify, code: " + err);
                else
                    console.log("In app purchase verified successfully!");

                self._cleanupPurchase(err);
            }
        }
    };

    exports.Shop = Shop;

})(typeof exports === 'undefined'? _modules['Shop']={} : exports);