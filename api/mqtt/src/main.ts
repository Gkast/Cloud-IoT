import * as dotenv from 'dotenv'
import {logInfo} from "./util/tool/logger";
import path from "path";
import {initDBPool} from "./util/config/database-config";
import {initMQTTClient} from "./util/config/mqtt-client-config";
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

const timeoutMs = 10000

async function startAPI(): Promise<void> {
    logInfo('Starting MQTT API');
    const dbPool = await initDBPool()
    const mqttClient = await initMQTTClient(dbPool)
    await initializeGracefulShutdownMechanism(mqttClient, dbPool, timeoutMs)
    logInfo('MQTT API Started');
}

process.on('unhandledRejection', (reason, promise) => handleUnhandledRejection(reason, promise));

startAPI()
    .catch(reason => handleStartAPIError(reason))