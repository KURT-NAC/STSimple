(function(){

// Calls cleanup or destroy on all top-level actors in a scene.
CAAT.sceneCleanup = function(scene)
{
    for (var i = scene.childrenList.length - 1; i >= 0; i--)
    {
        var a = scene.childrenList[i];
        if (a)
        {
            if (a.cleanup)
                a.cleanup(true);
            else if (a.destroy)
                a.destroy();
        }
    }
    scene.emptyChildren();
}

})();