"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundResponse = exports.forbiddenResponse = exports.notAuthorizedResponse = exports.jsonResponse = void 0;
const mime_types_1 = require("./mime-types");
function jsonResponse(body, status) {
    return {
        status: status || 200,
        headers: { "content-type": (0, mime_types_1.getMimeType)("json") },
        body: JSON.stringify(body, null, 2)
    };
}
exports.jsonResponse = jsonResponse;
function notAuthorizedResponse() {
    return {
        status: 401,
        headers: { "content-type": (0, mime_types_1.getMimeType)("json") },
        body: JSON.stringify({ error: "Not Authorized" }, null, 2)
    };
}
exports.notAuthorizedResponse = notAuthorizedResponse;
function forbiddenResponse() {
    return {
        status: 403,
        headers: { "content-type": (0, mime_types_1.getMimeType)("json") },
        body: JSON.stringify({ error: "Forbidden" }, null, 2)
    };
}
exports.forbiddenResponse = forbiddenResponse;
function notFoundResponse() {
    return {
        status: 404,
        headers: { "content-type": (0, mime_types_1.getMimeType)("json") },
        body: JSON.stringify({ error: "Not Found" }, null, 2)
    };
}
exports.notFoundResponse = notFoundResponse;
//# sourceMappingURL=http-responses.js.map