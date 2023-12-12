import {logInfo} from "./util/tool/logger";
import path from "path";
import {initDBPool} from "./util/config/database-config";
import * as dotenv from "dotenv";
import {initHttpRouter} from "./util/config/router-config";
import {initializeGracefulShutdownMechanism} from "./util/tool/graceful-shutdown";
import {handleStartAPIError, handleUnhandledRejection} from "./handler/error-handlers";
import {setupServer} from "./util/config/server-config";

logInfo(`Process started with id`, process.pid)

if (!process.env.NODE_ENV) {
    logInfo('Development Environment');
    logInfo('Reading Development Environmental Variables');
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

const host = process.env.NODE_HOST
const port = parseInt(process.env.NODE_PORT);

const timeoutMs = 10000

async function startAPI(): Promise<void> {
    logInfo('Starting HTTP API');
    const dbPool = await initDBPool()
    const httpRouter = await initHttpRouter(dbPool)
    const server = await setupServer(httpRouter, dbPool, port)
    await initializeGracefulShutdownMechanism(server, dbPool, timeoutMs)
    server.listen(port, host, () => {
        logInfo(`HTTP Server listening at ${host}:${port}`);
    })
}

process.on('unhandledRejection', (reason, promise) => handleUnhandledRejection(reason, promise));

startAPI()
    .catch(reason => handleStartAPIError(reason))