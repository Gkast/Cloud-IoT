import {logError} from "../util/tool/logger";
import ErrnoException = NodeJS.ErrnoException;

export function handleUnhandledRejection(reason: unknown, promise: unknown) {
    logError('Unhandled Rejection:', reason, promise)
}

export function handleStartAPIError(reason: any) {
    logError(`WebSocket API Startup Error:`, reason)
    process.exit(1)
}

export function handleWSServerError(err: ErrnoException) {
    logError('WebSocket Server Error:', err)
    process.exit(1)
}