import {handleWSServerError} from "../../handler/error-handlers";
import {handleWebSocketMessage} from "../../handler/request-handlers";
import {WebSocketServer} from "ws";
import {MyWebSocketRouter} from "./router-config";
import {logError, logInfo, logWSConnection} from "../tool/logger";
import {Pool} from "pg";
import {authDevice, DeviceCreds, updateGatewayStatus} from "../util";

export async function setupServer(router: MyWebSocketRouter, dbPool: Pool, host: string, port: number) {
    const wss = new WebSocketServer({
        host: host,
        port: port,
        perMessageDeflate: {
            zlibDeflateOptions: {
                // See zlib defaults.
                chunkSize: 1024,
                memLevel: 7,
                level: 3
            },
            zlibInflateOptions: {
                chunkSize: 10 * 1024
            },
            // Other options settable:
            clientNoContextTakeover: true, // Defaults to negotiated value.
            serverNoContextTakeover: true, // Defaults to negotiated value.
            serverMaxWindowBits: 10, // Defaults to negotiated value.
            // Below options specified as default values.
            concurrencyLimit: 10, // Limits zlib concurrency for perf.
            threshold: 1024 // Size (in bytes) below which messages
            // should not be compressed if context takeover is disabled.
        }
    });
    wss.on('connection', (ws, req) => {
        const ipAddress = process.env.NODE_ENV === 'development' ? req.socket.remoteAddress : req.headers["x-forwarded-for"] as string;
        const channel = req.url.split('/').pop()
        const [route] = router.findRoute(req.url)
        logWSConnection(req, channel);
        if (!route) {
            logInfo("Wrong channel")
            ws.terminate()
        }
        let authenticated = false
        let deviceID: string | undefined
        ws.on('message', async message => {
            try {
                const parsedMessage = JSON.parse(message.toString())
                deviceID = parsedMessage.device_id
                if (!authenticated) {
                    if (!deviceID) {
                        logInfo("Missing Device ID")
                        ws.terminate()
                        return
                    }
                    const deviceCreds: DeviceCreds = await authDevice(deviceID, ipAddress, dbPool)
                    if (!deviceCreds) {
                        ws.terminate()
                        return
                    }
                    ws.send("Authenticated")
                    authenticated = true
                }
                await handleWebSocketMessage(ws, message, router, dbPool, deviceID);
            } catch (err) {
                logError("WebSocket Handling Message Error:", err)
                ws.terminate()
            }
        });
        ws.on('close', async () => {
            logInfo(ipAddress, 'Closed WebSocket Connection')
            if (deviceID)
                await updateGatewayStatus(deviceID, false, dbPool)
        })
    })
    wss.on('error', err => handleWSServerError(err))
    wss.on('listening', () => logInfo('WebSocket Server Listening at', port))

    return wss
}