///////////////////////////////////////////////////////////////////////////////
// Document helpers
///////////////////////////////////////////////////////////////////////////////
var SnTCanvasHelper = SnTCanvasHelper||{};
SnTCanvasHelper.uniqueCanvasIdentificator = 0;
SnTCanvasHelper.divID = null;
SnTCanvasHelper.topLevelDirector = null;

SnTCanvasHelper.attachToCanvas = function(canvasId,width,height)
{
    var id = JSON.stringify(SnTCanvasHelper.uniqueCanvasIdentificator);

    var div = $(canvasId);
    div.attr('sntID', 'id');
    div.css('position', 'absolute');
    div.css('left', Math.max(g_game.globalOffset.x, 0).toString() + 'px');
    div.css('top', Math.max(g_game.globalOffset.y, 0).toString() + 'px');
    var scaledWidth = width * g_game.globalScale.x;
    var scaledHeight = height * g_game.globalScale.y;
    if (g_game.director)
    {
        scaledWidth = Math.min(scaledWidth, g_game.director.canvas.width);
        scaledHeight = Math.min(scaledHeight, g_game.director.canvas.height);
    }
    div.width('' + Math.ceil(scaledWidth) + 'px');
    div.height('' + Math.ceil(scaledHeight) + 'px');

    var canvas = div[0];
    SnTCanvasHelper.SetTopLevelDirector(canvas);
    SnTCanvasHelper.uniqueCanvasIdentificator++;
    return canvas;
}

SnTCanvasHelper.SetTopLevelDirector = function(topLevelCanvas)
{
    var directors = CAAT.director;
    if (!directors)
    {
        console.log("Attempting to set top level director but CAAT has no Directors present");
        return false;
    }
    for (var i = 0; i < directors.length; i++)
    {
        if (directors[i].canvas === topLevelCanvas)
        {
            SnTCanvasHelper.topLevelDirector = directors[i];
            return true;
        }
    }
    return false;
};
