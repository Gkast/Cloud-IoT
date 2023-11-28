import {Server} from "ws";
import {Pool} from "pg";
import {logError, logInfo} from "./logger";

export async function initializeGracefulShutdownMechanism(server: Server, dbPool: Pool, timeoutMs: number) {
    logInfo('Initializing Graceful Shutdown Mechanism');

    process.once('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
    process.once('SIGINT', () => handleGracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => {
        logError('\nReceived SIGUSR2. Exiting Forcefully');
        process.exit(2)
    })

    const handleGracefulShutdown = async (signal: string) => {
        logInfo('Received', signal);
        await gracefulShutdown(server, dbPool, timeoutMs);
    }

    logInfo('Graceful Shutdown Mechanism Initialized');
}

export async function gracefulShutdown(server: Server, dbPool: Pool, timeoutMs: number) {
    try {
        logInfo('Shutting Down Gracefully')
        const timeout = setTimeout(() => {
            logError('Forcefully terminating due to timeout');
            process.exit(1);
        }, timeoutMs);
        logInfo('Closing WebSocket Server')
        server.close()
        logInfo('Closing Database Pool Connection')
        await dbPool.end()
        clearTimeout(timeout)
        logInfo('Exiting...')
        process.exit(0);
    } catch (err) {
        logError('Error Closing Gracefully', err)
        process.exit(1);
    }
}