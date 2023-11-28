import {connect, IClientOptions, MqttClient} from "mqtt";
import {logError, logInfo} from "../tool/logger";
import {initMqttRouter} from "./router-config";
import {Pool} from "pg";

export function initMQTTClient(dbPool: Pool): Promise<MqttClient> {
    return new Promise<MqttClient>((resolve, reject) => {
        logInfo('Initializing MQTT Client');

        const params = new URL(process.env.MQTT_URL)
        const config: IClientOptions = {
            host: params.hostname,
            port: parseInt(params.port),
            username: params.username || '',
            password: params.password || '',
            clientId: 'api',
            reconnectPeriod: 0,
            protocolVersion: 5
        }

        const mqttClient = connect(config);

        mqttClient.on('connect', async () => {
            logInfo('Initializing MQTT Router')
            await initMqttRouter(mqttClient, dbPool)
            resolve(mqttClient);
        });
        mqttClient.on('error', (err) => {
            logError(`MQTT Error occurred`);
            reject(err);
        });
        mqttClient.on('close', () => logInfo('Closing MQTT Client'))
    });
}

