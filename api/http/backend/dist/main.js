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
const logger_1 = require("./util/tool/logger");
const path_1 = __importDefault(require("path"));
const database_config_1 = require("./util/config/database-config");
const dotenv = __importStar(require("dotenv"));
const router_config_1 = require("./util/config/router-config");
const graceful_shutdown_1 = require("./util/tool/graceful-shutdown");
const error_handlers_1 = require("./handler/error-handlers");
const server_config_1 = require("./util/config/server-config");
(0, logger_1.logInfo)(`Process started with id`, process.pid);
if (!process.env.NODE_ENV) {
    (0, logger_1.logInfo)('Development Environment');
    (0, logger_1.logInfo)('Reading Development Environmental Variables');
    dotenv.config({
        path: path_1.default.join(__dirname, '..', 'api_dev.env'),
        debug: true
    });
}
else if (process.env.NODE_ENV === 'production') {
    (0, logger_1.logInfo)('Production Environment');
}
else {
    (0, logger_1.logInfo)('Unknown Environment:' + process.env.NODE_ENV);
    process.exit(1);
}
const host = process.env.NODE_HOST;
const port = parseInt(process.env.NODE_PORT);
const timeoutMs = 10000;
async function startAPI() {
    (0, logger_1.logInfo)('Starting HTTP API');
    const dbPool = await (0, database_config_1.initDBPool)();
    const httpRouter = await (0, router_config_1.initHttpRouter)(dbPool);
    const server = await (0, server_config_1.setupServer)(httpRouter, dbPool, port);
    await (0, graceful_shutdown_1.initializeGracefulShutdownMechanism)(server, dbPool, timeoutMs);
    server.listen(port, host, () => {
        (0, logger_1.logInfo)(`HTTP Server listening at ${host}:${port}`);
    });
}
process.on('unhandledRejection', (reason, promise) => (0, error_handlers_1.handleUnhandledRejection)(reason, promise));
startAPI()
    .catch(reason => (0, error_handlers_1.handleStartAPIError)(reason));
//# sourceMappingURL=main.js.map