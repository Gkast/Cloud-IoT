"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupServer = void 0;
const http = __importStar(require("http"));
const helmet_1 = __importDefault(require("helmet"));
const logger_1 = require("../tool/logger");
const http_tools_1 = require("../tool/http-tools");
const mime_types_1 = require("../tool/mime-types");
const error_handlers_1 = require("../../handler/error-handlers");
const request_handler_1 = require("../../handler/request-handler");
async function setupServer(httpRouter, dbPool, port) {
    const server = http.createServer();
    server.on('request', (req, res) => (0, helmet_1.default)()(req, res, (err) => {
        if (err) {
            (0, logger_1.logError)('Error Request', err);
            const body = 'Unexpected Error occurred';
            res.writeHead(500, (0, http_tools_1.getHttpStatusMessage)(500), {
                "Content-Length": Buffer.byteLength(body),
                "Content-Type": (0, mime_types_1.getMimeType)("pl")
            }).end(body);
        }
        else {
            (0, request_handler_1.handleRequest)(req, res, httpRouter, dbPool);
        }
    }));
    server.on('error', err => (0, error_handlers_1.handleServerError)(err, port));
    server.on('clientError', (err, socket) => (0, error_handlers_1.handleClientError)(err, socket));
    server.on('dropRequest', (req, socket) => (0, error_handlers_1.handleDropRequest)(req, socket));
    return server;
}
exports.setupServer = setupServer;
//# sourceMappingURL=server-config.js.map