(function(exports){

    function KeyboardGuess()
    {
    }

    KeyboardGuess.prototype =
    {
        // constants
        breakChar: "\n",//"<br>",
        ////////////

        owner: null,    // Main game, should contain loader, layout ...

        srcImg: null,
        srcMap: null,

        keyPrefix: "",
        blankPrefix: "",
        guessedPrefix: "",

        guess: {
            containerEl: null,
            container: null,
            padX: 0,
            padY: 0,
            cols: 0,
            rows: 0,
            spaceMod: 0.25
        },
        letters: {
            containerEl: null,
            container: null,
            padX: 0,
            padY: 0,
            cols: 0,
            rows: 0
        },

        blankKeyCount: 0,
        guessedKeyCount: 0,

        target: "",
        currentVals: [],
        callback: null,

        listenerIdx: -1,

        inputEnabled: true,

        initialize: function(owner, view, page)
        {
            var self = this;
            var el = null;
            self.owner = owner;
            g_layout.setActive(view, page);

            // get info
            el = g_layout.getElementFromActive("keyboardData");
            if (!el)
                throw new Error("Cannot find keyboard data in layout");
            self.srcImg = g_loader.getResult(el['img']);
            self.srcMap = g_loader.getResult(el['map']);
            if (!self.srcImg || !self.srcMap)
                throw new Error("Cannot load "+(!self.srcImg?"alphabet image":"")+(!self.srcMap?"alphabet map":""));
            self.keyPrefix = el['keyPrefix']||"";
            self.blankPrefix = el['blankPrefix']||"";
            self.guessedPrefix = el['guessedPrefix']||"";

            // build containers
            el = g_layout.getElementFromActive("keyboardGuessRegion");
            if (!el)
                throw new Error("Cannot find guess region data in layout");
            self.guess.containerEl = el;
            el = g_layout.getElementFromActive("keyboardGuessDefaults");
            if (!el)
                throw new Error("Cannot find guess defaults data in layout");
            self.guess.padX = el['padX'];
            self.guess.padY = el['padY'];
            self.guess.rows = el['rows'];
            self.guess.cols = el['cols'];
            self.guess.spaceMod = el['spaceModifier'];

            el = g_layout.getElementFromActive("keyboardKeysRegion");
            if (!el)
                throw new Error("Cannot find keys region data in layout");
            self.letters.containerEl = el;
            el = g_layout.getElementFromActive("keyboardKeysDefaults");
            if (!el)
                throw new Error("Cannot find keys defaults data in layout");
            self.letters.padX = el['padX'];
            self.letters.padY = el['padY'];
            self.letters.rows = el['rows'];
            self.letters.cols = el['cols'];

            self._createContainers();

            // build some helper arrays
            var property = null;
            for (property in self.srcMap)
            {
                if (property.indexOf(self.blankPrefix) !== -1)
                    self.blankKeyCount++;
                else if (property.indexOf(self.guessedPrefix) !== -1)
                    self.guessedKeyCount++;
            }
        },

        setVisible: function(bVis)
        {
            var self = this;
            self.guess.container.visible = bVis;
            self.letters.container.visible = bVis;
        },

        _createContainers: function()
        {
            var self = this;
            var el = self.guess.containerEl;
            self.guess.container = (new CAAT.ActorContainer()).
                                   setBounds(el['x'], el['y'], el['width'], el['height']);

            var el = self.letters.containerEl;
            self.letters.container = (new CAAT.ActorContainer()).
                                     setBounds(el['x'], el['y'], el['width'], el['height']);
        },

        getKeyActor: function(key)
        {
            key = key||"blank";
            key = key.toLowerCase();

            var self = this;
            var letter = new CAAT.Actor();
            letter.backgroundImage = new CAAT.SpriteImage();
            letter.backgroundImage.initializeFromMap(self.srcImg, self.srcMap);
            letter.setId(key);

            var r = 0;
            if (key === "blank")
            {
                r = Math.floor(Math.random() * self.blankKeyCount)+1;
                key = self.blankPrefix+(r<10?"0":"")+r;
            }
            else if (key === "guessed")
            {
                r = Math.floor(Math.random() * self.guessedKeyCount)+1;
                key = self.guessedPrefix+(r<10?"0":"")+r;
            }
            else
            {
                key = self.keyPrefix+key;
            }

            letter.backgroundImage.setSpriteIndex(key);
            letter.setSize(letter.backgroundImage.getWidth(), letter.backgroundImage.getHeight());

            return letter;
        },

        setNewTarget: function(target, scene, completionCallback)
        {
            var self = this;

            self.cleanup();
            var i = 0;
            self.callback = completionCallback||null;

            // strip disallowed characters
            var sAr = target.split("");
            target = "";
            var s;
            for (i = 0; i < sAr.length; i++)
            {
                s = self.keyPrefix.concat(sAr[i].toLowerCase());
                if (sAr[i] !== ' ' && sAr[i] !== self.breakChar && !self.srcMap[s])
                    continue;
                target = target.concat(sAr[i]);
            }

            // break text into lines
            self.target = target;
            while (!self.stringIsValid(self.target))
            {
                self.target = self.insertBreak(self.target);
                if (typeof self.target === 'boolean' && !self.target)
                    break;
            }
            var lines = self.target.split(self.breakChar);
            if (!self.target || lines.length > self.guess.rows)
            {
                console.log(target+" does not fit in available guess characters rows("+self.guess.rows+") x cols)"+self.guess.cols+")");
                return;
            }

            // add empty guess tiles, centered x and y by line, up to guess.rows in lines
            var subContainer = new CAAT.ActorContainer();
            var sized = false;
            var line = "";
            var x = 0, y = 0;
            var a = null;

            // calculate longest line for centering all lines
            var longest = lines[0].length;
            for (i = 1; i < lines.length; i++)
            {
                if (lines[i].length > longest)
                    longest = lines[i].length;
            }
            a = self.getKeyActor();
            var aw = a.width;
            a.setDiscardable(true).setExpired();
            a = null;
            longest = (aw*longest)+(self.guess.padX*(longest-1));

            // place blank tiles
            var len = 0;
            for (i = 0; i < lines.length; i++)
            {
                line = lines[i];
                len = (aw*line.length)+(self.guess.padX*(line.length-1));
                x = ((longest-len)*0.5);
                for (var c = 0; c < line.length; c++)
                {
                    if (line.charAt(c) === ' ')
                    {
                        x += aw * self.guess.spaceMod;
                        continue;
                    }

                    a = self.getKeyActor().
                             setPosition(x, y);

                    if (!sized)
                    {
                        sized = true;
                        self.setContainerSize(lines, subContainer, a.width, a.height);
                    }

                    subContainer.addChild(a);

                    x += a.width + self.guess.padX;
                }

                y += a.height + self.guess.padY;
            }

            self.guess.container.addChild(subContainer);
            subContainer.centerAt(self.guess.container.width * 0.5, self.guess.container.height * 0.5);
            scene.addChild(self.guess.container);

            // add all target text chars and additional random chars up to keyboard rows * cols to array
            // roll through array and randomly add letter tiles
            self.target = target.replace(/\s/g, "").toLowerCase();
            var chars = self.letters.cols * self.letters.rows;
            x = 0;
            y = 0;
            var alphabet = "abcdefghijklmnopqrstuvwxyz";
            var text = self.target;
            chars -= self.target.length;
            for (i = 0; i < chars; i++)
                text = text.concat(alphabet.charAt(Math.floor(Math.random()*alphabet.length)));
            chars += self.target.length;

            // NOTE: Added alphabetizing code to reduce keyboard confusion
            //          I'm leaving the rest of the function as it was written (despite the l variable being unnecessary)
            //          It may make sense to tighten up the random letter function - CA
            var sort = text.split("");
            sort.sort();
            text = sort.toString();

            var l = 0;
            a = null;
            for (i = 0; i < chars; i++)
            {
                //l = Math.floor(Math.random()*text.length);
                l = i;

                a = self.getKeyActor(text.charAt(l)).
                         setPosition(x,y);
                a.enableEvents(true).mouseClick = self._guessLetter(a);
                self.letters.container.addChild(a);

                x += a.width + self.letters.padX;

                if (i > 0 && (i+1) % self.letters.cols === 0)
                {
                    y += a.height + self.letters.padY;
                    x = 0;
                }

                text = (text.substring(0, l)+text.substring(l+1));
            }

            for (var i = 0; i < self.target.length; i++)
                self.currentVals.push(null);

            scene.addChild(self.letters.container);

            CAAT.registerKeyListener(self._keyListener());
            self.listenerIdx = CAAT.keyListeners.length-1;

            self.inputEnabled = true;
        },

        _keyListener: function()
        {
            var self = this;
            return function(keyEvent)
            {
                if (!self.inputEnabled)
                    return;

                var container = null;
                var blankEvent = {x:0,y:0,sourceEvent:{},screenPoint:{x:0,y:0},time:0};
                var back = (keyEvent.keyCode === CAAT.Keys.BACKSPACE || keyEvent.keyCode === CAAT.Keys.DELETE)

                if (back || keyEvent.keyCode === CAAT.Keys.ENTER)
                    keyEvent.preventDefault();

                if (keyEvent.action === "down")
                    return;

                // handle backspace
                if (back)
                {
                    container = self.guess.container.childrenList[0].childrenList; // NOTE: all individual letters are stored in a single sub container
                    if (container.length > 0)
                    {
                        container[container.length-1].mouseClick(blankEvent);
                        return;
                    }
                }

                // try to guess
                var key = String.fromCharCode(keyEvent.keyCode);
                key = key.toLowerCase();
                //todo: rapid exit

                container = self.letters.container.childrenList;
                for (var i = 0; i < container.length; i++)
                {
                    if (container[i].id === key)
                    {
                        container[i].mouseClick(blankEvent);
                        return;
                    }
                }
            }
        },

        removeInvalidKeys: function(count)
        {
            var self = this;

            if (!self.inputEnabled)
                return false;

            if (!self.target || self.target.length == 0)
                return;
            var list = self.letters.container.childrenList.slice();
            var toSave = new String(self.target);
            for (var i = 0; i < toSave.length; i++)
            {
                for (var j = 0; j < list.length; j++)
                {
                    if (toSave[i] === list[j].id)
                    {
                        list.splice(j, 1);
                        break;
                    }
                }
            }

            // don't remove any blank tiles where placed letters used to live
            for (var i = 0; i < list.length; i++)
            {
                if (list[i].id === 'guessed')
                {
                    list.splice(i, 1);
                    i--;
                }
            }

            var placedActors = self.guess.container.childrenList[0].childrenList.slice();

            for (var i = toSave.length; i < placedActors.length; i++)
            {
                var isValid = false;
                for (var j = 0; j < toSave.length; j++)
                {
                    if (toSave[j] === placedActors[i].id)
                    {
                        isValid = true;
                        break;
                    }
                }

                if (!isValid)
                {
                    list.push(placedActors[i]);
                }
            }

            if (list.length === 0)
                return false;

            var actor = null;
            var at = 0;
            while (count > 0)
            {
                at = Math.floor(Math.random()*list.length);
                actor = list[at];

                // this letter was currently placed in word
                if (typeof actor.curIdx !== 'undefined')
                {
                    self.currentVals[actor.curIdx] = null;
                    var curBlank = actor.curBlank;

                    if (curBlank.parent)
                    {
                        curBlank.parent.removeChild(curBlank);

                        curBlank.setDiscardable(true).
                            setExpired().
                            setParent(null).
                            enableEvents(false);
                    }
                }

                if (actor.parent)
                    actor.parent.removeChild(actor);

                actor.setDiscardable(true).
                      setExpired().
                      setParent(null).
                      enableEvents(false);

                list.slice(at, 1);
                count--;

                if (list.length === 0)
                    return true;
            }
            return true;
        },

        cleanup: function()
        {
            var self = this;

            var i = 0;
            var subcont = self.guess.container.childrenList[0];
            if (subcont)
            {
                for (i = 0; i < subcont.childrenList.length; i++)
                {
                    subcont.getChildAt(i).
                             setExpired().
                             setDiscardable(true).
                             setParent(null);
                }
                subcont.emptyChildren();
                subcont.setExpired().
                        setDiscardable(true).
                        setParent(null);
            }
            self.guess.container.emptyChildren();
            if (self.guess.container.parent)
            {
                self.guess.container.parent.removeChild(self.guess.container);
                self.guess.container.setParent(null);
            }
            self.guess.container.setExpired().
                                 setDiscardable(true);
            self.guess.container = null;

            for (i = 0; i < self.letters.container.childrenList.length; i++)
            {
                self.letters.container.getChildAt(i).
                    setExpired().
                    setDiscardable(true).
                    setParent(null);
            }
            self.letters.container.emptyChildren();
            if (self.letters.container.parent)
            {
                self.letters.container.parent.removeChild(self.letters.container);
                self.letters.container.setParent(null);
            }
            self.letters.container.setExpired().
                                   setDiscardable(true);
            self.letters.container = null;

            if (self.listenerIdx !== -1)
            {
                CAAT.keyListeners.splice(self.listenerIdx, 1);
                self.listenerIdx = -1;
            }

            self.currentVals.splice(0, self.currentVals.length);
            self._createContainers();
        },

        // keyboard letter press function
        _guessLetter: function(actor)
        {
            var self = this;
            return function(event)
            {
                if (!self.inputEnabled)
                    return;

                // validate
                var openIdx = self.getNextOpenIdx();
                if (openIdx === -1)
                    return;

                // dim source
                var blank = self.getKeyActor("guessed").setPosition(actor.x, actor.y);
                actor.parent.addChild(blank);

                // move to available blank, resize, set un-guess
                actor.parent.removeChild(actor);
                actor.setParent(null);
                var container = self.guess.container.childrenList[0]; // NOTE: all individual letters are stored in a single sub container
                var target = container.getChildAt(openIdx);
                actor.centerAt(target.x+(target.width*0.5), target.y+(target.height*0.5)).
                      setScale(target.width/actor.width, target.height/actor.height);
                container.addChild(actor);

                actor.enableEvents(true).mouseClick = self._unGuessLetter(openIdx, actor, blank);
                actor.curIdx = openIdx;
                actor.curBlank = blank;

                // advance
                self.updateGuess(openIdx, actor.id);
            }
        },

        // guessed letter press function
        _unGuessLetter: function(index, actor, blank)
        {
            var self = this;
            return function(event)
            {
                if (!self.inputEnabled)
                    return;

                // position at source, un-scale
                actor.parent.removeChild(actor);
                actor.setParent(null);
                actor.setPosition(blank.x, blank.y).setScale(1, 1);
                self.letters.container.addChild(actor);

                // remove blank, set guess
                blank.parent.removeChild(blank);
                blank.setParent(null);
                blank.setExpired().setDiscardable(true);

                actor.mouseClick = self._guessLetter(actor);

                // retreat
                self.updateGuess(index, null);
            }
        },

        // check guess correct
        updateGuess: function(index, newLetter)
        {
            var self = this;

            if (!newLetter)
            {
                self.currentVals[index] = null;
            }
            else
            {
                self.currentVals[index] = newLetter;

                if (self.getNextOpenIdx() === -1)
                    self.checkGuess();
            }
        },
        checkGuess: function()
        {
            var self = this;
            var result = false;
            var current = '';

            for (var i = 0; i < self.currentVals.length; i++)
            {
                if (self.currentVals[i])
                    current += self.currentVals[i];
            }

            if (current === self.target)
                result = true;
            if (self.callback)
                self.callback(result);
        },

        // Text management helpers
        stringIsValid: function(txt)
        {
            var self = this;
            var ar = txt.split(self.breakChar);
            for (var i = 0; i < ar.length; i++)
            {
                if (ar[i].length > self.guess.cols)
                    return false;
            }
            return true;
        },
        insertBreak: function(text)
        {
            var self = this;
            var ar = text.split(self.breakChar);

            // NOTE: we are assuming that if any line breaks have been added then they have been added by this function
            var s = ar[ar.length-1];

            // find the space <= max characters (guess key columns)
            var idx = self.guess.cols;
            while (idx >= 0 && s.charAt(idx) !== ' ')
                idx--;
            if (idx >= 0)
            {
                s = s.substring(0, idx)+self.breakChar+s.substring(idx+1);
                ar.splice(ar.length-1, 1);
                return ar.join(self.breakChar)+(ar.length > 0 ? self.breakChar : "")+s;
            }
            else
            {
                console.log(s+" is longer than max ("+self.guess.cols+") characters");
                return false;
            }
        },
        setContainerSize: function(sAr, container, aW, aH)
        {
            var self = this;
            var width = sAr[0].length;
            for (var i = 1; i < sAr.length; i++)
            {
                if (sAr[i].length > width)
                    var width = sAr[i].length;
            }

            container.setSize(((aW*width)+(self.guess.padX*(width-1))), ((aH*sAr.length)+(self.guess.padY*(sAr.length-1))));
        },
        getNextOpenIdx: function()
        {
            var self = this;

            for (var i = 0; i < self.currentVals.length; i++)
            {
                if (self.currentVals[i] === null)
                    return i;
            }
            return -1;
        },
        enableInput: function()
        {
            var self = this;
            self.inputEnabled = false;
        },
        disableInput: function()
        {
            var self = this;
            self.inputEnabled = false;
        }
    };

    exports.KeyboardGuess = KeyboardGuess;

})(typeof exports === 'undefined'? _modules['KeyboardGuess']={} : exports);