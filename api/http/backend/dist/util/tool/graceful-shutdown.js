"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gracefulShutdown = exports.initializeGracefulShutdownMechanism = void 0;
const logger_1 = require("./logger");
async function initializeGracefulShutdownMechanism(httpServer, dbPool, timeoutMs) {
    (0, logger_1.logInfo)('Initializing Graceful Shutdown Mechanism');
    process.once('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
    process.once('SIGINT', () => handleGracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => {
        (0, logger_1.logError)('\nReceived SIGUSR2. Exiting Forcefully');
        process.exit(2);
    });
    const handleGracefulShutdown = async (signal) => {
        (0, logger_1.logInfo)('Received', signal);
        await gracefulShutdown(httpServer, dbPool, timeoutMs);
    };
    (0, logger_1.logInfo)('Graceful Shutdown Mechanism Initialized');
}
exports.initializeGracefulShutdownMechanism = initializeGracefulShutdownMechanism;
async function gracefulShutdown(httpServer, dbPool, timeoutMs) {
    try {
        (0, logger_1.logInfo)('Shutting Down Gracefully');
        setTimeout(() => {
            (0, logger_1.logError)('Forcefully terminating due to timeout');
            process.exit(1);
        }, timeoutMs);
        (0, logger_1.logInfo)('Closing HTTP Server');
        httpServer.close();
        (0, logger_1.logInfo)('Closing Idle Connections');
        httpServer.closeIdleConnections();
        (0, logger_1.logInfo)('Closing Database Pool Connection');
        await dbPool.end();
        (0, logger_1.logInfo)('Exiting...');
        process.exit(0);
    }
    catch (err) {
        (0, logger_1.logError)('Error Occurred While Closing Gracefully', err);
        process.exit(1);
    }
}
exports.gracefulShutdown = gracefulShutdown;
//# sourceMappingURL=graceful-shutdown.js.map