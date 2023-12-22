"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logInfo = exports.logHttpRequest = void 0;
const util_1 = require("../util");
function logHttpRequest(req, res) {
    const logMessage = (0, util_1.formatHttpLogRequest)(req, res);
    logInfo('HTTP Request received:\n', logMessage);
}
exports.logHttpRequest = logHttpRequest;
function logInfo(message, ...optionParams) {
    const timestamp = (0, util_1.generateTimestamp)();
    console.log(`[${timestamp}] [INFO]:`, message ? message : '', ...optionParams);
}
exports.logInfo = logInfo;
function logError(message, ...optionParams) {
    const timestamp = (0, util_1.generateTimestamp)();
    console.log(`[${timestamp}] [ERROR]:`, message ? message : '', ...optionParams);
}
exports.logError = logError;
//# sourceMappingURL=logger.js.map