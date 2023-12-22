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

export type DeviceCreds = {
    device_id?: string
    ip_address?: string
    username?: string
    password?: string
    user_id?: string
    startup_commands?: string[],
    connected_time?: Date,
    disconnected_time?: Date
}

export async function authDevice(deviceID: string, ipAddress: string, pool: Pool): Promise<DeviceCreds | undefined> {
    const authResult = await pool.query<DeviceCreds>(`SELECT ip_address,
                                                             username,
                                                             password,
                                                             startup_commands,
                                                             connected_time,
                                                             disconnected_time
                                                      FROM accepted_home_gateways
                                                      WHERE device_id = $1`, [deviceID])
    if (!authResult.rows[0]) {
        logInfo('Unauthorized')
        return undefined
    }
    const {ip_address, username, password, startup_commands, connected_time, disconnected_time} = authResult.rows[0]
    await updateIP(deviceID, ipAddress, pool)
    return {ip_address, username, password, startup_commands, connected_time, disconnected_time}
}

export async function updateIP(deviceID: string, ipAddress: string, pool: Pool) {
    await pool.query(`UPDATE accepted_home_gateways
                      SET ip_address     = $1,
                          is_alive       = true,
                          connected_time = CURRENT_TIMESTAMP
                      WHERE device_id = $2`, [ipAddress, deviceID])
}

export async function updateGatewayStatus(deviceID: string, status: boolean, pool: Pool) {
    await pool.query(`UPDATE accepted_home_gateways
                      SET is_alive          = $1,
                          disconnected_time = CURRENT_TIMESTAMP
                      WHERE device_id = $2`, [status, deviceID])
}