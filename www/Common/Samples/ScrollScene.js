(function(exports){

    function ScrollScene(owner,scene)
    {
        this.init(owner,scene);
    }

    ScrollScene.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        scrollView : null,

        bg      : null,
        fillDrop : null,

        init : function(owner, scene)
        {
            this.owner = owner;
            this.director = owner.director;
            this.scene = scene||this.director.createScene();
        },

        load : function(loader)
        {
            this.bg = loader.getResult('button');
            this.createScrollView();

            this.fillDrop = new CAAT.ShapeActor().
                setShape(CAAT.ShapeActor.prototype.SHAPE_RECTANGLE).
                setFillStyle((new CAAT.Color.RGB(255,0,0)).toHex()).
                setBounds(-14,(this.bg.height * -1),540,this.bg.height).
                //enableEvents(false).
                setAlpha(0.2);
        },

        enter : function()
        {
        },

        tick : function(deltaTime)
        {
        },

        leave : function(nexStateID)
        {
        },

        createScrollView : function()
        {
            //var sv = require('ScrollView').ScrollView;
            this.scrollView = new (require('ScrollView').ScrollView);//new sv();
            /*Horizontal*/this.scrollView.init(10, 10, 768, 160, true, this.director, this.scene, this._clickCallback());
            ///*Vertical*/this.scrollView.init(10, 10, 540, 512, false, this.director, this.scene, this._clickCallback());
            //this.scrollView.clipArea.centerAt(384,512);

            for (var i = 0; i < 10; i++)
            {
                this.scrollView.addActor
                    (
                        new CAAT.ActorContainer().
                            setSize(this.bg.width, this.bg.height).
                            addChild
                            (
                                new CAAT.Actor().
                                    setBackgroundImage(this.bg, true)
                            ),
                        20
                    );
            }
        },

        _clickCallback : function()
        {
            var that = this;
            return function(clickedActor, lastSelectedActor)
            {
                if (clickedActor != null)
                {
                    if (lastSelectedActor != null)
                        lastSelectedActor.removeChild(that.fillDrop);
                    clickedActor.addChild(that.fillDrop);
                    that.fillDrop.setPosition(-14,0);
                    that.fillDrop.dirty = true;
                }
            }
        }
    };

    exports.ScrollScene = ScrollScene;

})(typeof exports === 'undefined'? _modules['ScrollScene']={} : exports);