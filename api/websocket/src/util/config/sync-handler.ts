import {MyWebSocketHandler} from "./router-config";

export function syncHandler(): MyWebSocketHandler {
    return async (ws) => {
        ws.send('Syncing...')
    }
}