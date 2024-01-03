import {Pool} from "pg";
import {MyHttpHandler} from "../../util/tool/http-tools";
import {jsonResponse} from "../../util/tool/http-responses";
import {authDevice, DeviceCreds, getHTTP} from "../../util/util";
import {getFlow, updateFlow} from "../node-red/node-red-config";
import {parseScenario} from "./add-scenario-handler";

export function updateScenario(pool: Pool): MyHttpHandler {
    return async req => {
        let userParams: Array<{ [key: string]: string }> = []
        const deviceID = req.url.searchParams.get('device_id')
        const scenarioID = req.url.searchParams.get('scenario_id')
        if (!deviceID && !scenarioID) return jsonResponse({message: "Missing Required Values"}, 412);
        const searchParams = req.url.searchParams
        searchParams.forEach((value, name) => {
            if (name !== 'device_id' && name !== 'scenario_id') {
                userParams[name] = value
            }
        })
        const deviceCreds: DeviceCreds = await authDevice(deviceID, pool)
        if (!deviceCreds) return jsonResponse({message: "Unauthorized"}, 401)
        const {username, password, ip_address, is_alive} = deviceCreds
        if (!is_alive) return jsonResponse({message: "Home Gateway is Down!!!"})
        const queryRes = await pool.query<{
            enabled_service_id: string,
            enabled_service_pack_flow_id: string,
            enabled_service_pack_id: string,
            service_pack_id: string,
            service_url: string,
            service_params: { [key: string]: string }
        }>(`SELECT es.id             AS enabled_service_id,
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
              AND es.home_gateway_id = $2`, [scenarioID, deviceID])
        if (queryRes.rows.length === 0) return jsonResponse({message: "Service is not enabled"})
        const {
            enabled_service_pack_flow_id,
            enabled_service_id,
            service_url,
            service_params
        } = queryRes.rows[0]

        const currentFlow = await getFlow(ip_address, username, password, enabled_service_pack_flow_id)

        const scenarioParamsToUpdate = []
        const scenarioNodes = await getHTTP(service_url);
        Object.keys(service_params).forEach(key => {
            if (userParams[key])
                scenarioParamsToUpdate.push({
                    paramToReplace: service_params[key],
                    replaceValue: userParams[key]
                });
        })
        const parsedScenarioNodes = await parseScenario(scenarioNodes, scenarioParamsToUpdate)
        currentFlow["nodes"] = updateNodes(currentFlow, parsedScenarioNodes)
        const res = await updateFlow(username, password, ip_address, enabled_service_pack_flow_id, currentFlow)
        if (!res) return jsonResponse({message: "something went wrong"}, 500)
        let parsedScenarioParams = {};
        Object.keys(service_params).forEach(key => {
                if (userParams[key])
                    parsedScenarioParams[`${service_params[key]}`] = userParams[key];
            }
        )
        await pool.query(`UPDATE enabled_services
                          SET service_params = $1
                          WHERE id = $2`, [JSON.stringify(parsedScenarioParams), enabled_service_id])
        return jsonResponse({message: 'service updated'})
    }
}

function updateNodes(currentFlow: any, nodesToUpdate: any[]): any[] {
    return currentFlow["nodes"].map(node => {
        const updatedNode = nodesToUpdate.find(update => update.id === node.id)
        if (updatedNode) return {...node, ...updatedNode}
        return node;
    })
}