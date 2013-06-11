(function(exports){

    function __MYSCENENAME__(owner,scene)
    {
        this.init(owner,scene);
    }

    __MYSCENENAME__.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        init : function(owner, scene)
        {
            var self = this;

            if (owner === null || owner.director === null)
                throw new Error("Scene initiated with NULL" +
                    (owner === null ? " Owner" : "") +
                    ((owner !== null &&owner.director) == null ? " Director" : ""));

            self.owner = owner;
            self.director = director;
            self.scene = scene||(director === null ? null : director.createScene());
            if (self.scene === null)
                throw new Error("Scene state created with NULL scene");
        },

        load : function(loader)
        {
            var self = this;

            // Load assets and/or create requires
        },

        enter : function(prevStateName)
        {
            var self = this;
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
        }
    };

    exports.__MYSCENENAME__ = __MYSCENENAME__;

})(typeof exports === 'undefined'? _modules['__MYSCENENAME__']={} : exports);