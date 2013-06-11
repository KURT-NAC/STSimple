// dead simple thunk that mimics node.js style require

var _modules = _modules || {};

function require(module)
{
	return _modules[module];
}
