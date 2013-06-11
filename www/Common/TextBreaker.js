(function(exports){
    "use strict";

    function splitText(origText)
    {
        var desiredSplit = origText.length / 2;
        var findArr = origText.match(/ /g);

        if (!findArr || findArr.length == 0)
        {
            return origText;
        }

        var startIdx = 0;
        var splitChar = 0;
        var diff = Number.MAX_VALUE;

        while (startIdx >= 0)
        {
            var n = origText.indexOf(' ', startIdx);

            if (n >= 0)
            {
                var newDiff = Math.abs(desiredSplit - n);

                if (newDiff < diff)
                {
                    diff = newDiff;
                    splitChar = n;
                }
            }

            startIdx = n < 0 ? n : n+1;
        }

        var newText = origText.substr(0, splitChar) + '\n' + origText.substr(splitChar+1);
        return newText;
    }

    function lineBreakText(ctx,phrase,maxPxLength,textStyle)
    {
        // NOTE: Taken from http://stackoverflow.com/questions/2936112/text-wrap-in-a-canvas-element
        var wa=phrase.split(" "),
            phraseArray=[],
            lastPhrase=wa[0],
            l=maxPxLength,
            measure=0;
        if (wa.length === 1)
            return [lastPhrase];
        ctx.font = textStyle;
        for (var i=1;i<wa.length;i++) {
            var w=wa[i];
            measure=ctx.measureText(lastPhrase+w).width;
            if (measure<l) {
                lastPhrase+=(" "+w);
            }else {
                phraseArray.push(lastPhrase);
                lastPhrase=w;
            }
            if (i===wa.length-1) {
                phraseArray.push(lastPhrase);
                break;
            }
        }
        return phraseArray;
    }

    function addTextArea(container, theText, director, element, widthPct, lineSpaceMod)
    {
        var self = this;

        widthPct = widthPct || 1;
        var lineSpaceAdjust = lineSpaceMod || require('LayoutManager').LayoutManager.DEFAULT_LINESPACE_FACTOR;

        var sub = new CAAT.ActorContainer();

        // break text into max width lines
        var strings = lineBreakText(director.ctx, theText, container.width * widthPct, element['font']);
        console.log(strings);

        // add actors centered
        var i = 0;
        var actor;
        var w = 0, h = 0;
        for (i = 0; i < strings.length; i++)
        {
            actor = (new CAAT.TextActor()).
                setText(strings[i]).
                setFont(element['font']).
                setTextFillStyle(element['fill']).
                setTextAlign(element['textAlign']).
                setTextBaseline(element['textBaseline']);
            actor.setSize(actor.textWidth, actor.textHeight);
            sub.addChild(actor);

            w = actor.width > w ? actor.width : w;
            var lineSpace = actor.height + (actor.height * lineSpaceAdjust);
            h += lineSpace;
        }

        // now position based on our sub-container
        var x = w*0.5 + element.x;
        var y = 0 + element.y;
        for (i = 0; i < strings.length; i++)
        {
            sub.childrenList[i].setPosition(x, y);
            y += actor.height + (actor.height * lineSpaceAdjust);
        }

        sub.setSize(w, h);
        sub.setPositionAnchored(container.width*0.5, container.height*0.5, 0.5, 0.5);
        sub.cacheAsBitmap();
        container.addChild(sub);

        return container.childrenList.length-1;
    }


///////////////////////////////////////////////////////////////////////////////
// export key functions

exports.TextBreaker = {};
exports.TextBreaker.splitText = splitText;
exports.TextBreaker.lineBreakText = lineBreakText;
exports.TextBreaker.addTextArea = addTextArea;


})(typeof exports === 'undefined'? _modules['TextBreaker']={} : exports);
