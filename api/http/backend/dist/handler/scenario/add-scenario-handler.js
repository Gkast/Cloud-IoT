"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendScenario = exports.parseScenarioParams = exports.parseScenario = exports.parseScenarioQueryResult = exports.addScenario = void 0;
const http_responses_1 = require("../../util/tool/http-responses");
const http_1 = __importDefault(require("http"));
const mime_types_1 = require("../../util/tool/mime-types");
const util_1 = require("../../util/util");
const node_red_config_1 = require("../node-red/node-red-config");
const logger_1 = require("../../util/tool/logger");
function addScenario(pool) {
    return async (req) => {
        let userParams = [];
        const deviceID = req.url.searchParams.get('device_id');
        const scenarioID = req.url.searchParams.get('scenario_id');
        if (!deviceID && !scenarioID)
            return (0, http_responses_1.jsonResponse)({ message: "Missing Required Values" }, 412);
        const searchParams = req.url.searchParams;
        searchParams.forEach((value, name) => {
            (0, logger_1.logInfo)(value, name);
            if (name !== 'device_id' && name !== 'scenario_id') {
                userParams[name] = value;
            }
        });
        const deviceCreds = await (0, util_1.authDevice)(deviceID, pool);
        if (!deviceCreds)
            return (0, http_responses_1.jsonResponse)({ message: "Unauthorized" }, 401);
        const { username, password, ip_address, is_alive } = deviceCreds;
        if (!is_alive)
            return (0, http_responses_1.jsonResponse)({ message: "Home Gateway is Down!!!" });
        const scenarioQueryResult = await pool.query(`SELECT dn.data IS NOT NULL         AS has_dependency,
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
                                 AND es.home_gateway_id = $2)`, [scenarioID, deviceID]);
        if (scenarioQueryResult.rows.length === 0)
            return (0, http_responses_1.jsonResponse)({ message: "You have enable this service already!!!" });
        const scenarioGroupedArray = await parseScenarioQueryResult(scenarioQueryResult);
        const scenarioGrouped = scenarioGroupedArray[0];
        if (scenarioGrouped.has_dependency) {
            const dependencyNodes = [];
            for (const dependency of scenarioGrouped.dependencies) {
                if (!dependency.is_dependency_injected) {
                    dependency.dependency_data.id = dependency.dependency_node_id;
                    const dependencyNode = dependency.dependency_data;
                    dependencyNodes.push(dependencyNode);
                }
            }
            if (dependencyNodes.length > 0) {
                const nodeRedConfig = await (0, node_red_config_1.getNodeRedConfig)(username, password, ip_address);
                dependencyNodes.forEach(dependencyNode => nodeRedConfig.push(dependencyNode));
                const res = await (0, node_red_config_1.sendNodeRedConfig)(username, password, ip_address, nodeRedConfig);
                if (!res)
                    return (0, http_responses_1.jsonResponse)({ message: "something went wrong" }, 500);
                for (const dependency of scenarioGrouped.dependencies) {
                    if (!dependency.is_dependency_injected)
                        await pool.query(`INSERT INTO injected_dependencies (dependency_id, device_id)
                                          VALUES ($1, $2)`, [dependency.dependency_id, deviceID]);
                }
            }
        }
        const scenarioUrl = !scenarioGrouped.is_tab_injected ? scenarioGrouped.service_tab_url : `http://${username}:${password}@${ip_address}:1880/flow/${scenarioGrouped.service_pack_flow_id}`;
        const scenarioTab = await (0, util_1.getHTTP)(scenarioUrl);
        const scenarioNodes = await (0, util_1.getHTTP)(scenarioGrouped.service_url);
        const scenarioParams = await parseScenarioParams(scenarioGrouped, userParams);
        const parsedScenarioNodes = await parseScenario(scenarioNodes, scenarioParams);
        if (scenarioGrouped.is_tab_injected) {
            parsedScenarioNodes.forEach(parsedScenarioNode => scenarioTab.nodes.push(parsedScenarioNode));
        }
        else {
            scenarioTab.nodes = parsedScenarioNodes;
        }
        return sendScenario(pool, scenarioTab, scenarioGrouped, deviceID, username, password, ip_address, userParams);
    };
}
exports.addScenario = addScenario;
async function parseScenarioQueryResult(scenarioQueryResult) {
    const scenarioGrouped = [];
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
        }
        else {
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
exports.parseScenarioQueryResult = parseScenarioQueryResult;
async function parseScenario(scenario, scenarioParams) {
    return scenario.map((node) => {
        const parsedNode = { ...node };
        for (const [prop, value] of Object.entries(parsedNode)) {
            if (typeof value !== "string")
                continue;
            scenarioParams.forEach(scenarioParam => {
                if (parsedNode[prop].includes(scenarioParam.paramToReplace)) {
                    parsedNode[prop] = parsedNode[prop].replace(new RegExp(scenarioParam.paramToReplace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), scenarioParam.replaceValue);
                    return;
                }
            });
        }
        return parsedNode;
    });
}
exports.parseScenario = parseScenario;
async function parseScenarioParams(scenarioGrouped, userParams) {
    const scenarioParams = [];
    Object.keys(scenarioGrouped.service_params).forEach(key => {
        if (userParams[key])
            scenarioParams.push({
                paramToReplace: scenarioGrouped.service_params[key],
                replaceValue: userParams[key]
            });
    });
    for (const dependency of scenarioGrouped.dependencies)
        for (const dependencyIDParam of scenarioGrouped.service_params["dependency_ids"])
            scenarioParams.push({
                paramToReplace: dependencyIDParam,
                replaceValue: dependency.dependency_node_id
            });
    console.log('User Params:', userParams);
    console.log('Scenario Params:', scenarioParams);
    return scenarioParams;
}
exports.parseScenarioParams = parseScenarioParams;
function sendScenario(pool, scenarioTab, scenarioGrouped, deviceID, username, password, ip_address, scenarioParams) {
    return new Promise((resolve, reject) => {
        const req = http_1.default.request({
            host: ip_address,
            port: 1880,
            path: `/flow${scenarioGrouped.is_tab_injected ? '/' + scenarioGrouped.service_pack_flow_id : ''}`,
            method: `${scenarioGrouped.is_tab_injected ? 'PUT' : 'POST'}`,
            headers: {
                "content-type": (0, mime_types_1.getMimeType)("json"),
                "content-length": Buffer.byteLength(JSON.stringify(scenarioTab)),
                authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
            }
        }, res => (0, util_1.streamToString)(res)
            .then(async (body) => {
            const parsedBody = JSON.parse(body);
            if (!parsedBody.id)
                reject(parsedBody);
            if (!scenarioGrouped.is_tab_injected) {
                await pool.query(`INSERT INTO enabled_service_packs(flow_id, home_gateway, service_pack)
                                      VALUES ($1, $2, $3)
                                      RETURNING id`, [parsedBody.id, deviceID, scenarioGrouped.service_pack_id,]);
            }
            await pool.query(`INSERT INTO enabled_services (home_gateway_id, service_id, service_params)
                                  VALUES ($1, $2, $3)`, [deviceID, scenarioGrouped.service_id, JSON.stringify(scenarioParams)]);
            resolve((0, http_responses_1.jsonResponse)({ gateway_res: parsedBody }));
        })
            .catch(reason => reject(reason)));
        req.on('error', err => reject(err));
        req.write(JSON.stringify(scenarioTab));
        req.end();
    });
}
exports.sendScenario = sendScenario;
//# sourceMappingURL=add-scenario-handler.js.map