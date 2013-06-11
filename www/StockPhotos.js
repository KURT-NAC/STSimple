(function(exports){

    function StockPhotos(owner,director)
    {
        this.init(owner,director);
    }

    StockPhotos.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        // CONSTANTS
        ICON_CATEGORY: 1,
        ICON_DIMMER: 2,
        ICON_COIN: 2,
        ICON_CHECK: 3,
        ICON_LOCK: 3,
        ICON_ENERGY: 4,

        scrollView: null,
        fromStore: false,

        curEnergyPieces: 0,
        curEnergyDist: 0,
        arEnergyDistribution: null,

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
        },

        postLoad : function()
        {
            var self = this;
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            self.fromStore = (typeof stateData !== 'undefined') && stateData.fromStore === true;

            var pgBreak = new CAAT.Actor();
            var element = g_layout.getElementInPage('main', 'stockPhotos', 'bg');
            pgBreak.setBackgroundImage(g_loader.getResult(element.id), true);
            g_layout.applyElementToCAATActor(element, pgBreak, true, true);
            self.scene.addChild(pgBreak);

            var img = g_loader.getResult('bannerLarge');
            var title = new CAAT.ActorContainer().setSize(img.width, img.height);
            g_layout.addAllElementsToObject(title, 'main', 'stockPhotos', 'title');
            self.scene.addChild(title);

            // scroll view
            self.scrollView =  new (require('ScrollView').ScrollView)();
            self._initScroll();

            self._calcEnergyDistribution();
            self._generateList();
            self.scrollView.snapToBottom();

            var pgBreak = new CAAT.Actor();
            var element = g_layout.getElementInPage('main', 'stockPhotos', 'break');
            pgBreak.setBackgroundImage(g_loader.getResult(element.id), true);
            g_layout.applyElementToCAATActor(element, pgBreak, true, true);
            self.scene.addChild(pgBreak);

            // sub area
            var footer = new CAAT.Actor();
            var element = g_layout.getElementInPage('sub', 'stockPhotos', 'footer');
            footer.setBackgroundImage(g_loader.getResult(element.id), true);
            g_layout.applyElementToCAATActor(element, footer, true, true);
            self.scene.addChild(footer);

            var element = g_layout.getElementInPage('sub', 'stockPhotos', 'back');
            var button = g_layout.createNavigationButton(element, self._returnToPrevious());
            self.scene.addChild(button);
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
            // clear everything out
            self.scene.emptyChildren();

            self.arEnergyDistribution = [];
        },

        _initScroll: function()
        {
            var self = this;
            var el = g_layout.getElementInPage('main', 'stockPhotos', 'scroll');
            self.scrollView.init(el.x,el.y, el.width, el.height, false, self, self.scene, function(clickedActor){ self._onClickCategory(clickedActor);});
            self.scrollView.buttonsEnabled = true;
        },

        _calcEnergyDistribution : function()
        {
            var self = this;

            self.arEnergyDistribution = new Array();
            self.curEnergyDist = 0;
            self.curEnergyPieces = self.owner.inventory.getEnergy();

            var puzzCategories = g_game.inventory.getSkuElement('puzzleCategories');
            for (var i = 0; i < puzzCategories.length; i++)
            {
                var catCount = g_game.inventory.getOwnership(puzzCategories[i].id);
                if (catCount >= 0)
                    continue;

                var curEnergy = self.curEnergyPieces;

                if (self.curEnergyPieces > puzzCategories[i].unlock)
                    curEnergy = puzzCategories[i].unlock;

                self.curEnergyPieces -= puzzCategories[i].unlock;
                self.curEnergyPieces = Math.max(0, self.curEnergyPieces);

                self.arEnergyDistribution.push(curEnergy);
            }

            self.arEnergyDistribution.reverse();
        },

        _generateList : function()
        {
            var self = this;

            var puzzCategories = g_game.inventory.getSkuElement('puzzleCategories');
            for (var i = puzzCategories.length-1; i >= 0; i--)
            {
                self._createCategoryButton(puzzCategories[i], null);
            }
        },

        _createCategoryButton : function(category, callback)
        {
            var self = this;

            var catCount = g_game.inventory.getOwnership(category.id);
            var locked = catCount < 0;

            var element = g_layout.getElementInPage('main', 'stockPhotos', locked ? 'stockButtonLocked' : 'stockButton');
            var button = g_layout.createFancyButton(element, callback);
            button.sku = category;
            button.setText(category.name);
            button.replaceImage(self.ICON_CATEGORY, g_loader.getResult(category.icon));

            if (catCount > 0)
            {
                // unlocked and owned
                button.setImageVisible(self.ICON_COIN, false);
                button.setText("You\nOwn", 1);
                button.clickAction = "use";
            }
            else if (catCount === 0)
            {
                // unlocked, not owned
                button.setImageVisible(self.ICON_CHECK, false);
                var strPrice = "Buy\n" + category.price.toString();
                button.setText(strPrice, 1);
                button.clickAction = "buy";
            }
            else
            {
                // locked
                var curEnergy = self.arEnergyDistribution[self.curEnergyDist++];

                if (curEnergy > 0)
                {
                    button.setText(curEnergy.toString() + "/" + category.unlock, 1);
                    button.unlockable = false;

                    if (curEnergy >= category.unlock)
                    {
                        button.setImageVisible(self.ICON_LOCK, false);
                        button.unlockable = true;
                    }
                }
                else
                {
                    button.setImageVisible(self.ICON_ENERGY, false);
                    button.setText("", 1);
                }

                button.clickAction = "unlock";
            }

            self.scrollView.addActor(button, 4.0);
            return button;
        },

        _onClickCategory : function(clickedButton)
        {
            var self = this;

            var catName = clickedButton.sku.name.replace('\n', ' ');
            catName.replace('\n', ' ');

            switch (clickedButton.clickAction)
            {
                case "use":
                    self._useCategoryClick(clickedButton.sku);
                    break;
                case "buy":
                    self.owner.showGenericDialog("Purchase Category", "Are you sure you'd like to purchase\n\"" + catName + "\"\nfor " + clickedButton.sku.price + " Cashanova?",
                        "Yes", "No", self._onConfirmPurchase(clickedButton.sku));
                    break;
                case "unlock":
                    if (clickedButton.unlockable)
                    {
                        self.owner.showGenericDialog("Unlock Category", "Would you like to try unlocking\n\"" + catName + "\"\nfor " + clickedButton.sku.unlock + " Puzzle Pieces?",
                            "Yes", "No", self._onConfirmUnlock(clickedButton.sku));
                    }
                    else
                    {
                        self.owner.showGenericDialog("Locked", "You don't have enough puzzle pieces!", "Ok");
                    }
                    break;
            }
        },

        _useCategoryClick : function(sku)
        {
            var self = this;

            if (self.fromStore)
                g_game.storeDialog.fsm.gotoState(g_game.storeDialog.StoreStates.ChooseStock, { "sku": sku, "fromStore": true });
            else
                g_game.fsm.gotoState(g_game.GameStates.ChooseStock, { "sku": sku, "fromStore": false });
        },

        _onConfirmUnlock : function(sku)
        {
            var self = this;
            return function(ok)
            {
                if (ok)
                {
                    if (self.fromStore)
                        g_game.storeDialog.fsm.gotoState(g_game.storeDialog.StoreStates.SlidePuzzle, { "sku": sku, "fromStore": true });
                    else
                        g_game.fsm.gotoState(g_game.GameStates.SlidePuzzle, { "sku": sku, "fromStore": false });
                }
            }
        },

        _onConfirmPurchase : function(sku)
        {
            var self = this;
            return function(ok)
            {
                if (ok)
                {
                    g_game.showLoadingDialog("Transacting");
                    g_game.clientConnection.buyInventory(sku.id, 1, self._onBuyResponse());
                }
            }
        },

        _onBuyResponse : function()
        {
            var self = this;
            return function(err,response)
            {
                g_game.hideLoadingDialog();

                if (err)
                {
                    g_game.showGenericDialog("Sorry!", "Unable to purchase\ncategory at this time.", "Ok", null, null);
                }
                else
                {
                    g_game.inventory.setUserInventory(g_game.clientConnection.userInventory);
                    self._initScroll();
                    self._calcEnergyDistribution();
                    self._generateList();
                    self.scrollView.snapToBottom();
                }
            }
        },

        _returnToPrevious : function()
        {
            var self = this;
            return function()
            {
                if (self.fromStore)
                    g_game.storeDialog.fsm.gotoState(g_game.storeDialog.StoreStates.Shop);
                else
                    g_game.fsm.gotoState(g_game.GameStates.RecordClip);
            }
        }
    };

    exports.StockPhotos = StockPhotos;

})(typeof exports === 'undefined'? _modules['StockPhotos']={} : exports);