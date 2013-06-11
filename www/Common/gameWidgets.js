// Code for registering and managing GameWidgets

var _gameWidgets = _gameWidgets || {};

function addGameWidget(name, widget)
{
    return _gameWidgets[name] = widget;
}

function getGameWidget(widget)
{
    return _gameWidgets[widget];
}

function addGameWidgetResourcesToManifest(manifest)
{
    for (var widget in _gameWidgets)
    {
        if ('addResourcesToManifest' in _gameWidgets[widget])
            _gameWidgets[widget].addResourcesToManifest(manifest);
    }
}