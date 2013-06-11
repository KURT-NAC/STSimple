(function(exports){

    function AwardsScreen(owner,director)
    {
        this.init(owner,director);
    }

    AwardsScreen.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        detailPopup : null,
        detailName : null,
        descIdx : -1,
        orangeCols : 0,
        blueCols : 0,
        arrowElem: null,
        detailArrow: null,

        defData : null,
        awardStatus : null,

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

        addToManifest : function(manifest)
        {
            manifest.awardsMainLayout = "Common/AwardsScreen/awardsscreen_main_view.json";
            manifest.awardsSubLayout = "Common/AwardsScreen/awardsscreen_sub_view_" + g_game.platform + ".json";

            if (typeof manifest.awardsBkgd === 'undefined')
                manifest.awardsBkgd = "Common/AwardsScreen/award_bkgd.jpg";
            if (typeof manifest.awardsLogo === 'undefined')
                manifest.awardsLogo = "Common/AwardsScreen/award_logo.png";
            if (typeof manifest.awardsOrangeSlots === 'undefined')
                manifest.awardsOrangeSlots = "Common/AwardsScreen/slots_orange.png";
            if (typeof manifest.awardsBlueSlots === 'undefined')
                manifest.awardsBlueSlots = "Common/AwardsScreen/slots_blue.png";
            if (typeof manifest.awardsPlaceholder === 'undefined')
                manifest.awardsPlaceholder = "Common/AwardsScreen/award_placeholder.png";
            if (typeof manifest.awardsPopup === 'undefined')
                manifest.awardsPopup = "Common/AwardsScreen/award_detail.png";
            if (typeof manifest.awardsPopupArrow === 'undefined')
                manifest.awardsPopupArrow = "Common/AwardsScreen/detail_arrow.png";
        },

        postLoad : function()
        {
            var self = this;
            g_layout.mergePage('main', 'awards', g_loader.getResult('awardsMainLayout'));
            g_layout.mergePage('sub', 'awards', g_loader.getResult('awardsSubLayout'));
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            self.owner.showLoadingDialog("Getting Awards Data...");

            self.owner.clientConnection.getAwardDefData(function(err,result){
                self.defData = result;

                self.owner.clientConnection.getAwardStatus(function(err,result){
                    self.awardStatus = result.data;
                    self._enterAwards();
                    self.owner.hideLoadingDialog();
                });
            });

        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;

            self.defData = null;
            self.awardStatus = null;

            // clear everything out
            for (var i = 0; i < self.scene.childrenList.length; i++)
            {
                self.scene.childrenList[i].
                    setDiscardable(true).
                    setExpired().
                    setParent(null);
            }

            self.scene.emptyChildren();
        },

        _enterAwards: function()
        {
            var self = this;

            g_layout.addAllElementsToObject(self.scene, "main", "awards", "awards");

            var labelTemplate = g_layout.getElementInPage("main", "awards", "labelTemplate");
            var orangeTemplate = g_layout.getElementInPage("main", "awards", "templateOrange");

            self.descIdx = -1;

            var nAward = 0;
            var totalAwards = self.defData[g_game.clientConnection.constants.GAME].length;

            self.orangeCols = orangeTemplate.cols;
            for (var i = 0; i < self.orangeCols; i++)
            {
                if (nAward >= totalAwards)
                    break;

                var owned = self.awardStatus[nAward].owned;
                var img = g_loader.getResult(owned ? self.defData[g_game.clientConnection.constants.GAME][nAward].image : orangeTemplate.id);

                var actor = new CAAT.Actor().setBackgroundImage(img, true);
                g_layout.applyElementToCAATActor(orangeTemplate, actor, true, true);
                actor.x = orangeTemplate.x + i * orangeTemplate.incrX;

                if (owned)
                    actor.setScaleAnchored(orangeTemplate.scaleX, orangeTemplate.scaleY, 0.5, 0.5);

                self.scene.addChild(actor);

                var label = new CAAT.TextActor();
                g_layout.applyElementToCAATActor(labelTemplate, label, true, false);
                label.x = actor.x;
                label.y = actor.y + labelTemplate.offsetY;
                label.text = self.defData[g_game.clientConnection.constants.GAME][nAward].name;
                self.scene.addChild(label);

                actor.enableEvents(true).mouseClick = self._onAwardClicked(nAward, label.x, label.y);

                nAward++;
            }

            var blueTemplate = g_layout.getElementInPage("main", "awards", "templateBlue");

            for (var i = 0; i < blueTemplate.rows; i++)
            {
                self.blueCols = blueTemplate.cols;
                for (var j = 0; j < self.blueCols; j++)
                {
                    if (nAward >= totalAwards)
                        break;

                    var owned = self.awardStatus[nAward].owned;
                    var img = g_loader.getResult(owned ? self.defData[g_game.clientConnection.constants.GAME][nAward].image : orangeTemplate.id);

                    var actor = new CAAT.Actor().setBackgroundImage(img, true);
                    g_layout.applyElementToCAATActor(blueTemplate, actor, true, true);
                    actor.x = blueTemplate.x + j * blueTemplate.incrX;
                    actor.y = blueTemplate.y + i * blueTemplate.incrY-5;

                    if (owned)
                        actor.setScaleAnchored(blueTemplate.scaleX, blueTemplate.scaleY, 0.5, 0.5);

                    self.scene.addChild(actor);

                    var label = new CAAT.TextActor();
                    g_layout.applyElementToCAATActor(labelTemplate, label, true, false);
                    label.x = actor.x;
                    label.y = actor.y + labelTemplate.offsetY;
                    label.text = self.defData[g_game.clientConnection.constants.GAME][nAward].name;
                    self.scene.addChild(label);

                    actor.enableEvents(true).mouseClick = self._onAwardClicked(nAward, label.x, label.y);

                    nAward++;
                }
            }

            g_layout.addAllElementsToObject(self.scene, "sub", "awards");

            self.detailPopup = new CAAT.ActorContainer(CAAT.ActorContainer.AddHint.CONFORM);
            g_layout.addAllElementsToObject(self.detailPopup, "main", "awards", "detail");
            self.detailPopup.visible = false;
            self.detailPopup.enableEvents(true).mouseClick = self._onDismissDetail();
            self.detailName = g_layout.getActorFromArrayByID(self.detailPopup.childrenList, 'Award Name');
            self.scene.addChild(self.detailPopup);

            self.detailArrow = g_layout.getActorFromArrayByID(self.detailPopup.childrenList, 'awardsPopupArrow');
            self.arrowElem = g_layout.getElementInPage("main", "awards", "detailArrow");

            var callback = function(evt) { self.owner.fsm.gotoState(self.owner.GameStates.Main); }
            var backBtn = g_layout.getActorFromArrayByID(self.scene.childrenList, 'backBtn');
            backBtn.setCallback(callback);
        },

        _onAwardClicked : function(nAward, x, y)
        {
            var self = this;

            return function(event)
            {
                if (self.detailPopup.visible)
                    self.detailPopup.visible = false;

                g_game.audioManager.playSound("wooip");

                var side = self._getAwardSide(nAward)
                var xPos = x + side * self.arrowElem.offset;
                self.detailPopup.setPositionAnchored(xPos, y, 0.5, 0);
                self.detailArrow.x = self.arrowElem.x - side * self.arrowElem.offset

                self.detailName.text = self.defData[g_game.clientConnection.constants.GAME][nAward].name;

                if (self.descIdx >= 0)
                {
                    var removed = self.detailPopup.childrenList.splice(self.descIdx, 1);
                    removed[0].setDiscardable(true).
                        setExpired().
                        setParent(null);
                }

                var descElem = g_layout.getElementInPage("main", "awards", "descText");
                var desc = self.defData[g_game.clientConnection.constants.GAME][nAward].description;
                self.descIdx = require('TextBreaker').TextBreaker.addTextArea(self.detailPopup, desc, self.director, descElem, 0.8);

                self.detailPopup.visible = true;

            }
        },

        _onDismissDetail : function()
        {
            var self = this;

            return function(event)
            {
                self.detailPopup.visible = false;
            }
        },

        _getAwardSide: function(awardIdx)
        {
            var self = this;

            if (awardIdx >= self.orangeCols)
            {
                var rem = (awardIdx - self.orangeCols) % self.blueCols;
                if (rem === 0)
                    return 1;
                else if (rem === self.blueCols-1)
                    return -1;
            }
            else if (awardIdx === self.orangeCols - 1)
            {
                return -1;
            }

            return 0;
        }
    };

    exports.AwardsScreen = AwardsScreen;

})(typeof exports === 'undefined'? _modules['AwardsScreen']={} : exports);