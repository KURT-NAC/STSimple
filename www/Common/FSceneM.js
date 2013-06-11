(function(exports){
    "use strict";

    function FSceneM(director)
    {
        FSceneM.superclass.constructor.call(this);
        this.director = director;
        return this;
    }

    FSceneM.prototype =
    {
        director : null,

        addState : function(id,scene,onEnter,onTick,onLeave)
        {
            var self = this;

            if (self.director == null)
                throw "FSM has NULL director";

            if (self.states[id])
                throw "state " + id + " already exists";

            self.states[id] =
            {
                name : id,
                enter : onEnter,
                tick : onTick,
                leave : onLeave,
                scene : scene,
                sceneIdx : (scene == null) ? -1 : self.director.scenes.indexOf(scene)
            }
        },

        addSceneState : function(id,state)
        {
            var self = this;

            if (self.director == null)
                throw "FSM has NULL director";

            if (self.states[id])
                throw "state " + id + " already exists";

            // add or set some variables the FSM requires
            state.name = id;
            state.sceneIdx = self.director.scenes.indexOf(state.scene);

            self.states[id] = state;
        },

        gotoState : function(id, stateData)
        {
            var self = this;

            // ignore state changes to ourself
            if (self.current.name == id)
                return;

            // find the requested state
            var newState = self.states[id];
            if (!newState)
                throw "unknown state: " + id;
            if (newState.sceneIdx < 0 || newState.sceneIdx >= self.director.scenes.length)
                throw "state "+id+" scene index is out of range "+newState.sceneIdx;

            // call leave on current state
            if (self.current.leave)
                self.current.leave( newState.name );

            // remember exiting state name
            var oldStateName = self.current.name;

            // switch to new state
            self.current = newState;
            self.director.setScene(self.current.sceneIdx);// TODO: Expand for animated transitions
            if (self.current.enter)
                self.current.enter(oldStateName, stateData);
        },

        removeState : function(id)
        {
            var self = this;

            // safety
            if (self.current.name == id)
            {
                console.log("Cannot remove currently active state!");
                return;
            }

            // remove if exists
            if (id in self.states)
            {
                var s = self.states[id];
                if (s.scene !== null && s.sceneIdx >= 0 && s.sceneIdx < self.director.scenes.length)
                {   // tell CAAT that we're done with self scene
                    s.scene.setDiscardable(true);
                    s.scene.setExpired(true);

                    self.director.scenes = self.director.scenes.slice(s.sceneIdx);
                }

                delete self.states[id];
            }
        },

        getState : function(id)
        {
            var self = this;

            // remove if exists
            if (id in self.states)
            {
                return self.states[id];
            }

            return null;
        },

        addAllStatesToManifest : function(manifest)
        {
            var self = this;
            for (var propertyName in self.states)
            {
                if ('addToManifest' in self.states[propertyName])
                    self.states[propertyName].addToManifest(manifest);
            }
        },

        postLoadAllStates : function()
        {
            var self = this;
            for (var propertyName in self.states)
            {
                if ('postLoad' in self.states[propertyName])
                    self.states[propertyName].postLoad();
            }
        }
    };

    extend( FSceneM, require('FSM').FSM );
    exports.FSceneM = FSceneM;

})(typeof exports === 'undefined'? _modules['FSceneM']={} : exports);