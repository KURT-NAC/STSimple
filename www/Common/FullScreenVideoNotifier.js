var FullScreenVideoNotifier = function() {
    cordova.exec('FullScreenVideoNotifier.setup');
}

FullScreenVideoNotifier.prototype.setFinishCallback = function(callback) {
    window.plugins.fullScreenVideoNotifier.finishCallback = callback;
    var callbackName = 'window.plugins.fullScreenVideoNotifier.finishCallback';
    cordova.exec('FullScreenVideoNotifier.setFinishFullScreenCallback', callbackName);
}

FullScreenVideoNotifier.prototype.runFinishCallback = function() {
    if (window.plugins.fullScreenVideoNotifier.finishCallback)
    {
        window.plugins.fullScreenVideoNotifier.finishCallback();
    }
}

FullScreenVideoNotifier.prototype.finishCallback = null;

cordova.addConstructor(function()  {

    // shim to work in 1.5 and 1.6
    if (!window.Cordova) {
        window.Cordova = cordova;
    };

    if(!window.plugins) {
        window.plugins = {};
    }
    window.plugins.fullScreenVideoNotifier = FullScreenVideoNotifier.manager = new FullScreenVideoNotifier();
});