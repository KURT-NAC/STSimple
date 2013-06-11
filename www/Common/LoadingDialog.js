(function(exports){

    function LoadingDialog()
    {
        LoadingDialog.superclass.constructor.call(this);
        return this;
    }

    LoadingDialog.prototype =
    {
        scene: null,
        visible: false,

        bg: null,

        // dynamic actors
        title: null,
        spinner: null,

        elapsed:0,
        currentStep:0,

        totalSteps:10,
        stepTime:200,

        init: function(width, height, title)
        {
            var self = this;

            self.initialize(0, 0, SnTCanvasHelper.attachToCanvas('#loadingCanvas', width, height));
            self.setSoundEffectsEnabled(false);
            self.scene = self.createScene();

            g_layout.setActive('main', 'loadingDialog');

            // static actors
            var bgElem = g_layout.getElementFromActive("drop");
            bgElem.width = width;
            bgElem.height = height;
            bgElem.x = width/2;
            bgElem.y = height/2;
            self.scene.addChild((new CAAT.Actor()).setBackgroundImage(g_loader.getResult(bgElem.id), true));
            bgElem = self._applyElementToMostRecentActor(bgElem);

            // make sure that we block all input behind us
            bgElem.enableEvents(true);
            bgElem.mouseClick = self._DoNothing();
            bgElem.mouseEnter = self._DoNothing();
            bgElem.mouseExit = self._DoNothing();
            bgElem.mouseDown = self._DoNothing();
            bgElem.mouseUp = self._DoNothing();

            // dynamic actors
            var el = g_layout.getElementFromActive("title");
            el.x += bgElem.x;
            el.y += bgElem.y;
            self.title = new CAAT.TextActor();
            self.scene.addChild(self.title);
            g_layout.applyElementToCAATActor(el, self.title, true);

            el = g_layout.getElementFromActive("spinner");
            el.x += bgElem.x;
            el.y += bgElem.y;
            self.scene.addChild((new CAAT.Actor().setBackgroundImage(g_loader.getResult(el.id), true)));
            self.spinner = self._applyElementToMostRecentActor(el);
            self.spinner.enableEvents(false);

            self.setText(title);

            return self;
        },

        cleanup: function()
        {
            var self = this;

            self.scene.emptyChildren();
            self.emptyScenes();
            self.ctx.clearRect(0, 0, self.width, self.height);

            return self;
        },

        setText: function(title)
        {
            var self = this;

            self.title.setText(title);
            self.title.setSize(self.title.textWidth, self.title.textHeight);

            return self;
        },

        setAnimationVals: function(numSteps, stepTime)
        {
            var self = this;
            self.totalSteps = numSteps;
            self.stepTime = stepTime;
            return self;
        },

        tick: function(deltaTime)
        {
            var self = this;

            self.elapsed += deltaTime;

            if (self.elapsed > self.stepTime)
            {
                self.currentStep++;
                self.elapsed = 0;
            }

            if (self.currentStep > self.totalSteps)
                self.currentStep = 0;

            if (self.spinner)
            {
                self.spinner.setRotationAnchored(-self.currentStep * 2*Math.PI/self.totalSteps, 0.5, 0.5);
            }
        },

        _DoNothing: function()
        {
            return function(event)
            {
            }
        },

        ////////////////////////
        // Helpers
        _applyElementToMostRecentActor: function(element)
        {
            var self = this;
            var actor = self.scene.childrenList[self.scene.childrenList.length-1];
            g_layout.applyElementToCAATActor(element, actor);
            return actor;
        }

    };

    extend(LoadingDialog, require('GameDirector').GameDirector);
    exports.LoadingDialog = LoadingDialog;

})(typeof exports === 'undefined'? _modules['LoadingDialog']={} : exports);
