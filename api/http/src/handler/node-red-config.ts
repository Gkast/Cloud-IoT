import {MyHttpHandler} from "../util/tool/http-tools";
import {Pool} from "pg";
import * as http from "http";
import {streamToString} from "../util/util";
import {jsonResponse, notFoundResponse} from "../util/tool/http-responses";
import {getMimeType} from "../util/tool/mime-types";
import {logInfo} from "../util/tool/logger";
import {getScenario} from "./heartrate-handler";

export type HomeGateway = {
    device_id: string;
    ip_address: string;
    username: string;
    password: string;
    user_id: string;
    is_allowed: boolean;
};

export function getNodeRedConfig(pool: Pool): MyHttpHandler {
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

export function addScenarioFlow(
    scenario: {
        [key: string]: any;
    },
    deviceCreds: {
        username: string;
        password: string;
        ip_address: string;
    },
) {
    return new Promise((resolve, reject) => {
        const req = http.request(
            {
                host: `${deviceCreds.ip_address}`,
                port: 1880,
                path: "/flow",
                method: "POST",
                headers: {
                    "content-type": getMimeType("json"),
                    "content-length": Buffer.byteLength(JSON.stringify(scenario)),
                    authorization: `Basic ${Buffer.from(
                        `${deviceCreds.username}:${deviceCreds.password}`,
                    ).toString("base64")}`,
                },
            },
            (res) =>
                streamToString(res).then((body) => {
                    logInfo(body);
                    resolve(body);
                }),
        );
        req.on("error", (err) => reject(err));
        req.write(JSON.stringify(scenario));
        req.end();
    });
}

export function addHeartrateScenario(pool: Pool): MyHttpHandler {
    return async (req) => {
        const device_id = req.url.searchParams.get("device_id");
        const scenario_id = req.url.searchParams.get("scenario_id");
        const threshold = req.url.searchParams.get("threshold");
        if (!device_id || !scenario_id || !threshold)
            return jsonResponse({message: "Missing Required Values"}, 412);
        const deviceCreds = await pool.query(
            `SELECT username, password, ip_address
             FROM accepted_home_gateways
             WHERE device_id = $1`,
            [device_id],
        );
        const result = await pool.query(
            `SELECT dn.node_id
             FROM dependency_nodes dn
                      JOIN service_dependencies sd
                           ON dn.id = sd.dependency_id
                      JOIN services s ON sd.service_id = s.id
             WHERE s.id = $1`,
            [scenario_id],
        );
        if (result.rows.length === 0)
            return jsonResponse({message: "Error Configuring Scenario"}, 500);
        const dependencyID = result.rows[0].node_id;
        const scenario = await getScenario(pool, parseInt(scenario_id));
        const parsedScenario = await parseHeartrateScenario(
            scenario,
            threshold,
            dependencyID,
        );
        const healthServicesTab = {
            type: "tab",
            label: "Health Services",
            disabled: false,
            info: "",
            env: [],
            nodes: parsedScenario
        }
        logInfo(healthServicesTab)
        const res = await addScenarioFlow(healthServicesTab, deviceCreds.rows[0]);
        return jsonResponse({message: `Flow ID: ${JSON.stringify(res)}`});
    };
}

export async function parseHeartrateScenario(
    scenario: [{ [key: string]: any }],
    threshold: string,
    db_id: string,
) {
    return scenario.map((node) => {
        const parsedNode = {...node};
        for (const prop in parsedNode) {
            if (typeof parsedNode[prop] === "string") {
                parsedNode[prop] = parsedNode[prop].replace("MYDB_ID", db_id);
                parsedNode[prop] = parsedNode[prop].replace("HR_THRESHOLD", threshold);
            }
        }
        return parsedNode;
    });
}
