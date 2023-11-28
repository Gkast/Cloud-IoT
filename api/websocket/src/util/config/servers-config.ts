import {handleWSServerError} from "../../handler/error-handlers";
import {handleWebSocketMessage} from "../../handler/request-handlers";
import {WebSocketServer} from "ws";
import {MyWebSocketRouter} from "./router-config";
import {logWSConnection} from "../tool/logger";
import {Pool} from "pg";

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
        logWSConnection(req);
        ws.on('message', message => handleWebSocketMessage(ws, message, router, dbPool));
    })
    wss.on('error', err => handleWSServerError(err))
    return wss
}