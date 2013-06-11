function ErrorHandler(owner,scene)
{
    return this
}

ErrorHandler.prototype =
{
};

ErrorHandler.handleError = function(error,object)
{
    error = error || "Unknown Error";
    var msg = (typeof error === "string" ? error : ("" + ('name' in error ? error.name : "") + ('message' in error ? (" "+error.message) : "")));

    var err = new Error((object ? "Error in object " : "") + msg);
    if (object)
        console.log(object);
    return err;
};
