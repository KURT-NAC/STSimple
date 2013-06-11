(function(exports){

    function RecordClip(owner,director)
    {
        this.init(owner,director);
    }

    RecordClip.prototype =
    {
        ////////////////////
        // Constants
        States :
        {
            RecordFrontEnd : 'rfe',
            Record : 'rec',
            Library : 'lib',
            Complete : 'complete'
        },

        ////////////////////

        owner : null,
        director : null,
        scene : null,

        fsm : null,

        bg : null,
        loadTxt : null,

        commentBar : null,
        commentTxt : null,

        init : function(owner, director, scene)
        {
            var self = this;

            if (owner === null || director === null)
            {
                throw new Error("Scene initiated with NULL" +
                    (owner === null ? " Owner" : "") +
                    (director == null ? " Director" : ""));
            }

            self.owner = owner;
            self.director = director;
            self.scene = scene||(director === null ? null : director.createScene());
            if (self.scene === null)
                throw new Error("Scene state created with NULL scene");

            self.fsm = new (require('FSM').FSM)();

            self.fsm.addState(self.States.RecordFrontEnd,
                self._recordFE_Enter(),
                null,
                self._recordFE_Leave()
            );

            self.fsm.addState(self.States.Record,
                self._record_Enter(),
                null,
                self._record_Leave()
            );

            self.fsm.addState(self.States.Library,
                self._library_Enter(),
                null,
                self._library_Leave()
            );

            self.fsm.addState(self.States.Complete,
                self._complete_Enter(),
                null,
                self._complete_Leave()
            );
        },

        postLoad : function()
        {
            var self = this;
        },

        enter : function(prevStateName, stateData)
        {
            var self = this;

            self.fsm.gotoState(self.States.RecordFrontEnd);
        },

        tick : function(deltaTime)
        {
            var self = this;
        },

        leave : function(targetStateName)
        {
            var self = this;
            self.fsm.stop();
        },

        ///////////////////////////////////////////////////////////////////////////
        // Sub States

        _recordFE_Enter : function()
        {
            var self = this;
            return function(prevState)
            {
                g_layout.setActive('main','recordClip');

                var header = new CAAT.Actor();
                header.setBackgroundImage(g_loader.getResult('topDarkener'), true);
                var element = g_layout.getElementInPage('main', 'recordClip', 'titleBG');
                g_layout.applyElementToCAATActor(element, header, true, true);
                self.scene.addChild(header);

                var lineBreak = new CAAT.Actor();
                lineBreak.setBackgroundImage(g_loader.getResult('footerBreak'), true);
                var element = g_layout.getElementInPage('main', 'recordClip', 'break');
                g_layout.applyElementToCAATActor(element, lineBreak, true, true);
                self.scene.addChild(lineBreak);

                // title banner & text
                var els = [];
                els.push(g_layout.getElementFromActive('titleBanner'));
                els.push(g_layout.getElementFromActive('titleText'));
                var texts = g_layout.addSpecificElementsToObject(els,self.scene);

                // take a picture button
                var sprite = new CAAT.SpriteImage();
                sprite.initialize(g_loader.getResult('cameraBtn'), 1, 2);
                var cameraBtn = new CAAT.Actor();
                cameraBtn.setAsButton(sprite, 0, 0, 1, 0, function(evt){ self._onRecordClick(); });
                g_layout.positionCAATActorByElement(cameraBtn,"cameraBtn");
                self.scene.addChild(cameraBtn);

                // library banner & text
                var els = [];
                els.push(g_layout.getElementFromActive('cameraBanner'));
                els.push(g_layout.getElementFromActive('cameraText'));
                var texts = g_layout.addSpecificElementsToObject(els,self.scene);

                // library button
                var sprite = new CAAT.SpriteImage();
                sprite.initialize(g_loader.getResult('libraryBtn'), 1, 2);
                var libraryBtn = new CAAT.Actor();
                libraryBtn.setAsButton(sprite, 0, 0, 1, 0, function(evt){ self._onLibraryClick(); });
                g_layout.positionCAATActorByElement(libraryBtn,"libraryBtn");
                self.scene.addChild(libraryBtn);

                // take a picture banner & text
                var els = [];
                els.push(g_layout.getElementFromActive('libraryBanner'));
                els.push(g_layout.getElementFromActive('libraryText'));
                var texts = g_layout.addSpecificElementsToObject(els,self.scene);

                // footer - choose a video button
                var footer = new CAAT.Actor();
                footer.setBackgroundImage(g_loader.getResult('footer'), true);
                var element = g_layout.getElementInPage('sub', 'recordClip', 'footer');
                g_layout.applyElementToCAATActor(element, footer, true, true);
                self.scene.addChild(footer);

                var clickEvent = function(evt){ self._onChooseClick(evt); };
                var element = g_layout.getElementInPage('sub', 'recordClip', 'chooseBtn');
                var button = g_layout.createNavigationButton(element, clickEvent);
                self.scene.addChild(button);
            }
        },

        _onRecordClick : function(evt)
        {
            var self = this;
            self.fsm.gotoState(self.States.Record);
        },

        _onLibraryClick : function(evt)
        {
            var self = this;
            self.fsm.gotoState(self.States.Library);
        },

        _onChooseClick : function(evt)
        {
            var self = this;
            self.owner.fsm.gotoState(self.owner.GameStates.StockPhotos, { "fromStore":false });
        },

        _recordFE_Leave : function()
        {
            var self = this;
            return function(nextState)
            {
                self.scene.emptyChildren();
            }
        },

        // Record
        _record_Enter : function()
        {
            var self = this;
            return function(prevState)
            {
                if (self.owner.onDevice)
                {
                    var options = {
                        quality : 100,
                        destinationType : Camera.DestinationType.FILE_URI,
                        sourceType : Camera.PictureSourceType.CAMERA,
                        allowEdit : true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth : 768,
                        targetHeight : 728
                    };

                    navigator.camera.getPicture( self._captureSuccess(), self._captureError(), options );
                }
                else
                {
                    self.owner.showGenericDialog("Coming Soon!", "In browser picture taking", "OK");
                    self.fsm.gotoState(self.States.RecordFrontEnd);
                }
            }
        },

        _record_Leave : function()
        {
            var self = this;
            return function(newState)
            {
            }
        },

        _captureSuccess : function()
        {
            var self = this;
            return function(imageURI)
            {
                console.log("_captureSuccess: " + imageURI);
                self.picturePath = imageURI;
                self.fsm.gotoState(self.States.Complete);
            }
        },

        _captureError : function(err)
        {
            var self = this;
            return function(err)
            {
                delete self.picturePath;
                self.fsm.gotoState(self.States.RecordFrontEnd);
            }
        },

        // library
        _library_Enter : function()
        {
            var self = this;
            return function(prevState)
            {
                if (self.owner.onDevice)
                {
                    var options = {
                        quality : 100,
                        destinationType : Camera.DestinationType.FILE_URI,
                        sourceType : Camera.PictureSourceType.PHOTOLIBRARY,
                        allowEdit : true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth : 768,
                        targetHeight : 728
                    };

                    navigator.camera.getPicture( self._captureSuccess(), self._captureError(), options );
                }
                else
                {
                    self.owner.showGenericDialog("Coming Soon!", "In browser picture selection", "OK");
                    self.fsm.gotoState(self.States.RecordFrontEnd);
                }
            }
        },

        _library_Leave : function()
        {
            var self = this;
            return function(nextState)
            {
            }
        },

        // Complete
        _complete_Enter : function()
        {
            var self = this;
            return function(prevState)
            {
                if (self.picturePath)
                {
                    self.owner.showLoadingDialog("Uploading...");
                    self.owner.clientConnection.uploadPicture( self.picturePath, '', self._onSendComplete() );
                }
                else
                {
                    self.owner.showGenericDialog("Error", "Unexpected state in _send_Enter", "OK");
                }
            }
        },

        _complete_Leave : function()
        {
            var self = this;
            return function(newState)
            {
            }
        },

        _onSendComplete : function()
        {
            var self = this;
            return function(err,gameState)
            {
                self.owner.hideLoadingDialog();

                if (!err)
                {
                    self.owner.gotoGame( self.owner.clientConnection.game.id );
                }
                else
                {
                    console.log("error sending photo:");
                    console.log(err);
                }
            }
        }
    };

    exports.RecordClip = RecordClip;

})(typeof exports === 'undefined'? _modules['RecordClip']={} : exports);