import {logError} from "../util/tool/logger";

export function handleUnhandledRejection(reason: unknown, promise: unknown) {
    logError('Unhandled Rejection:', reason, promise)
}

export function handleStartAPIError(reason: any) {
    logError(`MQTT API Startup Error:`, reason)
    process.exit(1)
}