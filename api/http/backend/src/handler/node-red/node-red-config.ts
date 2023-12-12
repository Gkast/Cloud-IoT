import {MyHttpHandler} from "../../util/tool/http-tools";
import {Pool} from "pg";
import * as http from "http";
import {streamToString} from "../../util/util";
import {jsonResponse, notFoundResponse} from "../../util/tool/http-responses";
import {getMimeType} from "../../util/tool/mime-types";

export type HomeGateway = {
    device_id: string;
    ip_address: string;
    username: string;
    password: string;
    user_id: string;
    is_allowed: boolean;
};

export function getNodeRedConfigBrowser(pool: Pool): MyHttpHandler {
    return async (req) => {
        const device_id = req.url.searchParams.get("device_id");
        if (!device_id) return jsonResponse({message: "Missing Device_ID"});
        const result = await pool.query<HomeGateway>(
            `SELECT username, password, ip_address
             FROM iot.public.accepted_home_gateways
             WHERE device_id = $1`,
            [device_id],
        );
        if (!result.rows[0]) return notFoundResponse();
        const {username, password, ip_address} = result.rows[0];
        console.log(result.rows[0]);
        return new Promise((resolve, reject) =>
            http.get(
                `http://${username}:${password}@${ip_address}:1880/flows`,
                (res) =>
                    streamToString(res)
                        .then((body) => {
                            resolve(jsonResponse(JSON.parse(body)));
                        })
                        .catch((reason) => reject(jsonResponse(reason))),
            ),
        );
    };
}

export async function getNodeRedConfig(username: string, password: string, ip_address: string): Promise<Array<{
    [key: string]: string
}>> {
    return new Promise((resolve, reject) =>
        http.get(`http://${username}:${password}@${ip_address}:1880/flows`, (res) =>
            streamToString(res)
                .then((body) => resolve(JSON.parse(body)))
                .catch((reason) => reject(reason)),
        ),
    );
}

export async function sendNodeRedConfig(username: string, password: string, ip_address: string, nodeRedConfig: Array<{
    [key: string]: string
}>): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
            const req = http.request({
                host: ip_address,
                port: 1880,
                path: '/flows',
                method: 'POST',
                headers: {
                    "content-type": getMimeType("json"),
                    "content-length": Buffer.byteLength(JSON.stringify(nodeRedConfig)),
                    authorization: `Basic ${Buffer.from(
                        `${username}:${password}`,
                    ).toString("base64")}`,
                    'Node-RED-Deployment-Type': 'full'
                }
            }, res => res.statusCode === 204 ? resolve('Injected') : resolve(undefined))
            req.on("error", (err) => reject(err));
            req.write(JSON.stringify(nodeRedConfig));
            req.end();
        }
    );
}

export function deleteFlow(ipAddress: string, username: string, password: string, flowID: string) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: ipAddress,
            port: 1880,
            method: 'DELETE',
            path: `/flow/${flowID}`,
            headers: {
                authorization: `Basic ${Buffer.from(
                    `${username}:${password}`,
                ).toString("base64")}`
            }
        }, res => {
            console.log(res.statusCode)
            console.log(res.headers)
            res.statusCode >= 200 && res.statusCode < 300 ? resolve('Deleted') : resolve(undefined);
        })
        req.on("error", (err) => reject(err));
        req.end()
    })
}

export function getFlow(ipAddress: string, username: string, password: string, flowID: string) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: ipAddress,
            port: 1880,
            method: 'GET',
            path: `/flow/${flowID}`,
            headers: {
                authorization: `Basic ${Buffer.from(
                    `${username}:${password}`,
                ).toString("base64")}`
            }
        }, res => streamToString(res).then(body => resolve(JSON.parse(body))))
        req.on("error", (err) => reject(err));
        req.end()
    })
}

export async function updateFlow(username: string, password: string, ip_address: string, flowID: string, flow: any): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
            const req = http.request({
                host: ip_address,
                port: 1880,
                path: `/flow/${flowID}`,
                method: 'PUT',
                headers: {
                    "content-type": getMimeType("json"),
                    "content-length": Buffer.byteLength(JSON.stringify(flow)),
                    authorization: `Basic ${Buffer.from(
                        `${username}:${password}`,
                    ).toString("base64")}`
                }
            }, res => res.statusCode === 200 ? resolve('Injected') : resolve(undefined))
            req.on("error", (err) => reject(err));
            req.write(JSON.stringify(flow));
            req.end();
        }
    );
}