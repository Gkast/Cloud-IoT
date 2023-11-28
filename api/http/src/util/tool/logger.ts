import {IncomingMessage, ServerResponse} from "http";
import {formatHttpLogRequest, generateTimestamp} from "../util";

export function logHttpRequest(req: IncomingMessage, res: ServerResponse) {
    const logMessage = formatHttpLogRequest(req, res)
    logInfo('HTTP Request received:\n', logMessage);
}

export function logInfo(message?: any, ...optionParams: any) {
    const timestamp = generateTimestamp()
    console.log(`[${timestamp}] [INFO]:`, message ? message : '', ...optionParams)
}

export function logError(message?: any, ...optionParams: any) {
    const timestamp = generateTimestamp()
    console.log(`[${timestamp}] [ERROR]:`, message ? message : '', ...optionParams)
}

