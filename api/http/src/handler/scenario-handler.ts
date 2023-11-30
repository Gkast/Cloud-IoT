import {Pool} from "pg";
import {MyHttpHandler} from "../util/tool/http-tools";
import {jsonResponse} from "../util/tool/http-responses";
import {getScenario} from "./heartrate-handler";
import {logInfo} from "../util/tool/logger";
import http from "http";
import {getMimeType} from "../util/tool/mime-types";
import {authDevice, DeviceCreds, streamToString} from "../util/util";
import {getNodeRedConfigV1, sendNodeRedConfigV1} from "./node-red-config";

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
        const [deviceCreds, result_dep] = await Promise.all([pool.query(
            `SELECT username, password, ip_address
             FROM accepted_home_gateways
             WHERE device_id = $1`,
            [device_id],
        ), pool.query(
            `SELECT dn.node_id
             FROM dependency_nodes dn
                      JOIN service_dependencies sd
                           ON dn.id = sd.dependency_id
                      JOIN services s ON sd.service_id = s.id
             WHERE s.id = $1`,
            [scenario_id],
        )])
        if (result_dep.rows.length === 0)
            return jsonResponse({message: "Error Configuring Scenario"}, 500);
        const dependencyID: string = result_dep.rows[0].node_id;
        const scenario = await getScenario(pool, parseInt(scenario_id));
        const parsedScenario = await parseScenario(
            scenario,
            [
                {
                    paramToReplace: "MYDB_ID",
                    replaceValue: dependencyID
                },
                {
                    paramToReplace: "HR_THRESHOLD",
                    replaceValue: threshold
                }
            ]
        );
        const healthServicesTab = {
            type: "tab",
            label: "Health Services",
            disabled: false,
            info: "",
            env: [],
            nodes: parsedScenario,
        };
        logInfo(healthServicesTab);
        const res = await addScenarioFlow(healthServicesTab, deviceCreds.rows[0]);
        return jsonResponse({message: `Flow ID: ${JSON.stringify(res)}`});
    };
}

export async function parseScenario(
    scenario: Array<{ [key: string]: any }>,
    scenarioParams: Array<{
        paramToReplace: string,
        replaceValue: string
    }>
) {
    return scenario.map((node) => {
        const parsedNode = {...node};
        for (const prop in parsedNode)
            if (typeof parsedNode[prop] === "string")
                scenarioParams.forEach(scenarioParam =>
                    parsedNode[prop] = parsedNode[prop].replace(scenarioParam.paramToReplace, scenarioParam.replaceValue))
        return parsedNode;
    });
}

export type ScenarioQueryResult = {
    has_dependency: boolean,
    is_dependency_injected: boolean,
    is_tab_injected: boolean,
    service_id: string
    service_url: string,
    service_params: { [key: string]: string },
    service_tab_url: string,
    dependency_data: { [key: string]: string },
    dependency_id: string,
    service_pack_flow_id: string
}

export type ScenarioQueryResultGrouped = {
    has_dependency: boolean
    dependencies: [{
        is_dependency_injected: boolean
        dependency_data: { [key: string]: string },
        dependency_id: string
    }],
    service_id: string
    service_url: string,
    service_params: { [key: string]: string },
    is_tab_injected: boolean,
    service_tab_url: string,
    service_pack_flow_id: string
}

export function addScenarioV1(pool: Pool, scenario_id: number, device_id: string): MyHttpHandler {
    return async _ => {
        const deviceCreds: DeviceCreds = await authDevice(device_id, pool)
        if (!deviceCreds) return jsonResponse({message: "something went wrong"}, 500)
        const params = {
            threshold: 80,
        }
        const {username, password, ip_address} = deviceCreds
        const scenarioQueryResult = await pool.query<ScenarioQueryResult>(
            `SELECT dn.data IS NOT NULL         AS has_dependency,
                    i.dependency_id IS NOT NULL AS is_dependency_injected,
                    esp.flow_id IS NOT NULL     AS is_tab_injected,
                    s.id                        AS service_id,
                    s.url                       AS service_url,
                    s.params                    AS service_params,
                    sp.url                      AS service_tab_url,
                    dn.data                     AS dependency_data,
                    dn.node_id                  AS dependency_id,
                    esp.flow_id                 AS service_pack_flow_id
             FROM services s
                      JOIN service_packs sp ON sp.id = s.service_pack_id
                      LEFT JOIN service_dependencies sd ON s.id = sd.service_id
                      LEFT JOIN dependency_nodes dn ON dn.id = sd.dependency_id
                      LEFT JOIN injected_dependencies i ON dn.id = i.dependency_id AND i.device_id = $2
                      LEFT JOIN enabled_service_packs esp
                                ON esp.service_pack = (SELECT service_pack_id FROM services WHERE id = $1) AND
                                   esp.home_gateway = $2
             WHERE s.id = $1
               AND NOT EXISTS (SELECT 1
                               FROM enabled_services es
                               WHERE es.service_id = s.id
                                 AND es.home_gateway_id = $2)`, [scenario_id, device_id])


        // --> Add function to parse the query results
        let scenarioGrouped1: { [key: string]: ScenarioQueryResultGrouped } = {};
        for (const row of scenarioQueryResult.rows) {
            const serviceId = row.service_id;

            if (!scenarioGrouped1[serviceId]) {
                scenarioGrouped1[serviceId] = {
                    has_dependency: row.has_dependency,
                    dependencies: [{
                        is_dependency_injected: row.is_dependency_injected,
                        dependency_data: row.dependency_data,
                        dependency_id: row.dependency_id
                    }],
                    service_id: serviceId,
                    service_url: row.service_url,
                    service_params: row.service_params,
                    is_tab_injected: row.is_tab_injected,
                    service_tab_url: row.service_tab_url,
                    service_pack_flow_id: row.service_pack_flow_id
                };
            } else {
                scenarioGrouped1[serviceId].dependencies.push({
                    dependency_data: row.dependency_data,
                    dependency_id: row.dependency_id,
                    is_dependency_injected: row.is_dependency_injected
                });
            }
        }

        if (scenarioGrouped1.has_dependency)
            for (const dependency of scenarioGrouped1) {
                if (!dependency.is_dependency_injected) {
                    const nodeRedConfig = await getNodeRedConfigV1(username, password, ip_address)
                    nodeRedConfig.push(dependency.dependency_data)
                    const res = await sendNodeRedConfigV1(username, password, ip_address, nodeRedConfig)
                    if (!res) jsonResponse({message: "something went wrong"}, 500);
                }
            }
        let scenarioTab: Scenario;

        if (!scenarioGrouped1.is_tab_injected) {
            // fetch tab from static file server
            scenarioTab = await getHTTP(scenarioGrouped1.service_tab_url)

        } else {
            // fetch tab from node-red
        }
        // fetch scenario from static file server
        const scenarioNodes: ScenarioNodes = await getHTTP(scenarioGrouped1.service_url)

        // parse scenario
        let scenarioParams = []
        Object.keys(scenarioGrouped1.service_params).forEach(key => {
                if (params[key])
                    scenarioParams.push({
                        paramToReplace: key,
                        replaceValue: params[key]
                    });
            }
        )
        for (const dependency of scenarioGrouped1.dependencies)
            for (const dependency_id_param of scenarioGrouped1.service_params["dependency_ids"])
                scenarioParams.push({
                    paramToReplace: dependency_id_param,
                    replaceValue: dependency.dependency_id
                })

        // add scenario nodes to tab
        scenarioTab.node = await parseScenario(scenarioNodes, scenarioParams)

        // send scenario to node red
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: ip_address,
                port: 1880,
                path: '/flows',
                method: 'POST',
                headers: {
                    "content-type": getMimeType("json"),
                    "content-length": Buffer.byteLength(JSON.stringify(scenarioTab)),
                    authorization: `Basic ${Buffer.from(
                        `${username}:${password}`,
                    ).toString("base64")}`,
                }
            }, res => streamToString(res)
                .then(body => resolve(jsonResponse(JSON.parse(body))))
                .catch(reason => reject(reason)))
            req.on('error', err => reject(err))
            req.write(JSON.stringify(scenarioTab))
            req.end()
        });

        //
        //     let scenarioGrouped: ScenarioQueryResultGrouped[];
        //     scenarioQueryResult.rows.forEach(row => {
        //         const s = scenarioGrouped.find(s_1 => s_1.service_id === row.service_id)
        //         if (s) {
        //             s.dependencies.push({
        //                 dependency_data: row.dependency_data,
        //                 dependency_id: row.dependency_id,
        //                 is_dependency_injected: row.is_dependency_injected
        //             })
        //         } else {
        //             scenarioGrouped.push({
        //                 has_dependency: row.has_dependency,
        //                 dependencies: [{
        //                     is_dependency_injected: row.is_dependency_injected,
        //                     dependency_data: row.dependency_data,
        //                     dependency_id: row.dependency_id
        //                 }],
        //                 service_id: row.service_id,
        //                 service_url: row.service_url,
        //                 service_params: row.service_params,
        //                 is_tab_injected: row.is_tab_injected,
        //                 service_tab_url: row.service_tab_url,
        //                 service_pack_flow_id: row.service_pack_flow_id
        //             })
        //         }
        //     })
        //
        //     for (const scenario1 of scenarioGrouped) {
        //         if (scenario1.has_dependency)
        //             for (const dependency of scenario1.dependencies) {
        //                 if (!dependency.is_dependency_injected) {
        //                     const nodeRedConfig = await getNodeRedConfigV1(username, password, ip_address)
        //                     nodeRedConfig.push(dependency.dependency_data)
        //                     const res = await sendNodeRedConfigV1(username, password, ip_address, nodeRedConfig)
        //                     if (!res) jsonResponse({message: "something went wrong"}, 500);
        //                 }
        //             }
        //         let scenarioTab: Scenario;
        //
        //         if (!scenario1.is_tab_injected) {
        //             // fetch tab from static file server
        //             scenarioTab = await getHTTP(scenario1.service_tab_url)
        //
        //         } else {
        //             // fetch tab from node-red
        //         }
        //         // fetch scenario from static file server
        //         const scenarioNodes: ScenarioNodes = await getHTTP(scenario1.service_url)
        //
        //         // parse scenario
        //         let scenarioParams = []
        //         Object.keys(scenario1.service_params).forEach(key => {
        //                 if (params[key])
        //                     scenarioParams.push({
        //                         paramToReplace: key,
        //                         replaceValue: params[key]
        //                     });
        //             }
        //         )
        //         for (const dependency of scenario1.dependencies)
        //             for (const dependency_id_param of scenario1.service_params["dependency_ids"])
        //                 scenarioParams.push({
        //                     paramToReplace: dependency_id_param,
        //                     replaceValue: dependency.dependency_id
        //                 })
        //
        //         // add scenario nodes to tab
        //         scenarioTab.node = await parseScenario(scenarioNodes, scenarioParams)
        //
        //         // send scenario to node red
        //        return  new Promise((resolve, reject) => {
        //             const req = http.request({
        //                 host: ip_address,
        //                 port: 1880,
        //                 path: '/flows',
        //                 method: 'POST',
        //                 headers: {
        //                     "content-type": getMimeType("json"),
        //                     "content-length": Buffer.byteLength(JSON.stringify(scenarioTab)),
        //                     authorization: `Basic ${Buffer.from(
        //                         `${username}:${password}`,
        //                     ).toString("base64")}`,
        //                 }
        //             }, res => streamToString(res)
        //                 .then(body => resolve(jsonResponse(JSON.parse(body))))
        //                 .catch(reason => reject(reason)))
        //             req.on('error', err => reject(err))
        //             req.write(JSON.stringify(scenarioTab))
        //             req.end()
        //         });
        //     }
        //
        //
        //     const scenario = scenarioQueryResult.rows[0]
        //     if (scenario.has_dependency && !scenario.is_dependency_injected) {
        //         // add dependency to node-red
        //         const nodeRedConfig = await getNodeRedConfigV1(username, password, ip_address)
        //         nodeRedConfig.push(scenario.dependency_data)
        //         const res = await sendNodeRedConfigV1(username, password, ip_address, nodeRedConfig)
        //         if (!res) return jsonResponse({message: "something went wrong"}, 500)
        //     }
        //     let scenarioTab: Scenario;
        //
        //     if (!scenario.is_tab_injected) {
        //         // fetch tab from static file server
        //         scenarioTab = await getHTTP(scenario.service_tab_url)
        //
        //     } else {
        //         // fetch tab from node-red
        //     }
        //     // fetch scenario from static file server
        //     const scenarioNodes: ScenarioNodes = await getHTTP(scenario.service_url)
        //
        //     // parse scenario
        //     let scenarioParams = []
        //     Object.keys(scenario.service_params).forEach(key => {
        //             if (params[key])
        //                 scenarioParams.push({
        //                     paramToReplace: key,
        //                     replaceValue: params[key]
        //                 });
        //         }
        //     )
        //     scenarioParams.push({
        //         paramToReplace: scenario.service_params['dependency_id'],
        //         replaceValue: scenario.dependency_id
        //     })
        //     const parsedScenarioNodes = await parseScenario(scenarioNodes, scenarioParams)
        //
        //     // add scenario nodes to tab
        //     scenarioTab.node = parsedScenarioNodes
        //
        //     // send scenario to node red
        //     return new Promise((resolve, reject) => {
        //         const req = http.request({
        //             host: ip_address,
        //             port: 1880,
        //             path: '/flows',
        //             method: 'POST',
        //             headers: {
        //                 "content-type": getMimeType("json"),
        //                 "content-length": Buffer.byteLength(JSON.stringify(scenarioTab)),
        //                 authorization: `Basic ${Buffer.from(
        //                     `${username}:${password}`,
        //                 ).toString("base64")}`,
        //             }
        //         }, res => streamToString(res)
        //             .then(body => resolve(jsonResponse(JSON.parse(body))))
        //             .catch(reason => reject(reason)))
        //         req.on('error', err => reject(err))
        //         req.write(JSON.stringify(scenarioTab))
        //         req.end()
        //     })
        // }
    }
}

export type Scenario = {
    "type": "tab",
    "label": "Health Services",
    "disabled": false,
    "info": "",
    "env": [],
    node: ScenarioNodes
}

type ScenarioNodes = Array<{ [key: string]: string }>

export function getHTTP(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = http.get(url, res => streamToString(res)
            .then(body => resolve(JSON.parse(body)))
            .catch(reason => reject(reason)))
        req.on('error', err => reject(err))
    })
}