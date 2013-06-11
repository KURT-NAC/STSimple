(function(exports){
    "use strict";

    function FSM()
    {
        this.current =  { name : '__none' };
        this.states = {};
        return this;
    }

    FSM.prototype =
    {
        current : null,

        states : null,

        addState : function(id,onEnter,onTick,onLeave)
        {
            var self = this;

            if (self.states[id])
                throw "state " + id + " already exists";

            self.states[id] =
            {
                name : id,
                enter : onEnter,
                tick : onTick,
                leave : onLeave
            }

        },

        gotoState : function(id)
        {
            var self = this;

            // ignore state changes to ourself
            if (self.current.name == id)
                return;

            // find the requested state
            var newState = self.states[id];
            if (!newState)
                throw "unknown state: " + id;

            // call leave on current state
            if (self.current.leave)
                self.current.leave( newState.name );

            // remember exiting state name
            var oldStateName = self.current.name;

            // switch to new state
            self.current = newState;
            if (self.current.enter)
                self.current.enter(oldStateName);
        },

        stop : function()
        {
            var self = this;
            var none = '__none';
            if (self.current && self.current.leave)
                self.current.leave(none);
            this.current =  { name : none };
        },

        active : function()
        {
            return this.current.name !== '__none';
        },

        currentState : function()
        {
            return this.current.name;
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
                delete self.states[id];
            }
        },

        tick : function(deltaTime)
        {
            var self = this;

            if (self.current.tick)
            {
                self.current.tick(deltaTime);
                return true;
            }
            else
            {
                return false;
            }
        }
    }

    exports.FSM = FSM;

})(typeof exports === 'undefined'? _modules['FSM']={} : exports);