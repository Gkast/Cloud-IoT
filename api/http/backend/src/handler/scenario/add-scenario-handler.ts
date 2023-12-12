import {Pool, QueryResult} from "pg";
import {MyHttpHandler, MyHttpResponse} from "../../util/tool/http-tools";
import {jsonResponse} from "../../util/tool/http-responses";
import http from "http";
import {getMimeType} from "../../util/tool/mime-types";
import {authDevice, DeviceCreds, getHTTP, streamToString} from "../../util/util";
import {getNodeRedConfig, sendNodeRedConfig} from "../node-red/node-red-config";
import {logInfo} from "../../util/tool/logger";

export type Scenario = {
    type: "tab",
    label: "Health Services",
    disabled: false,
    info: "",
    env: [],
    nodes: ScenarioNodes
}

export type ScenarioNodes = Array<{ [key: string]: string }>

export type ScenarioQueryResult = {
    has_dependency: boolean,
    is_dependency_injected: boolean,
    is_tab_injected: boolean,
    service_id: string
    service_url: string,
    service_params: { [key: string]: string },
    service_pack_id: string,
    service_tab_url: string,
    dependency_data: { [key: string]: string },
    dependency_node_id: string,
    dependency_id: string,
    service_pack_flow_id: string
}

export type ScenarioQueryResultGrouped = {
    has_dependency: boolean
    dependencies: [{
        is_dependency_injected: boolean
        dependency_data: { [key: string]: string },
        dependency_node_id: string,
        dependency_id: string
    }],
    service_id: string
    service_url: string,
    service_params: { [key: string]: string },
    is_tab_injected: boolean,
    service_pack_id: string,
    service_tab_url: string,
    service_pack_flow_id: string
}

export function addScenario(pool: Pool): MyHttpHandler {
    return async req => {
        let userParams: Array<{ [key: string]: string }> = []

        // get device_id and scenario_id from query params
        const deviceID = req.url.searchParams.get('device_id')
        const scenarioID = req.url.searchParams.get('scenario_id')
        if (!deviceID && !scenarioID) return jsonResponse({message: "Missing Required Values"}, 412);

        // get all query params to parse users selected params
        const searchParams = req.url.searchParams
        searchParams.forEach((value, name) => {
            logInfo(value, name)
            if (name !== 'device_id' && name !== 'scenario_id') {
                userParams[name] = value
            }
        })

        // authenticate device
        const deviceCreds: DeviceCreds = await authDevice(deviceID, pool)
        if (!deviceCreds) return jsonResponse({message: "Unauthorized"}, 401)

        const {username, password, ip_address, is_alive} = deviceCreds
        if (!is_alive) return jsonResponse({message: "Home Gateway is Down!!!"})

        // query all necessary info to add scenario
        const scenarioQueryResult = await pool.query<ScenarioQueryResult>(
            `SELECT dn.data IS NOT NULL         AS has_dependency,
                    i.dependency_id IS NOT NULL AS is_dependency_injected,
                    esp.flow_id IS NOT NULL     AS is_tab_injected,
                    s.id                        AS service_id,
                    s.url                       AS service_url,
                    s.params                    AS service_params,
                    sp.id      AS service_pack_id,
                    sp.url                      AS service_tab_url,
                    dn.data                     AS dependency_data,
                    dn.node_id AS dependency_node_id,
                    dn.id      AS dependency_id,
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
                                 AND es.home_gateway_id = $2)`, [scenarioID, deviceID])

        if (scenarioQueryResult.rows.length === 0) return jsonResponse({message: "You have enable this service already!!!"})

        // group dependencies for each scenario
        const scenarioGroupedArray = await parseScenarioQueryResult(scenarioQueryResult) as ScenarioQueryResultGrouped[]
        const scenarioGrouped = scenarioGroupedArray[0]

        // parse dependencies
        if (scenarioGrouped.has_dependency) {
            const dependencyNodes = []
            for (const dependency of scenarioGrouped.dependencies) {
                if (!dependency.is_dependency_injected) {
                    dependency.dependency_data.id = dependency.dependency_node_id
                    const dependencyNode = dependency.dependency_data
                    dependencyNodes.push(dependencyNode)
                }
            }

            // add dependencies
            if (dependencyNodes.length > 0) {
                const nodeRedConfig = await getNodeRedConfig(username, password, ip_address)
                dependencyNodes.forEach(dependencyNode => nodeRedConfig.push(dependencyNode))
                const res = await sendNodeRedConfig(username, password, ip_address, nodeRedConfig)
                if (!res) return jsonResponse({message: "something went wrong"}, 500);
                for (const dependency of scenarioGrouped.dependencies) {
                    if (!dependency.is_dependency_injected)
                        await pool.query(`INSERT INTO injected_dependencies (dependency_id, device_id)
                                          VALUES ($1, $2)`, [dependency.dependency_id, deviceID]);
                }
            }
        }

        // get scenario flow from device if enabled before or from server
        const scenarioUrl = !scenarioGrouped.is_tab_injected ? scenarioGrouped.service_tab_url : `http://${username}:${password}@${ip_address}:1880/flow/${scenarioGrouped.service_pack_flow_id}`
        const scenarioTab: Scenario = await getHTTP(scenarioUrl)

        // get scenario nodes and parse them
        const scenarioNodes: ScenarioNodes = await getHTTP(scenarioGrouped.service_url)
        const scenarioParams = await parseScenarioParams(scenarioGrouped, userParams)
        const parsedScenarioNodes = await parseScenario(scenarioNodes, scenarioParams)
        if (scenarioGrouped.is_tab_injected) {
            parsedScenarioNodes.forEach(parsedScenarioNode => scenarioTab.nodes.push(parsedScenarioNode))
        } else {
            scenarioTab.nodes = parsedScenarioNodes
        }

        return sendScenario(pool, scenarioTab, scenarioGrouped, deviceID, username, password, ip_address, userParams)
    }
}

export async function parseScenarioQueryResult(scenarioQueryResult: QueryResult<ScenarioQueryResult>): Promise<any> {
    const scenarioGrouped: ScenarioQueryResultGrouped[] = [];
    for (const row of scenarioQueryResult.rows) {
        const existingScenario = scenarioGrouped.find(value => value.service_id === row.service_id);

        if (!existingScenario) {
            scenarioGrouped.push({
                has_dependency: row.has_dependency,
                dependencies: [{
                    is_dependency_injected: row.is_dependency_injected,
                    dependency_data: row.dependency_data,
                    dependency_node_id: row.dependency_node_id,
                    dependency_id: row.dependency_id
                }],
                service_id: row.service_id,
                service_pack_id: row.service_pack_id,
                service_url: row.service_url,
                service_params: row.service_params,
                is_tab_injected: row.is_tab_injected,
                service_tab_url: row.service_tab_url,
                service_pack_flow_id: row.service_pack_flow_id
            });
        } else {
            existingScenario.dependencies.push({
                dependency_data: row.dependency_data,
                dependency_node_id: row.dependency_node_id,
                is_dependency_injected: row.is_dependency_injected,
                dependency_id: row.dependency_id
            });
        }
    }
    return scenarioGrouped;
}

export async function parseScenario(
    scenario: Array<{ [key: string]: string }>,
    scenarioParams: Array<{
        paramToReplace: string,
        replaceValue: string
    }>
) {
    return scenario.map((node) => {
        const parsedNode = {...node};
        for (const [prop, value] of Object.entries(parsedNode)) {
            if (typeof value !== "string") continue;
            scenarioParams.forEach(scenarioParam => {
                if (parsedNode[prop].includes(scenarioParam.paramToReplace)) {
                    parsedNode[prop] = parsedNode[prop].replace(
                        new RegExp(scenarioParam.paramToReplace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                        scenarioParam.replaceValue
                    );
                    return;
                }
            });
        }
        return parsedNode;
    });
}

export async function parseScenarioParams(scenarioGrouped: ScenarioQueryResultGrouped, userParams: Array<{
    [key: string]: string
}>) {
    const scenarioParams = []
    Object.keys(scenarioGrouped.service_params).forEach(key => {
            if (userParams[key])
                scenarioParams.push({
                    paramToReplace: scenarioGrouped.service_params[key],
                    replaceValue: userParams[key]
                });
        }
    )
    for (const dependency of scenarioGrouped.dependencies)
        for (const dependencyIDParam of scenarioGrouped.service_params["dependency_ids"])
            scenarioParams.push({
                paramToReplace: dependencyIDParam,
                replaceValue: dependency.dependency_node_id
            })
    console.log('User Params:', userParams)
    console.log('Scenario Params:', scenarioParams)
    return scenarioParams
}

export function sendScenario(pool: Pool, scenarioTab: Scenario,
                             scenarioGrouped: ScenarioQueryResultGrouped,
                             deviceID: string, username: string, password: string, ip_address: string,
                             scenarioParams: any[]): Promise<MyHttpResponse> {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: ip_address,
            port: 1880,
            path: `/flow${scenarioGrouped.is_tab_injected ? '/' + scenarioGrouped.service_pack_flow_id : ''}`,
            method: `${scenarioGrouped.is_tab_injected ? 'PUT' : 'POST'}`,
            headers: {
                "content-type": getMimeType("json"),
                "content-length": Buffer.byteLength(JSON.stringify(scenarioTab)),
                authorization: `Basic ${Buffer.from(
                    `${username}:${password}`,
                ).toString("base64")}`,
            }
        }, res => streamToString(res)
            .then(async body => {
                const parsedBody = JSON.parse(body)
                if (!parsedBody.id) reject(parsedBody)
                if (!scenarioGrouped.is_tab_injected) {
                    await pool.query(`INSERT INTO enabled_service_packs(flow_id, home_gateway, service_pack)
                                      VALUES ($1, $2, $3)
                                      RETURNING id`, [parsedBody.id, deviceID, scenarioGrouped.service_pack_id,])
                }
                await pool.query(`INSERT INTO enabled_services (home_gateway_id, service_id, service_params)
                                  VALUES ($1, $2, $3)`,
                    [deviceID, scenarioGrouped.service_id, JSON.stringify(scenarioParams)])
                resolve(jsonResponse({gateway_res: parsedBody}));
            })
            .catch(reason => reject(reason)))
        req.on('error', err => reject(err))
        req.write(JSON.stringify(scenarioTab))
        req.end()
    });
}
