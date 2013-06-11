(function(exports){

    function AudioManager()
    {
        if (!AudioManager.prototype.instance)
        {
            AudioManager.prototype.instance = this;
        }
        return AudioManager.prototype.instance;
    }

    AudioManager.getInstance = function()
    {
        if (!AudioManager.prototype.instance)
            AudioManager.prototype.instance = new AudioManager();
        return AudioManager.prototype.instance;
    };

    AudioManager.prototype =
    {
        instance: null,
        owner: null,
        muteSFX: false,
        muteMusic: false,
        musicCue: null,

        fadeDirIn: false,
        fadeElapsed: -1,
        fadeDuration: 0,

        init : function(owner)
        {
            var self = this;
            self.owner = owner;
            return this;
        },

        tick : function(deltaTime)
        {
            var self = this;

            if (self.fadeElapsed >= 0)
            {
                self.fadeElapsed += deltaTime;
                var vol = self.fadeElapsed / self.fadeDuration;


                if (vol >= 1)
                {
                    vol = 1;
                    self.fadeElapsed = -1;
                    self.fadeDuration = 0;

                    if (!self.fadeDirIn)
                        self.pauseMusic(true);
                }

                if (!self.fadeDirIn)
                    vol = 1 - vol;

                self.setMusicVolume(vol);
            }
        },

        mute : function(bMute)
        {
            var self = this;
            self.muteSFX = bMute;
            return self;
        },

        toggleSFX : function()
        {
            var self = this;
            self.muteSFX = !self.muteSFX;
            return self;
        },

        toggleMusic : function()
        {
            var self = this;
            self.muteMusic = !self.muteMusic;
            self.pauseMusic(self.muteMusic);
            return self;
        },

        playSound : function(id, loop)
        {
            var self = this;

            loop = loop || false;

            if (loop)
            {
                if (self.musicCue)
                    return;

                if (self.owner.onDevice)
                {
                    self.musicCue = g_loader.getResult(id);
                    if (self.musicCue && !self.muteMusic)
                        self.musicCue.play({ numberOfLoops: -1 });
                }
                else
                {
                    self.musicCue = self.owner.director.audioLoop(id);

                    if (self.muteMusic)
                        self.musicCue.pause();
                }
            }
            else
            {
                if (self.muteSFX)
                    return;

                if (self.owner.onDevice)
                {
                    var cue = g_loader.getResult(id);
                    if (cue)
                        cue.play();
                }
                else
                    self.owner.director.audioPlay(id);
            }
        },

        pauseMusic : function(pause)
        {
            var self = this;

            if (!self.musicCue)
                return;

            if (pause)
            {
                self.musicCue.pause();
            }
            else if (!self.muteMusic && self.musicCue !== null)
            {
                if (self.owner.onDevice)
                    self.musicCue.play({ numberOfLoops: -1 });
                else
                    self.musicCue.play();
            }
        },

        setMusicVolume : function(vol)
        {
            var self = this;

            if (!self.musicCue)
                return;

            if (self.owner.onDevice)
            {
                //vol *= 100;
                self.musicCue.setVolume(vol);
            }
            else
                self.musicCue.volume = vol;
        },

        fadeMusicIn : function(duration)
        {
            var self = this;

            if (!self.musicCue)
                return;

            self.fadeDirIn = true;
            self.fadeElapsed = 0;
            self.fadeDuration = duration;
            self.setMusicVolume(0);

            self.pauseMusic(false);
        },

        fadeMusicOut : function(duration)
        {
            var self = this;

            if (!self.musicCue)
                return;

            self.fadeDirIn = false;
            self.fadeElapsed = 0;
            self.fadeDuration = duration;
        },

        stopAllSounds : function()
        {
            var self = this;
            self.owner.director.endSound();
            return self;
        }
    };

exports.AudioManager = AudioManager;

})(typeof exports === 'undefined'? _modules['AudioManager']={} : exports);