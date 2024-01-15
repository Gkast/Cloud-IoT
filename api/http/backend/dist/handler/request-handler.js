"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRequest = void 0;
const logger_1 = require("../util/tool/logger");
const http_tools_1 = require("../util/tool/http-tools");
const mime_types_1 = require("../util/tool/mime-types");
async function handleRequest(nodeReq, nodeRes, router, _) {
    if (nodeReq.url !== '/health')
        (0, logger_1.logHttpRequest)(nodeReq, nodeRes);
    const httpReq = (0, http_tools_1.nodeReqToMyReq)(nodeReq);
    const parsedUrl = httpReq.url;
    const handlerFound = router.find(nodeReq.method, parsedUrl.pathname.toLowerCase());
    if (!handlerFound || !handlerFound[0]) {
        nodeRes.statusCode = 405;
        nodeRes.setHeader('Content-Type', (0, mime_types_1.getMimeType)("pl"));
        nodeRes.end('Method not found');
        return;
    }
    try {
        const httpHandler = handlerFound[0];
        const httpRes = await httpHandler(httpReq);
        (0, http_tools_1.myResToNodeRes)(httpRes, nodeRes);
    }
    catch (err) {
        (0, logger_1.logError)(`HTTP Request Handling Error: 
Url: ${nodeReq.url} 
Headers: ${JSON.stringify(nodeReq.headers, null, 4)}`, err);
        nodeRes.statusCode = 500;
        nodeRes.statusMessage = (0, http_tools_1.getHttpStatusMessage)(nodeRes.statusCode);
        nodeRes.setHeader('Content-Type', (0, mime_types_1.getMimeType)("text"));
        nodeRes.end('Internal Server Error');
    }
}
exports.handleRequest = handleRequest;
//# sourceMappingURL=request-handler.js.map