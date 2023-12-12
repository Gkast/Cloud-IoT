import {RawData, WebSocket} from "ws";
import {logError, logInfo, logWSMessage} from "../util/tool/logger";
import {MyWebSocketRouter} from "../util/config/router-config";
import {Pool} from "pg";
import {updateGatewayStatus} from "../util/util";

export async function handleWebSocketMessage(ws: WebSocket, message: RawData, router: MyWebSocketRouter, pool: Pool, deviceID: string) {
    try {
        const parsedMessage = JSON.parse(message.toString())
        const command = parsedMessage.command
        if (!command) {
            logInfo("Missing Command")
            ws.terminate()
            await updateGatewayStatus(parsedMessage.device_id, false, pool)
            return
        }
        if (command === 'heartbeat') return
        logWSMessage(message)
        const [webSocketHandler, params] = router.findCommand(command)
        if (webSocketHandler) {
            await webSocketHandler(ws, params)
        } else {
            logInfo('Invalid Command. Closing WebSocket')
            ws.send("Invalid Command")
            ws.close()
            await updateGatewayStatus(parsedMessage.device_id, false, pool)
        }
    } catch (err) {
        logError("WebSocket Handling Message Error:", err)
        ws.terminate()
        await updateGatewayStatus(deviceID, false, pool)
    }
}