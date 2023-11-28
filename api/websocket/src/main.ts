import * as dotenv from 'dotenv'
import {logInfo} from "./util/tool/logger";
import path from "path";
import {initDBPool} from "./util/config/database-config";
import {initWebSocketRouter} from "./util/config/router-config";
import {setupServer} from "./util/config/servers-config";
import {initializeGracefulShutdownMechanism} from "./util/tool/graceful-shutdown";
import {handleStartAPIError, handleUnhandledRejection} from "./handler/error-handlers";

logInfo(`Process started with id`, process.pid)

if (!process.env.NODE_ENV) {
    logInfo('Development Environment');
    logInfo('Reading Environmental Variables');
    dotenv.config({
        path: path.join(__dirname, '..', 'api_dev.env'),
        debug: true
    });
} else if (process.env.NODE_ENV === 'production') {
    logInfo('Production Environment');
} else {
    logInfo('Unknown Environment:' + process.env.NODE_ENV)
    process.exit(1)
}

const host = process.env.NODE_HOST;
const port = parseInt(process.env.NODE_PORT);

const timeoutMs = 10000

async function startAPI(): Promise<void> {
    logInfo('Starting WebSocket API');
    const dbPool = await initDBPool()
    const router = await initWebSocketRouter(dbPool)
    const server = await setupServer(router, dbPool, host, port)
    await initializeGracefulShutdownMechanism(server, dbPool, timeoutMs)
    logInfo('WebSocket API Started');
}

process.on('unhandledRejection', (reason, promise) => handleUnhandledRejection(reason, promise));

startAPI()
    .catch(reason => handleStartAPIError(reason))