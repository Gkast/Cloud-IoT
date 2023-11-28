import {RawData, WebSocket} from "ws";
import {logError, logInfo, logWSMessage} from "../util/tool/logger";
import {MyWebSocketRouter} from "../util/config/router-config";
import {Pool} from "pg";

export async function handleWebSocketMessage(ws: WebSocket, message: RawData, router: MyWebSocketRouter, _: Pool) {
    try {
        logWSMessage(message)
        const [webSocketHandler, params] = router.findCommand(message.toString())
        if (webSocketHandler) {
            await webSocketHandler(ws, params)
        } else {
            logInfo('Invalid Command. Closing WebSocket')
            ws.send("Invalid Command")
            ws.close()
        }
    } catch (e) {
        logError("WebSocket Handling Message Error:", e)
        ws.send('Unexpected Error')
        ws.terminate()
    }
}