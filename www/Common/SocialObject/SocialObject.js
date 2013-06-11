(function(exports){

    function SocialObject()
    {
        SocialObject.superclass.constructor.call(this, CAAT.ActorContainer.AddHint.CONFORM);

        if (!SocialObject.JSON_LOADED)
        {
            g_layout.mergePage('main', 'socialObject', g_loader.getResult('socialObjectLayout'));

            SocialObject.JSON_LOADED = true;
        }

        return this;
    }

    SocialObject.addResourcesToManifest = function(manifest)
    {
        manifest.socialObjectLayout = "Common/SocialObject/socialobject.json";

        if (typeof manifest.socialFacebook === 'undefined')
            manifest.socialFacebook = "Common/SocialObject/Soc_Face.png";
        if (typeof manifest.socialYouTube === 'undefined')
            manifest.socialYouTube = "Common/SocialObject/Soc_Tube.png";
        if (typeof manifest.socialTwitter === 'undefined')
            manifest.socialTwitter = "Common/SocialObject/Soc_Twit.png";
        if (typeof manifest.socialSave === 'undefined')
            manifest.socialSave = "Common/SocialObject/Soc_Save.png";
    }

    SocialObject.JSON_LOADED = false;
    SocialObject.DEFAULT_ICON_SPACING = 1.5;
    SocialObject.DEFAULT_LABEL_SPACING = 1.2;

    SocialObject.FACEBOOK = 0;
    SocialObject.YOUTUBE = 1;
    SocialObject.TWITTER = 2;
    SocialObject.SAVE = 3;
    // Add additional social media here, i.e. Tumblr, Flickr, etc...

    SocialObject.prototype =
    {
        iconSpacing : 0,
        labelSpacing : 0,
        iconSize : 0,
        textElement : null,
        iconArray : null,
        labelArray : null,
        useLabels : true,
        itemCount : 0,
        arIcons : null,
        arLabels : null,
        arCallbacks : null,
        arDataCB : null,

        init : function(useLabels, iconSpacingFactor, labelSpacingFactor)
        {
            var self = this;

            self.useLabels = useLabels;

            self.textElement = g_layout.getElementInPage("main", "socialObject", "socialTextDef");
            self.iconArray = g_layout.getElementInPage("main", "socialObject", "socialIcons");
            self.labelArray = g_layout.getElementInPage("main", "socialObject", "socialLabels");

            var img = g_loader.getResult('socialFacebook');
            self.iconSize = img.width;

            self.iconSpacing = Math.floor((iconSpacingFactor || SocialObject.DEFAULT_ICON_SPACING) * self.iconSize);
            self.labelSpacing = Math.floor((labelSpacingFactor || SocialObject.DEFAULT_LABEL_SPACING) * self.iconSize);

            self.arIcons = new Array();
            self.arLabels = new Array();

            self.arCallbacks = new Array();
            self.arCallbacks.push(self._onFacebookClicked());
            self.arCallbacks.push(self._onYouTubeClicked());
            self.arCallbacks.push(self._onTwitterClicked());
            self.arCallbacks.push(self._onSaveClicked());

            self.arDataCB = new Array(4);

            return self;
        },

        addItem : function(idx)
        {
            var self = this;

            var icon = new CAAT.Actor();
            icon.setBackgroundImage(g_loader.getResult(self.iconArray[idx]), true)
                .setPosition(self.iconSpacing * self.itemCount, 0)
                .enableEvents(true);
            icon.mouseClick = self.arCallbacks[idx];
            self.arIcons.push(icon);
            self.addChild(icon);

            if (self.useLabels)
            {
                var label = new CAAT.TextActor();
                g_layout.applyElementToCAATActor(self.textElement, label, true, false);
                label.setText(self.labelArray[idx]);
                label.setPosition(self.iconSpacing * self.itemCount + self.iconSize/2, self.labelSpacing);
                self.arLabels.push(label);
                self.addChild(label);
            }

            self.itemCount++;
        },

        addItems : function(arItems)
        {
            var self = this;
            for (var i = 0; i < arItems.length; i++)
            {
                self.addItem(arItems[i]);
            }
        },

        setItemCallbackData : function(idx, data)
        {
            var self = this;

            if (idx < 0 || idx >= data.length)
                return;

            self.arDataCB[idx] = data;
        },

        _onFacebookClicked : function()
        {
            var self = this;
            return function()
            {
                g_game.showGenericDialog("Coming Soon!", "Are you sure you want to\nshare to Facebook?", "Yes", "No", null);
            }
        },

        _onYouTubeClicked : function()
        {
            var self = this;
            return function()
            {
                g_game.showGenericDialog("Coming Soon!", "Are you sure you want to\nshare to You Tube?", "Yes", "No", null);
            }
        },

        _onTwitterClicked : function()
        {
            var self = this;
            return function()
            {
                g_game.showGenericDialog("Coming Soon!", "Are you sure you want to\nshare to Twitter?", "Yes", "No", null);
            }
        },

        _onSaveClicked : function()
        {
            var self = this;
            return function()
            {
                g_game.showGenericDialog("Coming Soon!", "Are you sure you want to\nsave to disk?", "Yes", "No", null);
            }
        }
    };

    addGameWidget('SocialObject', SocialObject);

    extend(SocialObject, CAAT.ActorContainer);
    exports.SocialObject = SocialObject;

})(typeof exports === 'undefined'? _modules['SocialObject']={} : exports);
