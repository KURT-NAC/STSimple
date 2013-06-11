(function(exports){

    function Inventory()
    {
    }

    Inventory.prototype =
    {
        owner : null,
        skuData : null,
        skuQty : null,
        energySkuName : null,

        init : function(owner, energySkuName)
        {
            var self = this;
            self.owner = owner;
            self.skuData = null;
            self.skuQty = {};
            self.energySkuName = energySkuName;
            return this;
        },

        initItemCounts : function(arSkuItems)
        {
            var self = this;

            for (var i = 0; i < arSkuItems.length; i++)
            {
                self.skuQty[arSkuItems[i]] = 0;
            }

            return self;
        },

        refreshUI : function()
        {
            var self = this;
            if (self.skuQty)
            {
                self.owner.topBar.setCoins(self.skuQty['money'].toString());

                var energySku = self.getSkuElement(self.energySkuName);
                if (energySku !== null)
                {
                    var energyVal = energySku.clampOverage ? self.getEnergy() : self.getEnergy() % energySku.unitSize;
                    self.owner.topBar.setEnergy(energySku.displayStyle, energyVal, energySku.unitSize);
                }
            }
            else
            {
                self.owner.topBar.setCoins(null);
                self.owner.topBar.setEnergy(null);
            }
        },

        setUserInventory : function(inv)
        {
            var self = this;

            for (var x in inv.skus)
            {
                self.skuQty[x] = inv.skus[x];
            }

            self.refreshUI();
            return this;
        },

        setSkuData : function(skuData)
        {
            var self = this;
            self.skuData = skuData;
        },

        getMicroTransaction: function(transaction)
        {
            var self = this;
            if (transaction in self.skuData.microTransactions)
                return self.skuData.microTransactions[transaction];

            return null;
        },

        doMicroTransaction: function(transaction)
        {
            var self = this;
            var data = self.getMicroTransaction(transaction);

            if (data)
            {
                self.addMoney(-data.cost, true);
            }
        },

        getSkuElement : function(sku)
        {
            var self = this;
            if (sku in self.skuData.skus)
                return self.skuData.skus[sku];

            return null;
        },

        getCount : function(type)
        {
            var self = this;
            var cnt = self.skuQty[type];
            if (typeof cnt !== "undefined")
                return cnt;

            return 0;
        },

        addCount : function(type,amt)
        {
            var self = this;
            if (self.skuQty[type])
                self.skuQty[type] += amt;
            else
                self.skuQty[type] = amt;
            self.refreshUI();
        },

        getOwnership : function(type)
        {
            var self = this;
            var cnt = self.skuQty[type];
            if (typeof cnt !== "undefined")
                return cnt;

            return -1;
        },

        addMoney : function(amt, updateServer)
        {
            var self = this;
            self.skuQty['money'] += amt;
            self.refreshUI();

            if (updateServer)
            {
                amt = -amt; // negate this because if we're using money, we should be removing a positive value
                self.owner.clientConnection.useInventory('money', amt, self._onUseInventoryComplete(null));
            }

            return true;
        },

        getBalance : function()
        {
            var self = this;
            return self.skuQty['money'];
        },

        addEnergy : function(amt)
        {
            var self = this;
            self.skuQty[self.energySkuName] += amt;
            self.refreshUI();
            return true;
        },

        getEnergy : function()
        {
            var self = this;
            return self.skuQty[self.energySkuName];
        },

        getEnergyUnitSize : function()
        {
            var self = this;
            var energySku = self.getSkuElement(self.energySkuName);
            return energySku.unitSize;
        },

        buy : function(type, amt, price)
        {
            var self = this;

            if (price <= self.skuQty['money'])
            {
                if (typeof self.skuQty[type] === "undefined")
                    return false;

                self.skuQty[type] += amt;
                self.skuQty['money'] -= price;
                self.refreshUI();
                return true;
            }

            return false;
        },

        use : function(type, cb)
        {
            var self = this;

            if (typeof self.skuQty[type] !== "undefined" && self.skuQty[type] > 0)
            {
                self.skuQty[type]--;
                self.refreshUI();
                self.owner.clientConnection.useInventory(type, 1, self._onUseInventoryComplete(cb));
                return true;
            }

            return false;
         },

        _onUseInventoryComplete : function(cb)
        {
            var self = this;

            return function(err, results)
            {
                self.setUserInventory(self.owner.clientConnection.userInventory);
                self.refreshUI();

                if (cb)
                    cb();
            }
        },

        getCategoryName: function(skuName, logicalCategory)
        {
            var self = this;
            var invCategories = self.getSkuElement(skuName);
            for (var i = 0; i < invCategories.length; i++)
            {
                if (invCategories[i].logical === logicalCategory)
                {
                    return invCategories[i].name;
                }
            }

            return "";
        }
    };

    exports.Inventory = Inventory;

})(typeof exports === 'undefined'? _modules['Inventory']={} : exports);