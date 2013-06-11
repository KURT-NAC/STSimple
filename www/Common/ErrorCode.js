(function(exports){

function Error(code, message)
{
    this.code = code;
    this.message = message;
    return this;
}

Error.prototype.copyTo = function(result)
{
    result.code = this.code;
    result.message = this.message;
}

var ErrorCode =
{
    OK:                         new Error(0,    'ok'),
    UNKNOWN_ERROR:              new Error(1000, 'unknown error'),
    NOT_SUPPORTED:              new Error(1001, 'Not supported'),
    ACCESS_DENIED:              new Error(1002, 'Not authorized'),
    NOT_FOUND:                  new Error(1003, 'Not found'),
    INVALID_PARAMS:             new Error(1004, 'Invalid parameters'),
    ACCOUNT_ALREADY_EXISTS:     new Error(1005, 'Account already exists'),
    NICKNAME_ALREADY_EXISTS:    new Error(1006, 'Nickname already exists'),
    LOGIN_FAILED:               new Error(1007, 'Login failed'),
    TOKEN_INVALID:              new Error(1008, 'Facebook token is invalid'),
    INVALID_TURN:               new Error(1009, 'Invalid turn'),
    NOT_ENOUGH_COINS:           new Error(1010, 'Not enough coins'),
    NOT_ENOUGH_SKUS:            new Error(1011, 'Not enough items'),
    ALREADY_UNLOCKED:           new Error(1012, 'Item is already unlocked'),
    INVALID_USER_ID:            new Error(1013, 'Invalid user ID'),
    INVALID_RECEIPT:            new Error(1014, 'Invalid IAP receipt'),
    RECEIPT_ALREADY_EXISTS:     new Error(1015, 'IAP receipt already exists')
};

exports.ErrorCode = ErrorCode;

})(typeof exports === 'undefined' ? _modules['ErrorCode']={} : exports);