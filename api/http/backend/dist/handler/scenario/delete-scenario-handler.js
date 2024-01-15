"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteScenario = void 0;
const http_responses_1 = require("../../util/tool/http-responses");
const util_1 = require("../../util/util");
const node_red_config_1 = require("../node-red/node-red-config");
const add_scenario_handler_1 = require("./add-scenario-handler");
function deleteScenario(pool) {
    return async (req) => {
        const deviceID = req.url.searchParams.get('device_id');
        const scenarioID = req.url.searchParams.get('scenario_id');
        if (!deviceID && !scenarioID)
            return (0, http_responses_1.jsonResponse)({ message: "Missing Required Values" }, 412);
        const deviceCreds = await (0, util_1.authDevice)(deviceID, pool);
        if (!deviceCreds)
            return (0, http_responses_1.jsonResponse)({ message: "Unauthorized" }, 401);
        const { username, password, ip_address, is_alive } = deviceCreds;
        if (!is_alive)
            return (0, http_responses_1.jsonResponse)({ message: "Home Gateway is Down!!!" });
        const queryRes = await pool.query(`SELECT es.id             AS enabled_service_id,
                   esp.flow_id       AS enabled_service_pack_flow_id,
                   esp.id            AS enabled_service_pack_id,
                   s.service_pack_id AS service_pack_id
            FROM enabled_services es
                     JOIN services s on s.id = es.service_id
                     JOIN enabled_service_packs esp
                          on s.service_pack_id = esp.service_pack AND
                             es.home_gateway_id = esp.home_gateway
            WHERE es.service_id = $1
              AND es.home_gateway_id = $2`, [scenarioID, deviceID]);
        if (queryRes.rows.length === 0)
            return (0, http_responses_1.jsonResponse)({ message: "Service is not enabled" });
        const queryRes1 = await pool.query(`SELECT s.name            AS service_name,
                                                              s.url             AS service_url,
                                                              es.service_params AS service_params,
                                                              esp.flow_id       AS service_pack_flow_id
                                                       FROM enabled_services es
                                                                JOIN services s on s.id = es.service_id
                                                                JOIN service_packs sp on s.service_pack_id = sp.id
                                                                JOIN enabled_service_packs esp
                                                                     on sp.id = esp.service_pack AND es.home_gateway_id = esp.home_gateway
                                                       WHERE es.id != $1
                                                         AND esp.service_pack = $2
                                                         AND es.home_gateway_id = $3`, [queryRes.rows[0].enabled_service_id, queryRes.rows[0].service_pack_id, deviceID]);
        if (queryRes1.rows.length === 0) {
            const res = await (0, node_red_config_1.deleteFlow)(ip_address, username, password, queryRes.rows[0].enabled_service_pack_flow_id);
            if (!res)
                return (0, http_responses_1.jsonResponse)({ message: "something went wrong" }, 500);
            await Promise.all([
                pool.query(`DELETE
                            FROM enabled_services
                            WHERE id = $1`, [queryRes.rows[0].enabled_service_id]),
                pool.query(`DELETE
                            FROM enabled_service_packs
                            WHERE id = $1`, [queryRes.rows[0].enabled_service_pack_id])
            ]);
            return (0, http_responses_1.jsonResponse)({ message: 'service deleted' });
        }
        const scenarios = [];
        const scenarioParams = [];
        for (const service of queryRes1.rows) {
            const enabledServiceParams = JSON.parse(service.service_params);
            Object.keys(enabledServiceParams).forEach(key => {
                scenarioParams.push({
                    paramToReplace: key,
                    replaceValue: enabledServiceParams[key]
                });
            });
            const scenario = await (0, util_1.getHTTP)(service.service_url);
            const parsedScenario = await (0, add_scenario_handler_1.parseScenario)(scenario, scenarioParams);
            parsedScenario.forEach(node => scenarios.push(node));
        }
        const currentFlow = await (0, node_red_config_1.getFlow)(ip_address, username, password, queryRes.rows[0].enabled_service_pack_flow_id);
        currentFlow["nodes"] = scenarios;
        const res = await (0, node_red_config_1.updateFlow)(username, password, ip_address, queryRes.rows[0].enabled_service_pack_flow_id, currentFlow);
        if (!res)
            return (0, http_responses_1.jsonResponse)({ message: "something went wrong" }, 500);
        await pool.query(`DELETE
                          FROM enabled_services
                          WHERE id = $1`, [queryRes.rows[0].enabled_service_id]);
        return (0, http_responses_1.jsonResponse)({ message: 'service deleted' });
    };
}
exports.deleteScenario = deleteScenario;
//# sourceMappingURL=delete-scenario-handler.js.map