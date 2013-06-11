(function(exports){

    function GameDirector()
    {
        GameDirector.superclass.constructor.call(this);
        return this;
    }

    GameDirector.prototype =
    {
        initialize: function(width, height, canvas)
        {
            var self = this;
            if (!width)
                width = Math.ceil($(canvas).width() / g_game.globalScale.x);
            if (!height)
                height = Math.ceil($(canvas).height() / g_game.globalScale.y);

            var scaledWidth = width * g_game.globalScale.x;
            var scaledHeight = height * g_game.globalScale.y;
            var result = GameDirector.superclass.initialize.call(self, scaledWidth, scaledHeight, canvas);

            self.nativeWidth = width;
            self.nativeHeight = height;

            var crop = {x: -Math.min(g_game.globalOffset.x, 0), y: -Math.min(g_game.globalOffset.y, 0)};
            GameDirector.superclass.setPosition.call(self, -crop.x, -crop.y);
            self.setModelViewMatrix();
            self.width += crop.x * 2;
            self.height += crop.y * 2;

            return result;
        },
        createScene: function()
        {
            var self = this;

            var scene = new GameScene(self).create();
            self.addScene(scene);
            scene.parent = self;
            scene.resetTransform();
            return scene;
        }
    };

    extend(GameDirector, CAAT.Director);
    exports.GameDirector = GameDirector;

    function GameScene(director)
    {
        this.director = director;
        GameScene.superclass.constructor.call(this);
        return this;
    }

    GameScene.prototype =
    {
        resetTransform: function()
        {
            var self = this;

            GameScene.superclass.resetTransform.call(self);
            GameScene.superclass.setScaleAnchored.call(self, g_game.globalScale.x, g_game.globalScale.y, 0,0);
            var crop = {
                x: Math.max(-g_game.globalOffset.x, 0),
                y: Math.max(-g_game.globalOffset.y, 0)
            };
            GameScene.superclass.setBounds.call(self, 0,0, self.director.nativeWidth + crop.x * 2, self.director.nativeHeight + crop.y * 2);
            self._updateAnchor();
            self.setModelViewMatrix();
        },
        setScale: function(x,y)
        {
            var self = this;
            GameScene.superclass.setScale.call(self, x * g_game.globalScale.x, y * g_game.globalScale.y);
            self.setModelViewMatrix();
        },
        setScaleAnchored: function(sx,sy, ax, ay)
        {
            var self = this;
            var scaled = {
                sx: sx * g_game.globalScale.x,
                sy: sy * g_game.globalScale.y,
                ax: ax * g_game.globalScale.x,
                ay: ay * g_game.globalScale.y
            };
            GameScene.superclass.setScaleAnchored.call(self, scaled.sx, scaled.sy, scaled.ax, scaled.ay);
            self.setModelViewMatrix();
        },
        setPosition: function(x,y)
        {
            var self = this;
            var adjustedPosition = g_game.adjustOffsetLayout({x: x, y: y});
            GameScene.superclass.setPosition.call(self, adjustedPosition.x, adjustedPosition.y);
            self.setModelViewMatrix();
        },
        setBounds: function(x,y, w,h)
        {
            var self = this;
            var scaled = {
                x: x / g_game.globalScale.x,
                y: y / g_game.globalScale.y,
                w: w / g_game.globalScale.x,
                h: h / g_game.globalScale.y
            };
            GameScene.superclass.setBounds.call(this, scaled.x, scaled.y, scaled.w, scaled.h);
            self._updateAnchor();
            self.setModelViewMatrix();
        },

        _updateAnchor: function()
        {
            var self = this;
            //GameScene.superclass.setScreenBounds.call(self);
            //GameScene.superclass.setPositionAnchor(-g_game.globalOffset.x / self.width, -g_game.globalOffset.y / self.height);
        }
    };

    extend(GameScene, CAAT.Scene);
    exports.GameScene = GameScene;


})(typeof exports === 'undefined'? _modules['GameDirector']={} : exports);