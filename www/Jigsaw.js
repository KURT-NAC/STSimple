(function (exports) {

    var SNAP_DISTANCE_THRESHOLD = 20;    // Pixel threshold for pieces snapping to each other
    var BOUNDING_REGION_PADDING = 10;    // Pixel padding for AABBs
    var GRID_SPACING_MULTIPLIER = 1;    // Multiplied by sliceWidth/Height to determine grid spacing
    // e.g. A sliceWidth of 256 and multiplier of 0.5 will result
    // in a grid spacing of 128 pixels between each piece.

    var MAGNET_ANIMATION_TIME = 500;    // How long a piece takes to move into position when activating the magnet
    var SOLVE_ANIMATION_TIME = 1000;    // How long a piece takes to move into position when activating the magnet

    /* Shuffles the contents of an array */
    function shuffle(array) {
        var tmp, current, top = array.length;

        if(top) while(--top) {
            current = Math.floor(Math.random() * (top + 1));
            tmp = array[current];
            array[current] = array[top];
            array[top] = tmp;
        }

        return array;
    }


    /**
     * This Actor will show the result of a static image processing operation.
     * (i.e., like CAAT.IMActor, but only applied once.)
     *
     * @constructor
     * @extends CAAT.ActorContainer
     */
    function StaticIMActor() {
        StaticIMActor.superclass.constructor.call(this);
        return this;
    }

    StaticIMActor.prototype= {
        imageProcessor : null,
        imageDirty : false,

        setImageProcessor : function(im) {
            this.imageProcessor = im;
            this.imageDirty = true;
            return this;
        },

        paint : function( director, time ) {
            if (this.imageDirty)
            {
                this.imageProcessor.apply(director, time);
                this.imageDirty = false;
            }
            this.imageProcessor.paint(director, time);
        }
    };

    extend( StaticIMActor, CAAT.ActorContainer, null);


    /**
     * Retrieves a color from a bitmap at the specified index
     */
    function getColor(data, index) {
        return data[index] + (data[index + 1] * 256) + (data[index + 2] * 65536);
    }

    /**
     * Compares two colors. Returns true if difference in color
     * values is below a given threshold
     * Note: Threshold is currently hard-coded to 16.
     */
    function compareColors(c1, c2, threshold) {
        return !((c1 & 0xF0F0F0) ^ (c2 & 0xF0F0F0));
        /*
         var difference = 0;

         difference += Math.abs((c2 & 0xFF) - (c1 & 0xFF));
         difference += Math.abs(((c2 / 256) & 0xFF) - ((c1 / 256) & 0xFF));
         difference += Math.abs(((c2 / 65536)|0) - ((c1 / 65536)|0));

         return difference <= threshold
         */
    }

    // Dilates the "true" portions of a bitmask image by 1 pixel
    function dilateBoolImage(image, width, height)
    {
        var result = image.slice(0);
        for (var y = 0; y < height; ++y)
        {
            for (var x = 0; x < width; ++x)
            {
                var index = y * width + x;
                if (image[index])
                    continue;
                if (
                    ((y > 0) && image[index - width]) ||
                    ((y < height - 1) && image[index + width]) ||
                    ((x > 0) && image[index - 1]) ||
                    ((x < width - 1) && image[index + 1])
                )
                    result[index] = true;
            }
        }
        return result;
    }

    function generateTemplateMaskData(templateImageData, sliceWidth, sliceHeight)
    {
        var columns = Math.floor(templateImageData.width / sliceWidth);
        var rows = Math.floor(templateImageData.height / sliceHeight);

        var maskPixels = templateImageData.data;

        // Maximum possible size of a single puzzle piece - this accounts for
        // the arms of the pieces that reach into other cells
        var kernelWidth = sliceWidth * 2.0;
        var kernelHeight = sliceHeight * 2.0;

        var pieceData = [];

        for (var y = 0; y < rows; ++y) {
            for (var x = 0; x < columns; ++x) {

                // Compute the center point of this piece
                var center = { x: sliceWidth * (0.5 + x), y: sliceHeight * (0.5 + y) };
                center.x = Math.floor(center.x);
                center.y = Math.floor(center.y);

                // Get the color value at the center of the mask
                var maskColor = getColor(maskPixels, (center.y * templateImageData.width + center.x) * 4);

                var dstPixels = new Array(kernelWidth * kernelHeight);

                var yyDestMin = center.y - sliceHeight;
                var yyMin = Math.max(0, yyDestMin);
                var yyMax = Math.min(templateImageData.height, center.y + sliceHeight);

                var xxDestMin = center.x - sliceWidth;
                var xxMin = Math.max(0, xxDestMin);
                var xxMax = Math.min(templateImageData.width, center.x + sliceWidth);

                // Keep track of min/max values so that we can shrink the actor's bounding region for a tight fit
                var minX = xxMax;
                var minY = yyMax;
                var maxX = xxMin;
                var maxY = yyMin;

                for (var yy = yyMin; yy < yyMax; ++yy) {
                    // If the pixel in the template matches the mask color, use this pixel from the source image
                    var srcIndex = (yy * templateImageData.width + xxMin) * 4; // Position in mask/source rects
                    var dstLine = ((yy - yyDestMin) * kernelWidth);
                    for (var xx = xxMin; xx < xxMax; ++xx, srcIndex += 4) {
                        var dstIndex = (xx - xxDestMin) + dstLine;
                        if (compareColors(maskColor, getColor(maskPixels, srcIndex), 32)) {
                            if (xx < minX)
                                minX = xx;
                            if (xx > maxX)
                                maxX = xx;
                            if (yy < minY)
                                minY = yy;
                            if (yy > maxY)
                                maxY = yy;

                            dstPixels[dstIndex] = true;
                        }
                        else
                            dstPixels[dstIndex] = false;
                    }
                }
                ++maxX;
                ++maxY;

                minX = Math.max(minX - 1, xxMin);
                minY = Math.max(minY - 1, yyMin);
                maxX = Math.min(maxX + 1, xxMax);
                maxY = Math.min(maxY + 1, yyMax);

                dstPixels = dilateBoolImage(dstPixels, kernelWidth, kernelHeight);

                var rleData = [];
                for (var yy = minY - yyDestMin; yy < (maxY - yyDestMin); ++yy)
                {
                    var rleLine = [];
                    var rleValue = false;
                    var rleRun = 0;
                    for (var xx = minX - xxDestMin; xx < (maxX - xxDestMin); ++xx)
                    {
                        var newValue = dstPixels[yy * kernelWidth + xx];
                        if (newValue != rleValue)
                        {
                            rleLine.push(rleRun);
                            rleValue = newValue;
                            rleRun = 0;
                        }
                        ++rleRun;
                    }
                    if (rleValue)
                        rleLine.push(rleRun);
                    rleData.push(rleLine);
                }

                pieceData.push({
                    rle: rleData,
                    bounds: {minX: minX, minY: minY, maxX: maxX, maxY: maxY}
                });
            }
        }

        return {
            width: templateImageData.width,
            height: templateImageData.height,
            sliceWidth: sliceWidth,
            sliceHeight: sliceHeight,
            pieces: pieceData
        };
    }

    /**
     * Returns an array of CAAT.IMActors
     */
    function sliceImage(sourceImageData, templateData, sliceWidth, sliceHeight) {

        var columns = Math.floor(templateData.width / sliceWidth);
        var rows = Math.floor(templateData.height / sliceHeight);

        var srcPixels = sourceImageData.data;

        // Maximum possible size of a single puzzle piece - this accounts for
        // the arms of the pieces that reach into other cells
        var kernelWidth = sliceWidth * 2.0;
        var kernelHeight = sliceHeight * 2.0;

        var sliceList = [];
        var maskData = templateData.pieces;

        for (var y = 0; y < rows; ++y) {
            for (var x = 0; x < columns; ++x) {

                // Compute the center point of this piece
                var center = { x: sliceWidth * (0.5 + x), y: sliceHeight * (0.5 + y) };
                center.x = Math.floor(center.x);
                center.y = Math.floor(center.y);

                // Make a new IMActor and image processor
                var imgProcessor = new CAAT.ImageProcessor().initialize(kernelWidth, kernelHeight);
                var dstPixels = imgProcessor.imageData.data;
                var imActor = new StaticIMActor().setImageProcessor(imgProcessor).setSize(kernelWidth, kernelHeight);

                // Is this an edge piece?
                imActor.isEdge = (x == 0 || x == columns - 1 || y == 0 || y == rows - 1);
                // Store the row and column
                imActor.column = x;
                imActor.row = y;

                var mask = maskData[y * columns + x];

                var yyDestMin = center.y - sliceHeight;
                var yyMin = mask.bounds.minY;
                var yyMax = mask.bounds.maxY;

                var xxDestMin = center.x - sliceWidth;
                var xxMin = mask.bounds.minX;
                var xxMax = mask.bounds.maxX;

                // Keep track of min/max values so that we can shrink the actor's bounding region for a tight fit
                var minX = mask.bounds.minX - xxDestMin;
                var minY = mask.bounds.minY - yyDestMin;
                var maxX = mask.bounds.maxX - xxDestMin;
                var maxY = mask.bounds.maxY - yyDestMin;
                var maskRle = mask.rle;

                for (var yy = yyMin; yy < yyMax; ++yy) {
                    // If the pixel in the template matches the mask color, use this pixel from the source image
                    var srcIndex = (yy * templateData.width + xxMin) * 4; // Position in mask/source rects
                    var maskLine = maskRle[yy - yyMin];
                    var dstLine = (yy - yyDestMin) * kernelWidth * 4;
                    var dstIndex = dstLine + (xxMin - xxDestMin) * 4;
                    for (var m = 0; m < maskLine.length; m += 2)
                    {
                        var skip = maskLine[m] * 4;
                        srcIndex += skip;
                        dstIndex += skip;
                        var write = maskLine[m + 1] * 4;

                        for (; write; --write, ++dstIndex, ++srcIndex)
                            dstPixels[dstIndex] = srcPixels[srcIndex];

                        /* Does not seem to be wokring on iPad
                            dstPixels.set(srcPixels.subarray(srcIndex, srcIndex + write), dstIndex);
                            dstIndex += write;
                            srcIndex += write;
                        */
                    }
                }

                // Now adjust the offset of the processed image so it's centered within the actor
                imgProcessor.offsetX = -minX + BOUNDING_REGION_PADDING;
                imgProcessor.offsetY = -minY + BOUNDING_REGION_PADDING;

                // Recalculate the bounds of the actor and center the image
                var expectedOffset = { x: (minX - (kernelWidth - maxX)) * 0.5, y: (minY - (kernelHeight - maxY)) * 0.5 };
                center.x += expectedOffset.x;
                center.y += expectedOffset.y;

                imActor.setSize(maxX - minX + BOUNDING_REGION_PADDING * 2, maxY - minY + BOUNDING_REGION_PADDING * 2);

                // Store the origin for this piece
                imActor.setPositionAnchored(center.x, center.y, 0.5, 0.5);
                imActor.origin = { x: center.x, y: center.y };
                imActor.centerOffset = { x: expectedOffset.x, y: expectedOffset.y };

                sliceList.push(imActor);
            }
        }

        return sliceList;
    }


    function getTrueOffset(piece)
    {
        var gx = (piece.group != undefined) ? piece.group.x : 0;
        var gy = (piece.group != undefined) ? piece.group.y : 0;

        var tx = piece.x - piece.origin.x + gx;
        var ty = piece.y - piece.origin.y + gy;

        return { x: tx, y: ty };
    }

    function arePiecesNeighbors(p1, p2)
    {
        if (p1.row == p2.row)
            return Math.abs(p1.column - p2.column) == 1;
        else if (p1.column == p2.column)
            return Math.abs(p1.row - p2.row) == 1;
        return false;
    }

    function PuzzleContainerFindFunc(point)
    {
        if (!this.visible)
            return null;

        this.modelViewMatrixI = this.modelViewMatrix.getInverse();
        this.modelViewMatrixI.transformCoord(point);

        if (!this.contains(point.x, point.y))
            return null;

        // Check to see if the mouse position lands on a pixel value
        /*
         var bitmap = this.imageProcessor.imageData;
         var pixelData = bitmap.data;
         var xPixel = (point.x - this.x) + (256);
         var yPixel = (point.y - this.y) + (256);
         var pixelIndex = (yPixel * bitmap.width + xPixel) * 4;
         if (pixelIndex > 0 && pixelIndex < pixelData.length)
         {
         var pixelColor = getColor(pixelData, pixelIndex);
         pixelData[pixelIndex] = 255;
         pixelData[pixelIndex+1] = 0;
         pixelData[pixelIndex+2] = 0;
         pixelData[pixelIndex+3] = 255;
         return (pixelColor.a != 0) ? this : null;
         }
         else
         */
        return this;
    }

    function enableTransparentChildren(container)
    {

        // We have to implement our own 'findActorAtPosition' function, because CAAT does not support
        // click-throughs in transparent regions of an Actor's AABB.
        container.findActorAtPosition = function(point)
        {
            if( null===CAAT.ActorContainer.superclass.findActorAtPosition.call(this,point) ) {
                return null;
            }

            // z-order
            var cl = this.childrenList;
            for (var i = cl.length - 1; i >= 0; i--) {
                var child = this.childrenList[i];

                var np = new CAAT.Point(point.x, point.y, 0);
                var contained = child.findActorAtPosition(np);
                if (null !== contained) {
                    return this;
                }
            }

            // If nothing was found, bubble up to the top and try the next actor at this position
            return null;
        }
    }


    function Jigsaw(inOwner, inDirector, inScene, srcImg, templateConfig)
    {
        this.init(inOwner, inDirector, inScene, srcImg, templateConfig);
    }

    Jigsaw.prototype =
    {
        owner : null,
        director : null,
        scene : null,

        showOnlyEdges : false,
        gameWon : false,

        puzzlePieces : null,
        // A list of all piece and group CAAT.Actors
        puzzlePieceGroups : [],

        puzzleContainer : {},
        swipeContainer : {},

        puzzleInfo : {
            width : 0,
            height : 0,
            rows : 0,
            columns : 0
        },

        // External events
        onComplete : function() {},
        notifiedComplete : false,
        onEdgesExhausted : function() {},
        onDropPiece : function(/* dropInfo */) {},

        init : function(inOwner, inDirector, inScene, srcImg, templateConfig)
        {
            var self = this;

            self.owner = inOwner;
            self.director = inDirector;
            self.scene = inScene;

            CAAT.registerKeyListener( function(keyEvent) {
                if (keyEvent.action == 'down')
                {
                    // 'E'
                    if (keyEvent.keyCode == CAAT.Keys.e)
                    {
                        self.toggleEdgeOnlyTray();
                    }

                    // 'W'
                    if (keyEvent.keyCode == CAAT.Keys.w)
                    {
                        self.onComplete();
                    }
                }
            });

            // Look up images
            var templateImg = g_loader.getResult(templateConfig.template);
            var templateData = g_loader.getResult(templateConfig.template + '_data');

            // Set up an ImageProcessor canvas
            var imageProcessor = new CAAT.ImageProcessor().initialize(srcImg.width, srcImg.height);

            var srcImgData = imageProcessor.grabPixels(srcImg);
            var templateImgData = imageProcessor.grabPixels(templateImg);

            // If the source image size does not match the template, we need to resize it
            if (srcImgData.width != templateImgData.width || srcImgData.height != templateImgData.height)
            {
                var newImg = CAAT.modules.ImageUtil.createThumb(srcImg, templateImgData.width, templateImgData.height, false);
                srcImgData = imageProcessor.grabPixels(newImg);
            }

            // Dependent on the template image
            var sliceWidth = templateConfig.sliceWidth;
            var sliceHeight = templateConfig.sliceHeight;
            self.scene.puzzleSliceWidth = sliceWidth;
            self.scene.puzzleSliceHeight = sliceHeight;

            // Make a container for the puzzle pieces
            self.puzzleContainer = new CAAT.ActorContainer().setBounds(0, 66, templateImgData.width, templateImgData.height).setClip(true);
            self.scene.addChild(self.puzzleContainer);
            self.puzzleContainer.setZOrder(-1);

            /****************************************************
             * Set up the ScrollView container. Define a couple of
             * methods that will handle dragging events in the
             * tray control.
             ****************************************************/
            // Make a ScrollView container to store pieces
            var onDragBegin = function(piece, clickPos)
            {
                if (piece != null)
                {
                    piece.parent.removeChild(piece);

                    self.scene.addChild(piece);
                    piece.setScale(1, 1);
                    piece.parent.viewToModel(clickPos);
                    piece.setPosition(clickPos.x,clickPos.y);
                }
            };

            var onDragEnd = function(piece)
            {
                self.moveToBoard(piece, true);

                self.swipeContainer.sort();

                var dropSpot = self.getSpot(piece);
                self.notifyDrop({
                    fromBoard: false,
                    toBoard: true,
                    group: false,
                    correct: (piece.row == dropSpot.row) && (piece.column == dropSpot.column),
                    index: piece.index
                });
            };

            var ScrollView = require('ScrollViewHack').ScrollViewHack;
            var swipeHeight = 98;
            self.swipeContainer = new ScrollView().init(0, g_game.mainSize.y - (swipeHeight + 4), g_game.mainSize.x, swipeHeight, true, self.director, self.scene, onDragBegin, onDragEnd, null);
            self.swipeContainer.fill.setAlpha(0);

            /****************************************************/

            // Slice it up
            if (!templateData || (templateData.width != templateImgData.width) || (templateData.height != templateImgData.height))
            {
                console.log("Missing template data!");
                templateData = generateTemplateMaskData(templateImgData, sliceWidth, sliceHeight);
                if (!g_game.onDevice)
                {
                    var dataUrl = "data:text/json;charset=utf-8," + encodeURI(JSON.stringify(templateData));
                    window.open(dataUrl);
                }
            }

            self.puzzleInfo.width = templateData.width;
            self.puzzleInfo.height = templateData.height;
            self.puzzleInfo.sliceWidth = sliceWidth;
            self.puzzleInfo.sliceHeight = sliceHeight;
            self.puzzleInfo.rows = Math.floor(templateData.height / sliceHeight);
            self.puzzleInfo.columns = Math.floor(templateData.width / sliceWidth);

            console.log("Starting slicing");
            self.puzzlePieces = sliceImage(srcImgData, templateData, sliceWidth, sliceHeight);
            console.log("Finished slicing");

            var shuffledPieces = [];
            for (var i = 0; i < self.puzzlePieces.length; ++i) {
                var piece = self.puzzlePieces[i];

                piece.scene = self.scene;
                piece.index = i;
                piece.row = (i / self.puzzleInfo.columns)|0;
                piece.column = (i % self.puzzleInfo.columns)|0;
                piece.drop = self.dropPiece.bind(self, piece);

                //self.enableDrag(piece);
                //piece.findActorAtPosition = self.puzzleContainerFindFunc;
                piece.enableEvents(false);

                //self.puzzleContainer.addChild(piece);
                piece.setScale(0.3, 0.3);
                //piece.setLocation(0, 0);
                //self.swipeContainer.addActor(piece, 0);
                shuffledPieces.push(piece);
            }

            // Randomly add the pieces to the swipe tray
            shuffle(shuffledPieces);
            for (var i = 0; i < shuffledPieces.length; ++i)
            {
                self.swipeContainer.addActor(shuffledPieces[i], 0);
            }

            self.puzzlePieceGroups = [];

            // Draw bounding boxes around all puzzle pieces/groups
            /*
             self.puzzleContainer.paint = function (director, time) {
             var ctx = director.ctx;

             for (var i = 0; i < this.getNumChildren(); ++i) {
             var child = this.getChildAt(i);
             child.drawScreenBoundingBox(director, time);
             }
             };
             */

            // Randomly place all of the pieces
            //self.randomizePieces();
        },

        /* External interface */

        toggleEdgeOnlyTray: function()
        {
            var self = this;

            self.showOnlyEdges = !self.showOnlyEdges;

            for (var i = 0; i < self.swipeContainer.scrollContainer.getNumChildren(); ++i)
            {
                var piece = self.swipeContainer.scrollContainer.getChildAt(i);
                // This only affects pieces that are not part of a group
                piece.setVisible(!(self.showOnlyEdges && !piece.isEdge));
            }

            self.swipeContainer.sort();
        },

        loadFromJSON : function(jsonString)
        {
            var self = this;

            var jsonObj = JSON.parse(jsonString);
            if (jsonObj == null)
                return;

            self.resetPuzzle();

            for (var i = 0; i < jsonObj.groups.length; ++i)
            {
                // There have to be at least two pieces in a group, so we'll just re-use
                // the same code that's used when pieces are dragged together on the board
                var groupData = jsonObj.groups[i];
                if (groupData.pieces.length < 2)
                    continue;

                var p1 = self.puzzlePieces[groupData.pieces[0].index];
                var p2 = self.puzzlePieces[groupData.pieces[1].index];
                var group = self.createGroup(p1, p2);
                for (var j = 2; j < groupData.pieces.length; ++j)
                {
                    var p = self.puzzlePieces[groupData.pieces[j].index];
                    self.addToGroup(p, group);
                }

                group.setLocation(groupData.pos.x, groupData.pos.y);
            }

            for (var i = 0; i < jsonObj.pieces.length; ++i)
            {
                var pData = jsonObj.pieces[i];
                var p = self.puzzlePieces[pData.index];
                p.setPosition(pData.x, pData.y);

                if (pData.inTray)
                {
                    self.moveToTray(p);
                }
            }

            self.swipeContainer.sort();
        },

        saveToJSON : function()
        {
            var self = this;

            // For each group, list the pieces
            var jsonObj = { groups: [], pieces: [] };
            for (var i = 0; i < self.puzzlePieceGroups.length; ++i)
            {
                var group = self.puzzlePieceGroups[i];
                var groupData = { pos: { x: group.x, y: group.y }, pieces: [] };
                for (var j = 0; j < group.getNumChildren(); ++j)
                {
                    var piece = group.getChildAt(j);
                    groupData.pieces.push( { index: piece.index, x: piece.x, y: piece.y } );
                }

                jsonObj.groups.push(groupData);
            }

            for (var i = 0; i < self.puzzlePieces.length; ++i)
            {
                var piece = self.puzzlePieces[i];
                if (piece.group == undefined)
                {
                    var pieceObj =
                    {
                        index: piece.index,
                        x: piece.x,
                        y: piece.y,
                        row: (piece.index / self.puzzleInfo.columns)|0,
                        column: (piece.index % self.puzzleInfo.columns)|0,
                        inTray: piece.parent == self.swipeContainer.scrollContainer
                    };
                    jsonObj.pieces.push( pieceObj );
                }
            }

            return JSON.stringify(jsonObj);
        },

        magnetizePiece : function(pieceIndex, neighborCount)
        {
            var self = this;

            var piece = self.puzzlePieces[pieceIndex];
            self.animatePieceToOrigin(piece, MAGNET_ANIMATION_TIME);

            if (neighborCount == 0)
                return;

            var sortedPieces = self.puzzlePieces.slice(0);

            sortedPieces.sort(function(a, b){
                var aDistSqr = (a.row-piece.row)*(a.row-piece.row) + (a.column-piece.column)*(a.column-piece.column);
                var bDistSqr = (b.row-piece.row)*(b.row-piece.row) + (b.column-piece.column)*(b.column-piece.column);
                return aDistSqr - bDistSqr;
            });

            var neighbors = [];
            var sortSwiper = false;
            for (var i = 0; (neighbors.length < neighborCount) && (i < sortedPieces.length); ++i)
            {
                var neighbor = sortedPieces[i];
                if (neighbor.group)
                    continue;
                if (neighbor.parent == self.swipeContainer.scrollContainer)
                {
                    self.moveToBoard(neighbor, false);
                    sortSwiper = true;
                }
                else
                {
                    var neighborSpot = self.getSpot(neighbor);
                    if ((neighbor.row == neighborSpot.row) && (neighbor.column == neighborSpot.column))
                        continue;
                }
                neighbors.push(neighbor);
            }
            if (sortSwiper)
                self.swipeContainer.sort();
            for (var i = 0; i < neighbors.length; ++i)
                self.animatePieceToOrigin(neighbors[i], MAGNET_ANIMATION_TIME);
        },

        solvePuzzle : function()
        {
            var self = this;

            for (var groupIndex = 0; groupIndex < self.puzzlePieceGroups.length; groupIndex++)
            {
                var group = self.puzzlePieceGroups[groupIndex];
                self.disableDrag(group);
                self.animatePieceToOrigin(group, SOLVE_ANIMATION_TIME);
            }

            for (var pieceIndex = 0; pieceIndex < self.puzzlePieces.length; pieceIndex++)
            {
                var piece = self.puzzlePieces[pieceIndex];
                if (piece.group)
                    continue;
                if (piece.parent == self.swipeContainer.scrollContainer)
                    self.moveToBoard(piece);
                self.disableDrag(piece);
                self.animatePieceToOrigin(piece, SOLVE_ANIMATION_TIME);
            }
        },


        /* Internal implementation details */

        animatePieceToOrigin : function(piece, animTime)
        {
            var self = this;

            piece.visible = true;

            var offset = {x:0, y:0};
            var dest;
            var spotPiece = piece;
            if (piece.isContainer)
            {
                var p0 = piece.getChildAt(0);
                offset = getTrueOffset(p0);
                dest = {x: piece.x - offset.x, y: piece.y - offset.y};
                spotPiece = p0;
            }
            else
            {
                dest = piece.origin;
            }
            var curSpot = self.getSpot(spotPiece);
            if ((curSpot.row == spotPiece.row) && (curSpot.column == spotPiece.column))
                return;

            var animation = new CAAT.Path()
                .setLinear( piece.x, piece.y, dest.x,dest.y );
            var interpolator = new CAAT.Interpolator().createExponentialInOutInterpolator(4,false);
            var movementBehavior = new CAAT.PathBehavior()
                .setPath(animation)
                .setInterpolator(interpolator)
                .addListener({
                    behaviorExpired: function() {
                        piece.emptyBehaviorList();
                        // Note: Performing the drop during the input loop appears to be very, very bad.
                        setTimeout(function(){
                            piece.animating = false;
                            piece.drop();
                            self.notifyDrop({
                                fromBoard: false,
                                toBoard: false,
                                group: piece.isContainer,
                                correct: true,
                                index: piece.isContainer ? null : piece.index
                            });
                        }, 1)
                    }
                })
                .setFrameTime(self.scene.time, animTime);

            piece.animating = true;
            piece.addBehavior(movementBehavior);
        },

        dropPiece : function(piece)
        {
            var self = this;

            // Align the piece to the grid
            self.snapToGrid(piece);
            self.doDropPiece(piece);

            var redropGroups = true;
            while (redropGroups)
            {
                redropGroups = false;
                for (var i = 0; i < self.puzzlePieceGroups.length; i++)
                {
                    redropGroups |= self.doDropPiece(self.puzzlePieceGroups[i]);
                }
            }

            if (!self.gameWon && self.showOnlyEdges)
            {
                var hasEdges = false;
                for (var i = 0; i < self.swipeContainer.scrollContainer.getNumChildren(); ++i)
                {
                    var edgePiece = self.swipeContainer.scrollContainer.getChildAt(i);

                    if (edgePiece.isEdge)
                    {
                        hasEdges = true;
                        break;
                    }
                }

                if (!hasEdges)
                {
                    self.toggleEdgeOnlyTray();
                    self.onEdgesExhausted();
                }
            }
        },

        snapToGrid : function(piece)
        {
            var self = this;

            var snappingDistanceX = self.puzzleInfo.sliceWidth * GRID_SPACING_MULTIPLIER;
            var snappingDistanceY = self.puzzleInfo.sliceHeight * GRID_SPACING_MULTIPLIER;

            var gridCellsX = (1.0 / GRID_SPACING_MULTIPLIER) * self.puzzleInfo.columns;
            var gridCellsY = (1.0 / GRID_SPACING_MULTIPLIER) * self.puzzleInfo.rows;

            // Determine which piece to use for the offset amount
            var sourcePiece = (piece.isContainer) ? piece.getChildAt(0) : piece;
            var gx = (piece.isContainer) ? piece.x : 0;
            var gy = (piece.isContainer) ? piece.y : 0;

            // Individual pieces should be clamped to the grid spaces [0, gridCells - 1] to ensure that they stay within view
            var goalX = Math.max(0, Math.min(gridCellsX - 1, Math.floor((sourcePiece.x + gx) / snappingDistanceX))) * snappingDistanceX;
            var goalY = Math.max(0, Math.min(gridCellsY - 1, Math.floor((sourcePiece.y + gy) / snappingDistanceY))) * snappingDistanceY;

            // When the source image was split, each puzzle piece was given an origin. This origin was some pixels away from
            // a valid snapping location. To ensure that all pieces align properly and have the appearance of being the same size/shape,
            // when it comes to snapping, we add in the original offset to whatever grid locaiton is computed.
            var offsetOriginX = sourcePiece.origin.x - Math.max(0, Math.min(gridCellsX - 1, Math.floor(sourcePiece.origin.x / snappingDistanceX))) * snappingDistanceX;
            var offsetOriginY = sourcePiece.origin.y - Math.max(0, Math.min(gridCellsY - 1, Math.floor(sourcePiece.origin.y / snappingDistanceY))) * snappingDistanceY;

            var offsetX = goalX + offsetOriginX - (sourcePiece.x + gx);
            var offsetY = goalY + offsetOriginY - (sourcePiece.y + gy);

            if (!piece.isContainer)
            {
                piece.setPosition(piece.x + offsetX, piece.y + offsetY);
            }
            else
            {
                piece.x += offsetX;
                piece.y += offsetY;

                // Clamp the group to the window so that some part of the group is visible
                var thresholdX = self.puzzleInfo.sliceWidth * 0.5;
                var thresholdY = self.puzzleInfo.sliceHeight * 0.5;

                // Too far left
                if (piece.x + piece.width < thresholdX)
                {
                    piece.x += thresholdX - (piece.x + piece.width);
                }
                // Too far up
                if (piece.y + piece.height < thresholdY)
                {
                    piece.y += thresholdY - (piece.y + piece.height);
                }
                // Too far right
                if (piece.x > self.puzzleContainer.width - thresholdX)
                {
                    piece.x -= piece.x - (self.puzzleContainer.width - thresholdX);
                }
                // Too far down
                if (piece.y > self.puzzleContainer.height - thresholdY)
                {
                    piece.y -= piece.y - (self.puzzleContainer.height - thresholdY);
                }
                piece.dirty = true;
            }
        },

        createGroup : function(p1, p2)
        {
            var self = this;

            // Create the container and add it to the Scene
            var group = new CAAT.ActorContainer(/*CAAT.ActorContainer.AddHint.CONFORM*/);
            p1.parent.addChild(group);
            self.puzzlePieceGroups.push(group);
            self.enableDrag(group);
            enableTransparentChildren(group);
            group.drop = self.dropPiece.bind(self, group);
            group.isContainer = true;
            group.scene = self.scene;
            group.setPosition(p1.x, p1.y);

            self.addToGroup(p1, group);
            self.addToGroup(p2, group);

            /*
            // Adjust p1 so it aligns perfectly with the point it's snapping to. We assume that
            // p1 is the active point that was dragged to p2 to make a new group, so it will be
            // the one that snaps.
            // "I AM THE ONE WHO SNAPS!"
            var translation = getTrueOffset(p2);
            var dx = p1.x - p1.origin.x - translation.x;
            var dy = p1.y - p1.origin.y - translation.y;

            p1.setPosition(p1.x - (dx + group.x), p1.y - (dy + group.y));

            p1.parent.removeChild(p1);
            p2.parent.removeChild(p2);

            group.addChild(p1);
            group.addChild(p2);

            self.disableDrag(p1);
            self.disableDrag(p2);

            p1.enableEvents(false);
            p2.enableEvents(false);

            p1.group = group;
            p2.group = group;

            var childCount = group.getNumChildren();
            var minX = self.scene.width;
            var minY = self.scene.height;
            var maxX = 0;
            var maxY = 0;
            for (var i = 0; i < childCount; ++i)
            {
                var child = group.getChildAt(i);
                if (child.x < minX)
                    minX = child.x;
                if (child.y < minY)
                    minY = child.y;
                if (child.x + child.width > maxX)
                    maxX = child.x + child.width;
                if (child.y + child.height > maxY)
                    maxY = child.y + child.height;
            }

            group.width = maxX - minX;
            group.height = maxY - minY;
            group.x = minX;
            group.y = minY;

            for (var i = 0; i < childCount; ++i)
            {
                var child = group.getChildAt(i);

                child.setPosition(child.x - minX, child.y - minY);
            }
            */

            return group;
        },

        /**
         * mergePieces takes two puzzle piece IMActors and merges them into a single
         * object. If one of the pieces already exists in a group, that group is used. If
         * both pieces exist in a group, both groups are merged under p2's.
         */
        mergePieces : function(p1, p2)
        {
            var self = this;

            var group = null;

            // Make a new group
            if (p1.group == undefined && p2.group == undefined)
                group = self.createGroup(p1, p2);
            // Merge two groups
            else if (p1.group != undefined && p2.group != undefined)
            {
                // Merging two groups
                var g1 = p1.group;
                var g2 = p2.group;

                while (g1.getNumChildren() > 0)
                {
                    var p = g1.getChildAt(0);
                    self.addToGroup(p, g2);
                }

                // Remove the group from the scene and the list
                for (var i = 0; i < self.puzzlePieceGroups.length; ++i)
                {
                    var findG1 = self.puzzlePieceGroups[i];
                    if (g1.id == findG1.id)
                    {
                        findG1.parent.removeChild(findG1);
                        findG1.destroy();
                        self.puzzlePieceGroups.splice(i, 1);
                        break;
                    }
                }
                // Keep track of where the group went.
                g2.group = g1;
                group = g2;
            }
            // Add p2 to p1's group
            else if (p1.group != undefined)
                group = self.addToGroup(p2, p1.group, true);
            // Add p1 to p2's group
            else if (p2.group != undefined)
                group = self.addToGroup(p1, p2.group);

            return group;
        },

        doDropPiece : function(thePiece)
        {
            var self = this;

            var pieceToSnap = thePiece;

            // Only check with pieces that are colliding
            var colliders = [];
            for (var i = 0; i < self.puzzlePieces.length; ++i)
            {
                var piece = self.puzzlePieces[i];
                // Skip invisible pieces
                if (!piece.visible)
                    continue;
                // If this is a piece and the indices match, skip it
                if (!pieceToSnap.isContainer && pieceToSnap.id == piece.id)
                    continue;
                else if (pieceToSnap.isContainer && piece.group != undefined && pieceToSnap.id == piece.group.id)
                    continue;

                if (pieceToSnap.AABB.intersects(piece.AABB))
                    colliders.push(piece);
            }
            for (var i = 0; i < self.puzzlePieceGroups.length; ++i)
            {
                var group = self.puzzlePieceGroups[i];
                // If this is a group and the ids match, skip it
                if (pieceToSnap.isContainer && pieceToSnap.id == group.id)
                    continue;
                // Skip the group if this is a piece that's contained in it
                else if (!pieceToSnap.isContainer && pieceToSnap.group != undefined && pieceToSnap.group.id == group.id)
                    continue;

                if (pieceToSnap.AABB.intersects(group.AABB))
                    colliders.push(group);
            }

            // Check for a snap-worthy intersection
            var snapMade = false;
            for (var i = 0; i < colliders.length; ++i)
            {
                var toMerge = colliders[i];

                // toMerge and 'this' could either be a puzzle piece or a group of them.
                // If the latter, we need to extract a single piece for merging tests
                var p1 = (pieceToSnap.isContainer) ? pieceToSnap.getChildAt(0) : pieceToSnap;
                var p2 = (toMerge.isContainer) ? toMerge.getChildAt(0) : toMerge;

                if (self.canMergePieces(p1, p2))
                {
                    pieceToSnap = self.mergePieces(p1, p2);

                    self.director.audioPlay('click');
                    self.victoryCheck();
                    snapMade = true;
                    break;
                }
            }

            return snapMade;
        },

        victoryCheck : function()
        {
            var self = this;

            if (self.gameWon)
                return true;

            if (self.puzzlePieceGroups.length == 1 && self.puzzlePieceGroups[0].getNumChildren() == self.puzzlePieces.length)
            {
                self.disableDrag(self.puzzlePieceGroups[0]);

                // Player wins!
                self.director.audioPlay('victory');

                // Reset all the pieces
                self.puzzlePieceGroups[0].setLocation(0, 0);
                for (var i = 0; i < self.puzzlePieces.length; ++i)
                {
                    var piece = self.puzzlePieces[i];
                    piece.setPosition(piece.origin.x, piece.origin.y);
                }

                self.gameWon = true;
            }

            return self.gameWon;
        },

        /*
         * Resets the state of the game
         */
        resetPuzzle : function()
        {
            var self = this;

            for (var i = 0; i < self.puzzlePieces.length; ++i)
            {
                var piece = self.puzzlePieces[i];
                if (piece.group != undefined)
                {
                    var groupParent = piece.group.parent;
                    piece.group = undefined;
                    piece.parent.removeChild(piece);
                    groupParent.addChild(piece);
                }
                else if (piece.parent == self.swipeContainer.scrollContainer)
                {
                    self.moveToBoard(piece, true);
                }

                piece.setPosition(piece.origin.x, piece.origin.y);
            }

            for (var i = 0; i < self.puzzlePieceGroups.length; ++i)
            {
                var group = self.puzzlePieceGroups[i];
                group.parent.removeChild(group);
            }

            self.puzzlePieceGroups = [];
            self.gameWon = false;
            self.notifiedComplete = false;
        },

        enableDrag : function(actor)
        {
            var self = this;

            // Because the bounding region is so big and there are a lot of alpha'd
            // pixels within, we need to handle click and drag ourselves
            actor.mouseEnter = function (mouseEvent) {
                this.__d_ax = -1;
                this.__d_ay = -1;
                this.pointed = true;
                CAAT.setCursor('move');
            };
            actor.mouseExit = function (mouseEvent) {
                this.__d_ax = -1;
                this.__d_ay = -1;
                this.pointed = false;
                CAAT.setCursor('default');
            };
            actor.mouseMove = function (mouseEvent) {
            };

            actor.mouseUp = function (mouseEvent) {
                if (this.__d_ax != -1 || this.__d_ay != -1)
                {
                    var droppedPiece = this.isContainer ? this.getChildAt(0) : this;
                    if (!droppedPiece && this.isContainer && this.group)
                        droppedPiece = this.group.getChildAt(0);
                    var dropSpot = self.getSpot(droppedPiece);
                    var dropInfo = {
                        fromBoard: true,
                        toBoard: true,
                        group: this.isContainer,
                        correct: (droppedPiece.row == dropSpot.row) && (droppedPiece.column == dropSpot.column),
                        index: this.isContainer ? null : droppedPiece.index
                    };

                    this.drop();

                    self.notifyDrop(dropInfo);
                }

                this.__d_ax = -1;
                this.__d_ay = -1;
            };

            actor.mouseDrag = function (mouseEvent) {
                var pt;

                pt = this.modelToView(new CAAT.Point(mouseEvent.x, mouseEvent.y));
                this.parent.viewToModel(pt);

                if (this.__d_ax === -1 || this.__d_ay === -1) {
                    this.__d_ax = pt.x;
                    this.__d_ay = pt.y;
                    this.__d_screenx = mouseEvent.screenPoint.x;
                    this.__d_screeny = mouseEvent.screenPoint.y;

                    var parent = this.parent;
                    parent.setZOrder(this, parent.getNumChildren());
                }

                // Sometimes the final group can get offset if the game finishes while it's being dragged.
                // This prevents that.
                if (self.gameWon)
                    return;

                var xDif = pt.x - this.__d_ax;
                var yDif = pt.y - this.__d_ay;

                // If the actor has tried to leave the box, and now the mouse
                // position now intersects the piece tray, move control to the
                // the tray.
                if (this.isContainer != true && !self.puzzleContainer.contains(pt.x, pt.y))
                {
                    var st = this.modelToView(new CAAT.Point(mouseEvent.x, mouseEvent.y));
                    self.swipeContainer.clipArea.viewToModel(st);
                    if (self.swipeContainer.clipArea.contains(st.x, st.y))
                    {
                        // It's in the hands of the tray now
                        self.moveToTray(this);
                        self.swipeContainer.sort();

                        self.notifyDrop({
                            fromBoard: true,
                            toBoard: false,
                            group: false,
                            correct: false,
                            index: this.index
                        });
                        return;
                    }
                }

                this.x += xDif;
                this.y += yDif;
                this.dirty = true;

                this.__d_ax = pt.x;
                this.__d_ay = pt.y;
            };
        },

        moveToBoard : function(piece, drop)
        {
            var self = this;

            var pt = piece.parent.modelToView(new CAAT.Point(piece.x, piece.y));
            self.puzzleContainer.viewToModel(pt);
            piece.setPosition(pt.x, pt.y);

            piece.parent.removeChild(piece);
            self.puzzleContainer.addChild(piece);

            piece.setScale(1.0, 1.0);

            piece.findActorAtPosition = PuzzleContainerFindFunc;
            // Dropping the piece checks for connecting pieces and performs
            // grid snapping
            if (drop)
                piece.drop();

            // Activate its mouse events
            self.enableDrag(piece);
            piece.enableEvents(true);
        },

        randomizePieces : function()
        {
            var self = this;

            for (var i = 0; i < self.puzzlePieces.length; ++i)
            {
                var x = Math.floor(Math.random() * self.puzzleContainer.width);
                var y = Math.floor(Math.random() * self.puzzleContainer.height);

                var piece = self.puzzlePieces[i];
                piece.setPosition(x, y);
            }
        },

        /**
         * canMergePieces checks two puzzle piece IMActors to see if they can be merged into
         * a single piece.
         */
        canMergePieces : function(p1, p2)
        {
            var self = this;

            // They're already in the same group...
            if (p1.group && (p1.group == p2.group))
                return false;

            // Don't merge animating pieces
            if (p1.animating || p2.animating)
                return false;

            // To see if two pieces are mergable, we'll shift our frame of
            // reference and translate both pieces back towards their original
            // locations. P1's offset will be used for both pieces, putting P1
            // in its original location and P2 somewhere nearby. If the distance from
            // P2 to its original location is within the threshold specified, then these
            // two pieces are touching and can be merged together.
            var translation = getTrueOffset(p2);

            var gx = (p1.group != undefined) ? p1.group.x : 0;
            var gy = (p1.group != undefined) ? p1.group.y : 0;
            var dx = p1.x - translation.x - p1.origin.x + gx;
            var dy = p1.y - translation.y - p1.origin.y + gy;

            var areWithinDistance = (Math.abs(dx) < SNAP_DISTANCE_THRESHOLD && Math.abs(dy) < SNAP_DISTANCE_THRESHOLD);
            if (!areWithinDistance)
                return false;

            // We only want to allow orthogonally neighboring pieces to merge with each other, or into a group. Within
            // this test case, there are two divisions.

            // If p1 and p2 are both singular pieces,
            if (p1.group == undefined && p2.group == undefined)
                return arePiecesNeighbors(p1, p2);
            else if (p1.group != undefined && p2.group != undefined)
            {
                // If the two pieces are both groups, we need to disallow connections formed
                // on diagonals. At least one of the pairs of pieces needs to be orthogonally
                // connected.
                var g1 = p1.group;
                var g2 = p2.group;
                for (var i = 0; i < g1.getNumChildren(); ++i)
                {
                    var iPiece = g1.getChildAt(i);
                    for (var j = 0; j < g2.getNumChildren(); ++j)
                    {
                        var jPiece = g2.getChildAt(j);
                        if (arePiecesNeighbors(iPiece, jPiece))
                            return true;
                    }
                }

                return false;
            }
            else
            {
                var group = (p1.group != undefined) ? p1.group : p2.group;
                var piece = (p1.group == undefined) ? p1 : p2;

                // North
                if (piece.row > 0)
                {
                    if (self.puzzlePieces[piece.index - self.puzzleInfo.columns].group == group)
                        return true;
                }
                // South
                if (piece.row < (self.puzzleInfo.rows - 1))
                {
                    if (self.puzzlePieces[piece.index + self.puzzleInfo.columns].group == group)
                        return true;
                }
                // East
                if (piece.column < (self.puzzleInfo.columns - 1))
                {
                    if (self.puzzlePieces[piece.index + 1].group == group)
                        return true;
                }
                // West
                if (piece.column > 0)
                {
                    if (self.puzzlePieces[piece.index - 1].group == group)
                        return true;
                }

                return false;
            }
        },

        /**
         * addToGroup takes a puzzle piece and adds it to an existing group. The group's location
         * and width/height are updated to include the new piece. Any interior pieces are repositioned
         * as well to match.
         */
        addToGroup : function(piece, group)
        {
            var self = this;

            var childCount = group.getNumChildren();
            if (childCount > 0)
            {
                // Adjust piece so it aligns perfectly with the point it's snapping to.
                var translation = getTrueOffset(group.getChildAt(0));
                var translatedPos = {x: piece.origin.x + translation.x, y: piece.origin.y + translation.y};
                self.puzzleContainer.modelToModel(translatedPos, piece.parent);
                piece.setPosition(translatedPos.x, translatedPos.y);
            }

            var minGroup = group.modelToModel({x:0,y:0}, group.parent);
            var maxGroup = group.modelToModel({x:group.width, y:group.height}, group.parent);

            var minPiece = piece.modelToModel({x:0,y:0}, group.parent);
            var maxPiece = piece.modelToModel({x:piece.width, y:piece.height}, group.parent);

            var offset = {x: Math.max(minGroup.x - minPiece.x, 0), y: Math.max(minGroup.y - minPiece.y, 0)};
            var growth = {x: offset.x + Math.max(maxPiece.x - maxGroup.x, 0), y: offset.y + Math.max(maxPiece.y - maxGroup.y, 0)};
            if ((minGroup.x > minPiece.x) || (minGroup.y > minPiece.y))
            {
                for (var i = 0; i < childCount; ++i)
                {
                    var child = group.getChildAt(i);
                    child.setPosition(child.x + offset.x, child.y + offset.y);
                }
                group.x -= offset.x;
                group.y -= offset.y;
            }
            group.width += growth.x;
            group.height += growth.y;
            group.dirty = true;

            var piecePos = piece.parent.modelToModel({x:piece.x, y:piece.y}, group);

            // Remove the piece from the parent
            piece.parent.removeChild(piece);
            piece.group = group;
            self.disableDrag(piece);
            piece.enableEvents(false);

            // Add it to the group
            group.addChild(piece);

            piece.setPosition(piecePos.x, piecePos.y);

            // Recalculate the bounds on the group so it's available immediately.
            group.setModelViewMatrix();
            group.setScreenBounds();

            return group;
        },

        /**
         * Clears all mouse events from the actor
         */
        disableDrag : function(actor)
        {
            actor.mouseEnter= function(mouseEvent) {};
            actor.mouseExit = function(mouseEvent) {};
            actor.mouseMove = function(mouseEvent) {};
            actor.mouseUp = function(mouseEvent) {};
            actor.mouseDrag = function(mouseEvent) {};
        },

        moveToTray : function(piece)
        {
            var self = this;

            piece.parent.removeChild(piece);

            piece.setScale(0.3, 0.3);
            self.disableDrag(piece);
            piece.enableEvents(false);

            piece.findActorAtPosition = CAAT.Actor.prototype.findActorAtPosition;
            self.swipeContainer.addActor(piece, 0);
        },

        getSpot: function(position)
        {
            var self = this;
            // If this is actually a group, use the first child
            if (position.isContainer)
            {
                position = position.getChildAt(0);
            }
            // If a piece is in a group, the position needs to be adjusted for group location
            if (position.group)
            {
                var offset = getTrueOffset(position);
                position = {x: position.origin.x + offset.x, y: position.origin.y + offset.y};
            }
            var spotSize = {x: self.puzzleInfo.width / self.puzzleInfo.columns, y: self.puzzleInfo.height / self.puzzleInfo.rows};
            return {column: (position.x / spotSize.x)|0, row: (position.y / spotSize.y)|0};
        },

        notifyDrop: function(dropInfo)
        {
            var self = this;

            // Don't send drop events after we've told them the game is over
            if (self.notifiedComplete)
                return;

            self.onDropPiece(dropInfo);

            // notify parent we're complete
            if (self.gameWon)
            {
                self.notifiedComplete = true;
                self.onComplete();
            }
        }

    };


    exports.Jigsaw = Jigsaw;

})(typeof exports === 'undefined'? _modules['Jigsaw']={} : exports);