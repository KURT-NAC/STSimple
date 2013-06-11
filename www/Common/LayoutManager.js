(function(exports){

    function LayoutManager(w,h)
    {
        if (!LayoutManager.prototype.instance)
        {
            LayoutManager.prototype.instance = this;
            if (w && h)
                LayoutManager.prototype.instance.setDefaults(w, h);
        }
        return LayoutManager.prototype.instance;
    }

    LayoutManager.DEFAULT_FONT = "32px Arial bold";
    LayoutManager.DEFAULT_LINESPACE_FACTOR = 0;

    LayoutManager.getInstance = function()
    {
        if (!LayoutManager.prototype.instance)
            LayoutManager.prototype.instance = new LayoutManager();
        return LayoutManager.prototype.instance;
    };

    LayoutManager.prototype =
    {
        instance: null,

        screenWidth : null,
        screenHeight : null,

        views : {},

        activeElements : null,
        lastElement : null,

        emptyObj : {},
        dToR: 0.01745329251994, // relatively high accuracy PI/80

        setDefaults: function(width,height,json)
        {
            this.screenWidth = width;
            this.screenHeight = height;
            if (json)
                this.addView(json);
        },

        addView : function(json)
        {
            var self = this;

            if (!json)
                return;
            var newView = (typeof json === "string") ? JSON.parse(json) : json;
            var name = ('id' in newView ? newView['id'] : "unnamed view");
            self.views[name] = newView;
        },

        objectIsValid : function(obj)
        {
            return (obj && obj !== this.emptyObj);
        },

        getView : function(viewName)
        {
            var self = this;

            if (viewName in self.views)
                return self.views[viewName];
            throw new Error(viewName+" view not loaded");
        },

        mergePage : function(viewName, pageName, json)
        {
            var self = this;

            if (typeof json === 'undefined' || json === null)
                return;

            var view = self.getView(viewName);
            var overridePage = self.getPage(viewName, pageName);
            var defaultPage = json[pageName];
            var newPage = $.extend(true, defaultPage, overridePage);
            view.pages[pageName] = newPage;
        },

        getAllUniversalElementsInView : function (viewName)
        {
            var self = this;
            var view = self.getView(viewName);
            if (self.objectIsValid(view) &&'universalElements' in view)
                return view['universalElements'];
            console.log("Universal elements requested in "+viewName+" but none are present");
            return self.emptyObj;
        },

        getUniversalElementInView : function(viewName,elementName)
        {
            var self = this;
            if (viewName in self.views)
            {
                var universals = self.views[viewName]['universalElements'];
                if (universals)
                {
                    if (elementName in universals)
                        return universals[elementName];
                }
            }

            console.log("Universal element "+elementName+" requested in "+viewName+" but was not found");
            return self.emptyObj;
        },

        getPage : function(viewName,pageName)
        {
            var self = this;
            var view = self.getView(viewName);
            if (self.objectIsValid(view) &&'pages' in view)
            {
                if (pageName in view['pages'])
                    return view['pages'][pageName];
            }

            console.log("Page "+pageName+" requested in "+viewName+" was not found");
            return self.emptyObj;
        },

        getAllElementsInPage : function(viewName,pageName)
        {
            var self = this;
            var page = self.getPage(viewName,pageName);
            if (self.objectIsValid(page))
            {
                if ('elements' in page)
                    return page['elements'];
            }

            console.log("Elements requested from page "+pageName+" in view "+viewName+" were not found");
            return self.emptyObj;
        },

        getElementInPage : function(viewName,pageName,elementName)
        {
            var self = this;
            var page = self.getPage(viewName,pageName);
            if (self.objectIsValid(page))
            {
                if ('elements' in page && elementName in page['elements'])
                    return page['elements'][elementName]
            }

            console.log("Element "+elementName+" requested from page "+pageName+" in view "+viewName+" was not found");
            return self.emptyObj;
        },

        setActive : function(viewName,pageName)
        {
            var self = this;
            if (self.getView(viewName))
            {
                if (pageName)
                {
                    var page = self.getPage(viewName, pageName);
                    if (page)
                    {
                        self.activeElements = page['elements'];
                        if (self.activeElements)
                        {
                            console.log(pageName+" from view "+viewName+" set as Active Layout");
                            return true;
                        }
                    }
                }
                else
                {
                    self.activeElements = self.getAllUniversalElementsInView(viewName);
                    if (self.activeElements)
                    {
                        console.log("Universal Elements from view "+viewName+" set as Active Layout");
                        return true;
                    }
                }
            }
            console.log("Setting active elements failed for page "+(pageName||"universal elements")+" in view "+viewName);
            return false;
        },

        getElementFromActive : function(elementName)
        {
            var self = this;
            if (!self.activeElements)
            {
                console.log("Active Elements not set");
                return self.emptyObj;
            }

            if (elementName in self.activeElements)
            {
                self.lastElement = self.activeElements[elementName];
                return self.lastElement;
            }

            console.log(elementName+" Not found in active elements");
            return self.emptyObj;
        },

        getLastActivatedElement : function()
        {
            var self = this;
            if (!self.lastElement)
            {
                console.log("Last Element not set");
                return self.emptyObj;
            }
            return self.lastElement;
        },

        positionCAATActorByElement : function(actor,elementName,viewName,pageName)
        {
            var self = this;
            if (!actor)
                throw new Error("Cannot position NULL CAAT Actor");

            var el = null;
            if (!elementName && !viewName && !pageName)
                el = self.lastElement;

            if (elementName && !el)
            {
                var elements = null;
                if (!viewName || !pageName)
                    elements = self.activeElements;
                else
                    elements = self.views[viewName]['pages'][pageName]['elements'];
                if (elements)
                    el = elements[elementName];
            }

            if (el)
            {
                var textActor = 'text' in actor;
                var textElement = self.elementIsText(el);
                if (textActor != textElement)
                {
                    console.log("Cannot position "+(textActor ? "text" : "non-text")+
                                " actor from "+(textElement ? "text": "standard")+" element");
                    return false;
                }

                if (textActor)
                {
                    actor.setTextAlign(el['textAlign'])
                         .setTextBaseline(el['textBaseline'])
                         .setPosition(el['x'], el['y']);
                    return true;
                }

                var w = el['width'] === -1 ? actor.width : el['width'];
                var h = el['height'] === -1 ? actor.height : el['height'];
                actor.setPosition(el['x'], el['y']).
                      setScale(w/actor.width, h/actor.height);
                return true;
            }

            console.log("Could not position CAAT Actor from element");
            return false;
        },

        applyElementToCAATActor : function(layoutElement,actor,idAsString,forceScale)
        {
            var self = this;
            var textActor = 'text' in actor;
            var textElement = self.elementIsText(layoutElement);
            var copyString = idAsString||false;
            forceScale = forceScale||((layoutElement['width'] && layoutElement['height']) ? true : false);

            var regX = 0;
            var regY = 0;
            if (layoutElement['regX'] || layoutElement['regY'])
            {
                regX = layoutElement['regX'] || 0;
                regY = layoutElement['regY'] || 0;
                actor.setPositionAnchored(layoutElement['x'], layoutElement['y'], regX, regY);
            }
            else
                actor.setPosition(layoutElement['x'], layoutElement['y']);

            if (layoutElement['rotRegX'] || layoutElement['rotRegY'])
            {
                regX = layoutElement['rotRegX'] || 0;
                regY = layoutElement['rotRegY'] || 0;
                actor.setRotationAnchor(regX, regY);
            }
            if (layoutElement['rotation'])
                actor.setRotation(layoutElement['rotation']*self.dToR);

            if (layoutElement['alpha'])
                actor.setAlpha(layoutElement['alpha']);

            if (!textActor || forceScale)
            {
                var textActorSave = textActor;
                textActor = 'textWidth' in actor;
                var aw = (textActor ? actor.textWidth : actor.width);
                aw = aw === 0 ? 1 : aw;
                var ah = (textActor ? actor.textHeight : actor.height);
                ah = ah === 0 ? 1 : ah;
                var ew = layoutElement['width'] || -1;
                var eh = layoutElement['height'] || -1;
                var w = ew === -1 ? aw : ew;
                var h = eh === -1 ? ah : eh;
                actor.setScale(w/aw, h/ah);
                textActor = textActorSave;
            }

            // Always apply text data first if possible to allow for appropriate scaling later
            if (textActor)
            {
                if (!textElement && !copyString)
                {
                    console.log("Cannot fully apply non-text layout element to text actor");
                }
                else
                {
                    if (copyString)
                    {
                        var txt = layoutElement['text'] || layoutElement['id'];
                        actor.setText(txt);
                    }

                    var font = layoutElement['font'] || LayoutManager.DEFAULT_FONT;
                    var fill = self.fillFromTextElement(layoutElement);
                    var base = layoutElement['textBaseline'] || "top";
                    var align = layoutElement['textAlign'] || "center";
                    actor.setFont(font).
                        setTextFillStyle(fill).
                        setTextAlign(align).
                        setTextBaseline(base);
                }
            }
            else
            {
                if (layoutElement['fill'])
                    actor.setFillStyle(self.fillFromTextElement(layoutElement));
            }

            if (layoutElement.hasOwnProperty('visible'))
                actor.setVisible(layoutElement.visible);
        },


        ////////////////////
        // Helper functions
        elementIsText: function(element)
        {
            if (element.type === 'text')
                return true;
            else
                return 'textAlign' in element;
        },

        fillFromTextElement: function(tElement)
        {
            var fill = tElement['fill']||'white';
            if (fill.indexOf(',') > -1)
            {
                fill = fill.split(',');
                fill = (new CAAT.Color.RGB(fill[0], fill[1], fill[2])).toHex();
            }
            return fill;
        },

        addSpecificElementsToObject: function(activeElements,target,filter)
        {
            var addedObjects = [];

            filter = filter||null;
            if (filter)
            {
                if (typeof filter !== 'string')
                {
                    console.log("Cannot filter vs non string values; ignoring. "+filter);
                    filter = null;
                }
            }

            if (activeElements)
            {
                var self = this;
                var addAs = "addObject";
                if (target instanceof Array)
                    addAs = "push";
                else if (target instanceof CAAT.ActorContainer)
                    addAs = "addChild";

                var el = null;
                var actor = null;
                var autoText = true;
                var hasEvents = false;
                for (var element in activeElements)
                {
                    el = activeElements[element];
                    if (filter != null)
                    {   // Search name to see if it passes the loose filter test
                        //var elName = new String(element);
                        if (element.search(filter) === -1)
                            continue;
                    }

                    // use type first, fallback to id to maintain compatibility with the older scheme.
                    var type = el['type'] || el['id'];

                    if (type === "threeSliceActor")
                    {
                        actor = self.createThreeSliceActor(el);
                    }
                    else if (type === "navigationButton")
                    {
                        actor = self.createNavigationButton(el);
                    }
                    else if (type === "toggleButton")
                    {
                        actor = self.createToggleButton(el);
                        hasEvents = true;
                    }
                    else if (type === "fancyButton")
                    {
                        actor = self.createFancyButton(el);
                    }
                    else if (type === "flipBook")
                    {
                        actor = self.createFlipBook(el);
                    }
                    else if (type === "socialObject")
                    {
                        actor = self.createSocialObject(el);
                        hasEvents = true;
                    }
                    else if (type.search("shape") !== -1)
                    {
                        actor = new CAAT.ShapeActor();
                        if (!el['width'] || !el['height'])
                            throw new Error("Shape actor must have a size");
                        actor.setSize(el['width'], el['height']);

                        var shape = type.substring(type.indexOf(" ")+1);
                        if (shape === "circle")
                            actor.setShape(0);
                        else if (shape === "rect")
                            actor.setShape(1);
                        else
                            console.log("Unknown shape encountered "+shape);

                        self.applyElementToCAATActor(el, actor, false);
                    }
                    else if (type === "ratingObject")
                    {
                        actor = new (require('RatingObject').RatingObject)();
                        self.applyElementToCAATActor(el, actor, false);
                        hasEvents = true;
                    }
                    else if (type === "versusObject")
                    {
                        actor = new (require('VersusObject').VersusObject)();
                        self.applyElementToCAATActor(el, actor, false);
                    }
                    else if (type === "textFieldObject")
                    {
                        actor = new (require('TextFieldObject').TextFieldObject)();
                        self.applyElementToCAATActor(el, actor, false);
                    }
                    else if (type === "feedbackObject")
                    {
                        actor = new (require('FeedbackObject').FeedbackObject)();
                        self.applyElementToCAATActor(el, actor, false);
                    }
                    else if (type === "turnButton")
                    {
                        actor = self.createTurnButton(el);
                    }
                    else if (type === 'timerActor')
                    {
                        actor = self.createTimerActor(el);
                    }
                    else if (type === "progressBar")
                    {
                        actor = self.createProgressBar(el);
                    }
                    else if (self.elementIsText(el))
                    {
                        actor = new CAAT.TextActor();
                        self.applyElementToCAATActor(el, actor, true);
                    }
                    else
                    {
                        // unknown type so assume basic actor and id is the image
                        var result = g_loader.getResult(el['img'] ||el['id']);
                        if (!result)
                            continue;

                        actor = new CAAT.Actor().setBackgroundImage(result, true, false);
                        self.applyElementToCAATActor(el, actor);
                    }

                    actor.enableEvents(hasEvents);
                    actor.setId(el['id']);

                    switch(addAs)
                    {
                        case "push":
                            target.push(actor);
                            break;

                        case "addChild":
                            target.addChild(actor);
                            break;

                        case "addObject":
                            target[el['id']] = actor;
                            break;

                        default:
                            console.log("Adding all actors, cannot add "+addAs);
                            break;
                    }
                    addedObjects.push(actor);
                    actor = null;
                }
            }

            return addedObjects;
        },

        addAllElementsToObject : function(target,view,page,filter)
        {
            var self = this;
            var activeElements = null;
            if (!page)
                activeElements = self.getAllUniversalElementsInView(view);
            else
                activeElements = self.getAllElementsInPage(view, page);

            self.addSpecificElementsToObject(activeElements, target, filter);
        },

        createFlipBook: function(el)
        {
            var self = this;

            var actor = new (require('FlipBook').FlipBook)();
            actor.init(el.id, el.data);
            self.applyElementToCAATActor(el, actor, false);

            if (el.autoPlay)
                actor.play();

            return actor;
        },

        createSocialObject: function(el)
        {
            var self = this;

            var actor = new (require('SocialObject').SocialObject)();
            actor.init(el.labels, el.iconFactor, el.labelFactor);
            actor.addItems(el.items);
            self.applyElementToCAATActor(el, actor, false);

            return actor;
        },

        createTurnButton: function(el)
        {
            var self = this;

            var actor = new (require('TurnButton').TurnButton)();
            actor.init();
            self.applyElementToCAATActor(el, actor, false);

            return actor;
        },

        createTimerActor: function(el)
        {
            var self = this;

            var actor = new (require('TimerActor').TimerActor)();
            var config = {
                'backgroundImg' : el.img,
                'font' : el.font,
                'fill' : el.fill
            };
            actor.init(config);
            self.applyElementToCAATActor(el,actor,false);
            return actor;

        },

        createThreeSliceActor: function(el, callback)
        {
            var self = this;

            callback = callback||null;
            var actor = new (require('ThreeSliceActor').ThreeSliceActor)();

            var srcInit = el['init'];
            var init = {};
            for (var prop in srcInit)
                init[prop] = srcInit[prop];
            if (init['img'])
                init['img'] = g_loader.getResult(init['img']);
            if (init['map'])
                init['map'] = g_loader.getResult(init['map']);
            if(callback)
                init.fn = callback;

            actor.initializeWithObject(init);
            self.applyElementToCAATActor(el, actor, true);

            return actor;
        },

        createNavigationButton: function (el, callback)
        {
            var self = this;
            var actor = new (require('NavigationButton').NavigationButton)();

            callback = callback||null;
            actor.init(el['text'], callback, 0);
            if (el['orientation'])
            {
                actor.orientation = el['orientation'] === "vertical" ?
                    require('FancyButton').FancyButton.ORIENTATION_VERTICAL :
                    require('FancyButton').FancyButton.ORIENTATION_HORIZONTAL;
            }

            if (el['adjust'])
            {
                if (actor.orientation === require('FancyButton').FancyButton.ORIENTATION_HORIZONTAL)
                    actor.setVerticalAdjust(el['adjust']);
                else
                    actor.setHorizontalAdjust(el['adjust']);
            }

            var fnt = el['font'];
            if (fnt)
            {
                actor.setFont(fnt, 0);
            }

            self.applyElementToCAATActor(el, actor, false);

            var decoration = el['decoration'];
            if (decoration)
            {
                actor.decorate(decoration['iconName'], decoration['element']);
            }

            return actor;
        },

        createToggleButton: function(el, callback)
        {
            var self = this;
            // Setup and initialize with object
            var actor = new (require('ToggleButton').ToggleButton)();

            callback = callback||null;
            var cSrc = el['config'];
            var config = {};
            for (var prop in cSrc)
                config[prop] = cSrc[prop];
            if (config['buttonImage'])
                config.buttonImage = g_loader.getResult(config['buttonImage']);
            if (config['map'])
                config.map = g_loader.getResult(config['map']);
            if (callback)
                config.callback = callback;

            if (config['orientation'])
            {
                config.orientation = config['orientation'] === "vertical" ?
                    require('FancyButton').FancyButton.ORIENTATION_VERTICAL :
                    require('FancyButton').FancyButton.ORIENTATION_HORIZONTAL;
            }

            actor.init(config);
            var ts = el['textStyle'];
            if (ts)
                actor.setTextActorStyle(ts['font'], ts['fillStyle'], ts['align'], ts['baseline']);

            if (el['adjust'])
            {
                if (config.orientation === require('FancyButton').FancyButton.ORIENTATION_HORIZONTAL)
                    actor.setVerticalAdjust(el['adjust']);
                else
                    actor.setHorizontalAdjust(el['adjust']);
            }

            self.applyElementToCAATActor(el, actor, false);

            if (typeof config['text'] != 'undefined')
            {
                actor.setText(config['text']);
            }

            var mainFont = el['font'];
            if (mainFont)
            {
                actor.setFont(mainFont, 0);
            }

            var reposText = el['mainTextPos'];
            if (reposText)
            {
                actor.positionText(0, reposText);
            }

            // Some additional steps post the apply
            var ar = el['addImages'];
            var i = 0;
            if (ar)
            {
                for (i = 0; i < ar.length; i++)
                {
                    actor.addImage(g_loader.getResult(ar[i]['id']), ar[i]['pos'], ar[i]['centered']);
                    if (ar[i]['width'] && ar[i]['height'])
                        actor.scaleImage(i, ar[i]['width'], ar[i]['height']);
                }
            }
            ar = el['addText'];
            if (ar)
            {
                for (i = 0; i < ar.length; i++)
                {
                    actor.addText(ar[i]['id'], ar[i]['pos'], ar[i]['align'], ar[i]['fill'], ar[i]['font']);
                    ts = ar[i]['textStyle'];
                    if (ts)
                        actor.setTextActorStyle(ts['font'], ts['fillStyle'], ts['align'], ts['baseline'], i);
                }
            }

            return actor;
        },

        createProgressBar: function(el, callback)
        {
            var self = this;
            // Setup and initialize with object
            var actor = new (require('ProgressBar').ProgressBar)();

            var config = $.extend({}, el.config || {});
            if ('full' in config)
                config.full = g_loader.getResult(config.full);
            if ('empty' in config)
                config.empty = g_loader.getResult(config.empty);
            if (callback)
                config.callback = callback;

            actor.init(config);

            self.applyElementToCAATActor(el, actor, false);

            return actor;
        },

        createFancyButton: function(el, callback)
        {
            var self = this;
            // Setup and initialize with object
            var actor = new (require('FancyButton').FancyButton)();

            callback = callback||null;
            var cSrc = el['config'];
            var config = {};
            for (var prop in cSrc)
                config[prop] = cSrc[prop];
            if (config['backgroundImg'])
                config.backgroundImg = g_loader.getResult(config['backgroundImg']);
            if (config['buttonImage'])
                config.buttonImage = g_loader.getResult(config['buttonImage']);
            if (config['map'])
                config.map = g_loader.getResult(config['map']);
            if (callback)
                config.callback = callback;

            actor.init(config);
            var ts = el['textStyle'];
            if (ts)
                actor.setTextActorStyle(ts['font'], ts['fillStyle'], ts['align'], ts['baseline']);

            if (el['orientation'])
            {
                actor.orientation = el['orientation'] === "vertical" ?
                    require('FancyButton').FancyButton.ORIENTATION_VERTICAL :
                    require('FancyButton').FancyButton.ORIENTATION_HORIZONTAL;
            }

            if (el['adjust'])
            {
                if (actor.orientation === require('FancyButton').FancyButton.ORIENTATION_HORIZONTAL)
                    actor.setVerticalAdjust(el['adjust']);
                else
                    actor.setHorizontalAdjust(el['adjust']);
            }

            self.applyElementToCAATActor(el, actor, false);

            if (typeof config['text'] != 'undefined')
            {
                actor.setText(config['text']);
            }

            var mainFont = el['font'];
            if (mainFont)
            {
                actor.setFont(mainFont, 0);
            }

            var reposText = el['mainTextPos'];
            if (reposText)
            {
                actor.positionText(0, reposText);
            }

            // Some additional steps post the apply
            var ar = el['addImages'];
            var i = 0;
            if (ar)
            {
                for (i = 0; i < ar.length; i++)
                {
                    actor.addImage(g_loader.getResult(ar[i]['id']), ar[i]['pos'], ar[i]['centered'], ar[i]['adjust']);
                    if (ar[i]['width'] && ar[i]['height'])
                        actor.scaleImage(i, ar[i]['width'], ar[i]['height']);
                }
            }
            ar = el['addText'];
            if (ar)
            {
                for (i = 0; i < ar.length; i++)
                {
                    actor.addText(ar[i]['id'], ar[i]['pos'], ar[i]['align'], ar[i]['fill'], ar[i]['font'], ar[i]['adjust']);
                    ts = ar[i]['textStyle'];
                    if (ts)
                        actor.setTextActorStyle(ts['font'], ts['fillStyle'], ts['align'], ts['baseline'], i);
                }
            }

            return actor;
        },

        getActorFromArrayByID: function(array,id,all)
        {
            all = all||false;
            var actors = $.grep(array,
                function(element, index)
                {
                    return element.getId() === id;
                });
            if (!actors)
            {
                console.log("Actor "+id+" could not be found in given array");
                console.log(array);
                return null;
            }
            return all ? actors : actors[0];
        },

         _positionFromElement: function(element,page)
         {  // TODO:
             /*
             * I was considering allowing text values for x and y parameters of an element.
             * Then each element would have to store a copy of it's view x,y,w,h and could use that
             *      information to position itself appropriately.
             *  Applicable values would be
             *  "center"
             *  "top"
             *  "bottom"
             *  "left"
             *  "right"
             *  */
         },

        adjustDockElements: function(srcView, srcPage)
        {
            var self = this;

            var crop = -g_game.globalOffset.x / g_game.globalScale.x;
            if (crop <= 0)
                return;

            var dockElements = self.getAllElementsInPage(srcView, srcPage);
            for (var elementName in dockElements)
            {
                var element = dockElements[elementName];
                if (!element.dockGroup)
                    continue;
                if (element.dockGroup == "left")
                    element.x += crop;
                else if (element.dockGroup == "right")
                    element.x -= crop;
                delete element.dockGroup;
            }
        }

    };

    exports.LayoutManager = LayoutManager;

})(typeof exports === 'undefined'? _modules['LayoutManager']={} : exports);
