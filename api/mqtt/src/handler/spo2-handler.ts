import {Pool} from "pg";
import {MyMqttHandler} from "../util/config/router-config";
import {authDevice, validateMQTTInput} from "../util/util";
import {logInfo} from "../util/tool/logger";

type SpO2 = typeof SpO2Protocol

const SpO2Protocol = {
    spo2: '',
    datetime: ''
}

export function spo2Handler(pool: Pool): MyMqttHandler {
    return async (_, payload, params) => {
        try {
            const authResult = await authDevice(params.id, pool);
            if (!authResult) {
                logInfo('Device authentication failed');
                return;
            }
            const payloadData: SpO2 = JSON.parse(payload.toString());
            const isValid = validateMQTTInput(payloadData, SpO2Protocol);
            if (!isValid) {
                logInfo('Invalid MQTT Message', payload.toString());
                return;
            }
            const {spo2, datetime} = payloadData;

            const insertResult = await pool.query(
                `INSERT INTO spo2(spo2, datetime, device_id)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [spo2, datetime, params.id]
            );

            if (insertResult && insertResult.rows.length > 0) {
                logInfo('SpO2 Inserted with id:', insertResult.rows[0]["id"]);
            } else {
                logInfo('SpO2 insertion failed');
            }
        } catch (error) {
            logInfo('Error handling MQTT SpO2 message:', error.message);
        }
    };
}