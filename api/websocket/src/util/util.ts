import {Pool} from "pg";
import {logInfo} from "./tool/logger";

export function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    })
}

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
    logInfo('Authorized')
    return true
}
