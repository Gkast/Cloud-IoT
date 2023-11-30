import {IncomingMessage, ServerResponse} from "http";
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

export function formatHttpLogRequest(req: IncomingMessage, res: ServerResponse) {
    const {socket, method, url, httpVersion, headers} = req;
    const {remoteAddress} = socket;
    const {statusCode} = res;
    const remoteAddressFormatted = process.env.NODE_ENV === 'production' ? req.headers["x-forwarded-for"] : (remoteAddress || '-');
    const authUser = '-';
    const timestamp = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
    const contentLength = res.getHeader('content-length') || '-';
    const referer = headers.referer || '-';
    const userAgent = headers['user-agent'] || '-';

    return `-- ${remoteAddressFormatted} ${authUser} [${timestamp}] "${method || '-'} ${url || '-'} HTTP/${httpVersion || '-'}" ${statusCode || '-'} ${contentLength} "${referer}" "${userAgent}" --`;
}

export function parseRequestCookies(cookie: string) {
    const allCookiesMap = new Map<string, string>();
    if (cookie) {
        cookie.split(";").forEach(cookie => {
            const parts = cookie.split('=', 2);
            allCookiesMap.set(parts[0].trim(), parts[1]);
        });
    }
    return allCookiesMap;
}

export type DeviceCreds = {
    device_id?: string
    ip_address?: string
    username?: string
    password?: string
    user_id?: string
}

export async function authDevice(device_id: string, pool: Pool): Promise<DeviceCreds | undefined> {
    const auth_result = await pool.query<DeviceCreds>(`SELECT ip_address, username, password
                                                       FROM accepted_home_gateways
                                                       WHERE device_id = $1`, [device_id])
    if (!auth_result.rows[0]) {
        logInfo('Unauthorized')
        return undefined
    }
    const {ip_address, username, password} = auth_result.rows[0]
    return {ip_address, username, password}
}
