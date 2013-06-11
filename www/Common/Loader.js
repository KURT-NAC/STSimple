(function(exports){

    "use strict";

    function Loader()
    {
        if (!Loader.prototype.instance)
            Loader.prototype.instance = this;
        return Loader.prototype.instance;
    }

        Loader.getInstance = function()
        {
            if (!Loader.prototype.instance)
                Loader.prototype.instance = new Loader();
            return Loader.prototype.instance;
        };

    Loader.prototype =
    {
        instance: null,

        lDirector : null,
        spriteCache: null,// TODO: Investigate creating and caching CAAT SpriteImages, then returning image.getRef() when get Result is called

        media : null,// contains phonegap style audio if needed
        json : null,

        init : function(director, manifest, onDevice, onComplete)
        {
            var self = this;

            // setup
            self.lDirector = director;
            self.doLoad(manifest, onDevice, onComplete);
        },

        doLoad : function(manifest, onDevice, onComplete)
        {
            var self = this;

            // default args
            manifest = manifest || {};
            onComplete = onComplete || function(){};
            onDevice = onDevice || false;

            // split manifest by file type
            var imgManifest = new Array();
            var audioManifest = new Array();
            var jsonManifest = new Array();

            for (var curId in manifest)
            {
                var url = manifest[curId];
                var optional = false;
                if (typeof(url) != "string")
                {
                    var entry = manifest[curId];
                    url = entry.url;
                    optional = !!entry.optional;
                }
                var filetype = url.substring(url.lastIndexOf('.')+1);

                var curObj = new Object();
                curObj.id = curId;
                curObj.url = url;
                curObj.optional = optional;

                if (filetype === "mp3" || filetype === "ogg")
                {
                    audioManifest.push(curObj);
                }
                else if (filetype === "json")
                {
                    jsonManifest.push(curObj);
                }
                else
                {
                    imgManifest.push(curObj);
                }
            }

            // Load chain
            if (jsonManifest.length > 0)
                self.json = {};
            if (onDevice)
                self.media = {};

            // Images
            var caatImageLoader = new CAAT.ImagePreloader().
                loadImages(imgManifest,
                    function(counter, images)
                    {
                        if (counter == images.length)
                        {
                            self.lDirector.setImagesCache(images);

                            // Audio
                            self.loadAudio(audioManifest,
                                function()
                                {
                                    // JSON
                                    self.loadJSON(jsonManifest,
                                        function()
                                        {
                                            // Load done
                                            onComplete(null);
                                        });
                                });
                        }
                    },
                    function(e, i)
                    {
                        console.log("Image loading error! Index: " + i + " " + imgManifest[i].url);
                    });
        },

        loadAudio : function(audioManifest, cb)
        {
            var self = this;

            for (var i = 0; i < audioManifest.length; i++)
            {
                if (self.media !== null)
                    self.media[audioManifest[i].id] = new Media(audioManifest[i].url);
                else
                    self.lDirector.addAudio(audioManifest[i].id, audioManifest[i].url);
            }

            if (cb)
                cb();
        },

        loadJSON : function(jsonManifest, cb)
        {
            var self = this;

            // build array for async
            var asyncArray = [];
            for (var i = 0; i < jsonManifest.length; i++)
                asyncArray[i] = self.buildRequest(jsonManifest[i].url, jsonManifest[i].optional);

            if (asyncArray.length > 0)
            {
                // async
                async.parallel(asyncArray,
                    function(err,results)
                    {
                        if (err !== null)
                            throw new Error("Loader encountered error "+err);

                        for (var i = 0; i < jsonManifest.length; i++)
                        {
                            if (typeof results[i] === "string")
                                results[i] = JSON.parse(results[i]);
                            self.json[jsonManifest[i].id] = results[i];
                        }

                        if (cb)
                            cb();
                    });
            }
            else
            {
                if (cb)
                    cb();
            }
        },

        buildRequest : function(url, optional)
        {
            return function(cb)
            {
                var xhr = $.getJSON(url, function(data)
                            {
                                cb(null, data);
                            }).
                            error(function()
                            {
                                cb(optional ? null : ("Could not load "+url), null);
                            });
            };
        },

        getResult : function(id)
        {
            var self = this;

            if (self.media && id in self.media)
            {
                if (self.media !== null)
                    return self.media[id];
                return self.lDirector.audioManager.getAudio(id);
            }
            else if (self.json && id in self.json)
            {
                return self.json[id];
            }
            return self.lDirector.getImage(id);
        }

    };

    exports.Loader = Loader;

})(typeof exports === 'undefined'? _modules['Loader']={} : exports);