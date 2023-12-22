"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myResToNodeRes = exports.nodeReqToMyReq = exports.getHttpStatusMessage = void 0;
const url_1 = require("url");
const HTTP_STATUS = {
    100: 'Continue',
    101: 'Switching Protocols',
    102: 'Processing',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    207: 'Multi-Status',
    208: 'Already Reported',
    226: 'IM Used',
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    306: 'unused',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    418: 'I\'m a teapot',
    421: 'Misdirected Request',
    422: 'Unprocessable Content',
    423: 'Locked',
    424: 'Failed Dependency',
    426: 'Upgrade Required',
    428: 'Precondition Required',
    429: 'Too Many Requests',
    431: 'Request Header Fields Too Large',
    451: 'Unavailable For Legal Reasons',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates',
    507: 'Insufficient Storage',
    508: 'Loop Detected',
    510: 'Not Extended',
    511: 'Network Authentication Required',
};
function getHttpStatusMessage(statusCode) {
    return HTTP_STATUS[statusCode];
}
exports.getHttpStatusMessage = getHttpStatusMessage;
function nodeReqToMyReq(nodeReq) {
    return {
        url: new url_1.URL('http://' + nodeReq.headers.host + nodeReq.url),
        body: nodeReq,
        nodeJsReqObject: nodeReq,
        headers: nodeReq.headers,
        method: nodeReq.method,
        httpVersion: nodeReq.httpVersion,
        remoteAddr: nodeReq.socket.remoteAddress,
    };
}
exports.nodeReqToMyReq = nodeReqToMyReq;
function myResToNodeRes(myRes, nodeRes) {
    nodeRes.statusCode = myRes.status || 200;
    nodeRes.statusMessage = getHttpStatusMessage(nodeRes.statusCode);
    if (myRes.headers) {
        Object.keys(myRes.headers).forEach(name => {
            nodeRes.setHeader(name, myRes.headers[name]);
        });
    }
    !myRes.body ? nodeRes.end() :
        typeof myRes.body === 'string' ?
            nodeRes.end(myRes.body) : myRes.body(nodeRes);
}
exports.myResToNodeRes = myResToNodeRes;
//# sourceMappingURL=http-tools.js.map