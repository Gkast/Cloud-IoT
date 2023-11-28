import {MqttClient} from "mqtt";
import {Pool} from "pg";
import {logError, logInfo} from "./logger";

export async function initializeGracefulShutdownMechanism(mqttClient: MqttClient, dbPool: Pool, timeoutMs: number) {
    logInfo('Initializing Graceful Shutdown Mechanism');

    const handleGracefulShutdown = (signal: string) => {
        logInfo('Received', signal);
        gracefulShutdown(mqttClient, dbPool, timeoutMs);
    }

    process.once('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
    process.once('SIGINT', () => handleGracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => {
        logError('\nReceived SIGUSR2. Exiting Forcefully');
        process.exit(2)
    })
}

export async function gracefulShutdown(mqttClient: MqttClient, dbPool: Pool, timeoutMs: number) {
    try {
        logInfo('Shutting Down Gracefully')
        setTimeout(() => {
            logError('Forcefully terminating due to timeout');
            process.exit(1);
        }, timeoutMs);
        logInfo('Closing MQTT Client')
        await mqttClient.endAsync(true)
        logInfo('Closing Database Pool Connection')
        await dbPool.end()
        logInfo('Exiting...')
        process.exit(0)

    } catch (err) {
        logError('Error Closing Gracefully', err)
        process.exit(1);
    }
}