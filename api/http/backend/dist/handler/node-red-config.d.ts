import { MyHttpHandler } from "../util/tool/http-tools";
import { Pool } from "pg";
export type HomeGateway = {
    device_id: string;
    ip_address: string;
    username: string;
    password: string;
    user_id: string;
    is_allowed: boolean;
};
export declare function getNodeRedConfigBrowser(pool: Pool): MyHttpHandler;
export declare function getNodeRedConfig(username: string, password: string, ip_address: string): Promise<Array<{
    [key: string]: string;
}>>;
export declare function sendNodeRedConfig(username: string, password: string, ip_address: string, nodeRedConfig: Array<{
    [key: string]: string;
}>): Promise<string | undefined>;
export declare function deleteFlow(ipAddress: string, username: string, password: string, flowID: string): Promise<unknown>;
export declare function getFlow(ipAddress: string, username: string, password: string, flowID: string): Promise<unknown>;
export declare function updateFlow(username: string, password: string, ip_address: string, flowID: string, flow: any): Promise<string | undefined>;
