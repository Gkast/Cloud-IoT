import {Pool} from "pg";
import {MyMqttHandler} from "../util/config/router-config";
import {authDevice, validateMQTTInput} from "../util/util";
import {logInfo} from "../util/tool/logger";

type Heartrate = typeof heartrateProtocol

const heartrateProtocol = {
    heartrate: '',
    datetime: ''
}

export function heartrateHandler(pool: Pool): MyMqttHandler {
    return async (_, payload, params) => {
        try {
            const payloadData: Heartrate = JSON.parse(payload.toString());
            const isValid = validateMQTTInput(payloadData, heartrateProtocol);
            if (!isValid) {
                logInfo('Invalid MQTT Message', payload.toString());
                return;
            }
            const {heartrate, datetime} = payloadData;
            const authResult = await authDevice(params.id, pool);
            if (!authResult) {
                logInfo('Device authentication failed');
                return;
            }

            const insertResult = await pool.query(
                `INSERT INTO heartrate(heartrate, datetime, device_id)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [heartrate, datetime, params.id]
            );

            if (insertResult && insertResult.rows.length > 0) {
                logInfo('HeartRate Inserted with id:', insertResult.rows[0]["id"]);
            } else {
                logInfo('HeartRate insertion failed');
            }
        } catch (error) {
            logInfo('Error handling MQTT heart rate message:', error.message);
        }
    };
}