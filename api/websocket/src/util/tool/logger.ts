import {IncomingMessage} from "http";
import {RawData} from "ws";
import {generateTimestamp} from "../util";


export function logWSConnection(req: IncomingMessage, channel?: string) {
    const remoteAddress = process.env.NODE_ENV === 'development' ? req.socket.remoteAddress || '-' : req.headers["x-forwarded-for"];
    logInfo(`${remoteAddress} Connected`, channel ? `to ${channel}` : '')
}

export function logWSMessage(message: RawData) {
    logInfo('WebSocket message received:', message.toString())
}

export function logInfo(message?: any, ...optionParams: any) {
    const timestamp = generateTimestamp()
    console.log(`[${timestamp}] [INFO]:`, message ? message : '', ...optionParams)
}

export function logError(message?: any, ...optionParams: any) {
    const timestamp = generateTimestamp()
    console.log(`[${timestamp}] [ERROR]:`, message ? message : '', ...optionParams)
}

