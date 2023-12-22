"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateScenario = void 0;
const http_responses_1 = require("../../util/tool/http-responses");
const util_1 = require("../../util/util");
const node_red_config_1 = require("../node-red/node-red-config");
const add_scenario_handler_1 = require("./add-scenario-handler");
function updateScenario(pool) {
    return async (req) => {
        let userParams = [];
        const deviceID = req.url.searchParams.get('device_id');
        const scenarioID = req.url.searchParams.get('scenario_id');
        if (!deviceID && !scenarioID)
            return (0, http_responses_1.jsonResponse)({ message: "Missing Required Values" }, 412);
        const searchParams = req.url.searchParams;
        searchParams.forEach((value, name) => {
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
        const queryRes = await pool.query(`SELECT es.id             AS enabled_service_id,
                   esp.flow_id       AS enabled_service_pack_flow_id,
                   esp.id            AS enabled_service_pack_id,
                   s.service_pack_id AS service_pack_id,
                   s.url             AS service_url,
                   s.params          AS service_params
            FROM enabled_services es
                     JOIN services s on s.id = es.service_id
                     JOIN enabled_service_packs esp
                          on s.service_pack_id = esp.service_pack AND
                             es.home_gateway_id = esp.home_gateway
            WHERE es.service_id = $1
              AND es.home_gateway_id = $2`, [scenarioID, deviceID]);
        if (queryRes.rows.length === 0)
            return (0, http_responses_1.jsonResponse)({ message: "Service is not enabled" });
        const { enabled_service_pack_flow_id, enabled_service_id, service_url, service_params } = queryRes.rows[0];
        const currentFlow = await (0, node_red_config_1.getFlow)(ip_address, username, password, enabled_service_pack_flow_id);
        const scenarioParamsToUpdate = [];
        const scenarioNodes = await (0, util_1.getHTTP)(service_url);
        Object.keys(service_params).forEach(key => {
            if (userParams[key])
                scenarioParamsToUpdate.push({
                    paramToReplace: service_params[key],
                    replaceValue: userParams[key]
                });
        });
        const parsedScenarioNodes = await (0, add_scenario_handler_1.parseScenario)(scenarioNodes, scenarioParamsToUpdate);
        currentFlow["nodes"] = updateNodes(currentFlow, parsedScenarioNodes);
        const res = await (0, node_red_config_1.updateFlow)(username, password, ip_address, enabled_service_pack_flow_id, currentFlow);
        if (!res)
            return (0, http_responses_1.jsonResponse)({ message: "something went wrong" }, 500);
        await pool.query(`UPDATE enabled_services
                          SET service_params = $1
                          WHERE id = $2`, [JSON.stringify(scenarioParamsToUpdate), enabled_service_id]);
        return (0, http_responses_1.jsonResponse)({ message: 'service updated' });
    };
}
exports.updateScenario = updateScenario;
function updateNodes(currentFlow, nodesToUpdate) {
    return currentFlow["nodes"].map(node => {
        const updatedNode = nodesToUpdate.find(update => update.id === node.id);
        if (updatedNode)
            return { ...node, ...updatedNode };
        return node;
    });
}
//# sourceMappingURL=update-scenario-handler.js.map