import {Pool} from "pg";
import {MyHttpHandler} from "../../util/tool/http-tools";
import {jsonResponse} from "../../util/tool/http-responses";
import {authDevice, DeviceCreds, getHTTP} from "../../util/util";
import {deleteFlow, getFlow, updateFlow} from "../node-red/node-red-config";
import {parseScenario} from "./add-scenario-handler";

type QueryRes1 = {
    service_name: string,
    service_url: string,
    service_params: string,
    service_pack_flow_id: string
}

export function deleteScenario(pool: Pool): MyHttpHandler {
    return async req => {
        const deviceID = req.url.searchParams.get('device_id')
        const scenarioID = req.url.searchParams.get('scenario_id')
        if (!deviceID && !scenarioID) return jsonResponse({message: "Missing Required Values"}, 412);
        const deviceCreds: DeviceCreds = await authDevice(deviceID, pool)
        if (!deviceCreds) return jsonResponse({message: "Unauthorized"}, 401)
        const {username, password, ip_address, is_alive} = deviceCreds
        if (!is_alive) return jsonResponse({message: "Home Gateway is Down!!!"})
        const queryRes = await pool.query<{
            enabled_service_id: string,
            enabled_service_pack_flow_id: string,
            enabled_service_pack_id: string,
            service_pack_id: string
        }>(`SELECT es.id             AS enabled_service_id,
                   esp.flow_id       AS enabled_service_pack_flow_id,
                   esp.id            AS enabled_service_pack_id,
                   s.service_pack_id AS service_pack_id
            FROM enabled_services es
                     JOIN services s on s.id = es.service_id
                     JOIN enabled_service_packs esp
                          on s.service_pack_id = esp.service_pack AND
                             es.home_gateway_id = esp.home_gateway
            WHERE es.service_id = $1
              AND es.home_gateway_id = $2`, [scenarioID, deviceID])
        if (queryRes.rows.length === 0) return jsonResponse({message: "Service is not enabled"})
        const queryRes1 = await pool.query<QueryRes1>(`SELECT s.name            AS service_name,
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
                                                         AND es.home_gateway_id = $3`,
            [queryRes.rows[0].enabled_service_id, queryRes.rows[0].service_pack_id, deviceID])

        if (queryRes1.rows.length === 0) {
            const res = await deleteFlow(ip_address, username, password, queryRes.rows[0].enabled_service_pack_flow_id)
            if (!res) return jsonResponse({message: "something went wrong"}, 500)
            await Promise.all([
                pool.query(`DELETE
                            FROM enabled_services
                            WHERE id = $1`, [queryRes.rows[0].enabled_service_id]),
                pool.query(`DELETE
                            FROM enabled_service_packs
                            WHERE id = $1`, [queryRes.rows[0].enabled_service_pack_id])
            ])
            return jsonResponse({message: 'service deleted'})
        }

        const scenarios = []

        for (const service of queryRes1.rows) {
            const scenario = await getHTTP(service.service_url)
            const parsedScenario = await parseScenario(scenario, JSON.parse(service.service_params))
            parsedScenario.forEach(node => scenarios.push(node))
        }

        const currentFlow = await getFlow(ip_address, username, password, queryRes.rows[0].enabled_service_pack_flow_id)
        currentFlow["nodes"] = scenarios;
        const res = await updateFlow(username, password, ip_address, queryRes.rows[0].enabled_service_pack_flow_id, currentFlow)
        if (!res) return jsonResponse({message: "something went wrong"}, 500)
        await pool.query(`DELETE
                          FROM enabled_services
                          WHERE id = $1`, [queryRes.rows[0].enabled_service_id])
        return jsonResponse({message: 'service deleted'})
    }
}

// function removeObjects(currentFlow: any[], nodesToRemove: any[]): any[] {
//     return currentFlow.filter(originalObj => {
//         return !nodesToRemove.some(removeObj => removeObj.id === originalObj.id);
//     });
// }