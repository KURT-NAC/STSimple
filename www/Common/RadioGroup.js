(function(exports){

    function RadioGroup()
    {
        return this;
    }

    RadioGroup.prototype =
    {
        groupID : 0,
        arButtons : null,

        init : function(id)
        {
            var self = this;

            self.groupID = id;
            self.arButtons = new Array();

            return self;
        },

        addButton : function(button)
        {
            var self = this;

            button.radioGroup = self;
            button.radioID = self.arButtons.length;
            self.arButtons.push(button);

            return self;
        },

        onButtonClicked : function(buttonID)
        {
            var self = this;

            for (var i = 0; i < self.arButtons.length; i++)
            {
                var curBtn = self.arButtons[i];
                if (curBtn.radioID !== buttonID)
                {
                    curBtn.onRadioSelection(buttonID);
                }
            }

            return self;
        }
    }

    exports.RadioGroup = RadioGroup;

})(typeof exports === 'undefined'? _modules['RadioGroup']={} : exports);