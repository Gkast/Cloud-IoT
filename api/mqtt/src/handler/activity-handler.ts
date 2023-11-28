import {Pool} from "pg";
import {MyMqttHandler} from "../util/config/router-config";
import {authDevice, validateMQTTInput} from "../util/util";
import {logInfo} from "../util/tool/logger";

type Activity = typeof activityProtocol

const activityProtocol = {
    steps: '',
    calories: '',
    distance: '',
    date: ''
}

export function activityHandler(pool: Pool): MyMqttHandler {
    return async (_, payload, params) => {
        if (!params || !params.id) {
            logInfo('Missing device ID in MQTT message parameters');
            return;
        }

        try {
            const payloadData: Activity = JSON.parse(payload.toString());
            const isValid = await validateMQTTInput(payloadData, activityProtocol);

            if (!isValid) {
                logInfo('MQTT Message Not Valid', payload.toString());
                return;
            }

            const {steps, calories, distance, date} = payloadData;
            const auth_result = await authDevice(params.id, pool);

            if (!auth_result) return;

            const insert_result = await pool.query(
                `INSERT INTO activity(steps, calories, distance, datetime, device_id)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
                [steps, calories, distance, date, params.id]
            );

            if (insert_result && insert_result.rows.length > 0) {
                logInfo('Activity Inserted with id:', insert_result.rows[0]["id"]);
            } else {
                logInfo('Activity insertion failed');
            }
        } catch (error) {
            logInfo('Error handling MQTT activity message:', error.message);
        }
    };
}
