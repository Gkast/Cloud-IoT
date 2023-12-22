/// <reference types="node" />
/// <reference types="node" />
import { IncomingMessage, ServerResponse } from "http";
import { Pool } from "pg";
export declare function streamToString(stream: NodeJS.ReadableStream): Promise<string>;
export declare function generateTimestamp(): string;
export declare function formatHttpLogRequest(req: IncomingMessage, res: ServerResponse): string;
export declare function parseRequestCookies(cookie: string): Map<string, string>;
export type DeviceCreds = {
    device_id?: string;
    ip_address?: string;
    username?: string;
    password?: string;
    user_id?: string;
    is_alive?: boolean;
};
export declare function authDevice(deviceID: string, pool: Pool): Promise<DeviceCreds | undefined>;
export declare function getHTTP(url: string): Promise<any>;
