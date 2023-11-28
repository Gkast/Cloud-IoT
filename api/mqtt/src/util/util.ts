import {Pool} from "pg";
import {logInfo} from "./tool/logger";

export function generateTimestamp() {
    return new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
}

export async function authDevice(device_id: string, pool: Pool): Promise<boolean> {
    const auth_result = await pool.query(`SELECT device_id
                                          FROM accepted_home_gateways
                                          WHERE device_id = $1`, [device_id])
    if (!auth_result.rows[0]) {
        logInfo('Unauthorized')
        return false
    }
    return true
}

export async function validateMQTTInput(payloadData: Record<string, unknown>, structure: Record<string, unknown>): Promise<boolean> {
    const payloadKeys = Object.keys(payloadData);
    const structureKeys = Object.keys(structure);

    if (payloadKeys.length !== structureKeys.length) {
        return false;
    }

    for (const key of structureKeys) {
        if (!payloadKeys.includes(key)) {
            return false;
        }

        if (typeof payloadData[key] !== typeof structure[key]) {
            return false;
        }
    }

    return true;
}
