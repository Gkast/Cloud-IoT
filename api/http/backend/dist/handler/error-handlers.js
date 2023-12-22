"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDropRequest = exports.handleClientError = exports.handleServerError = exports.handleStartAPIError = exports.handleUnhandledRejection = void 0;
const logger_1 = require("../util/tool/logger");
function handleUnhandledRejection(reason, promise) {
    (0, logger_1.logError)("Unhandled Rejection:", reason, promise);
}
exports.handleUnhandledRejection = handleUnhandledRejection;
function handleStartAPIError(reason) {
    (0, logger_1.logError)(`HTTP API Startup Error:`, reason);
    process.exit(1);
}
exports.handleStartAPIError = handleStartAPIError;
function handleServerError(err, port) {
    let errorInfo;
    if (err.code === "EACCES") {
        errorInfo = `Bind ${port} requires elevated privileges`;
    }
    else if (err.code === "EADDRINUSE") {
        errorInfo = `Port ${port} is already in use`;
    }
    else {
        errorInfo = "Unexpected Error";
    }
    (0, logger_1.logError)("HTTP Server Error:", errorInfo, "\n", err);
    process.exit(1);
}
exports.handleServerError = handleServerError;
function handleClientError(err, socket) {
    if (err.code === "ECONNRESET" || !socket.writable) {
        (0, logger_1.logError)("Client Error: Socket not writable or Error Code: ECONNRESET");
        return;
    }
    (0, logger_1.logError)("Client Error: Bad Request");
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
}
exports.handleClientError = handleClientError;
function handleDropRequest(req, socket) {
    (0, logger_1.logError)("Request Dropped:", "Request details:", req, "Socket details:", socket);
    socket.end(`HTTP/1.1 503 Service Unavailable\r\n\r\n`);
}
exports.handleDropRequest = handleDropRequest;
//# sourceMappingURL=error-handlers.js.map