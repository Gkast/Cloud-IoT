import {Duplex} from "stream";
import {IncomingMessage} from "http";
import {logError} from "../util/tool/logger";
import ErrnoException = NodeJS.ErrnoException;

export function handleUnhandledRejection(reason: unknown, promise: unknown) {
    logError('Unhandled Rejection:', reason, promise)
}

export function handleStartAPIError(reason: any) {
    logError(`HTTP API Startup Error:`, reason)
    process.exit(1)
}

export function handleServerError(err: ErrnoException, port: string | number) {
    let errorInfo: string;
    if (err.code === 'EACCES') {
        errorInfo = `Bind ${port} requires elevated privileges`;
    } else if (err.code === 'EADDRINUSE') {
        errorInfo = `Port ${port} is already in use`;
    } else {
        errorInfo = 'Unexpected Error'
    }
    logError('HTTP Server Error:', errorInfo, '\n', err)
    process.exit(1);
}

export function handleClientError(err: ErrnoException, socket: Duplex) {
    if (err.code === 'ECONNRESET' || !socket.writable) {
        logError('Client Error: Socket not writable or Error Code: ECONNRESET')
        return;
    }
    logError('Client Error: Bad Request')
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
}

export function handleDropRequest(req: IncomingMessage, socket: Duplex) {
    logError('Request Dropped:', 'Request details:', req, 'Socket details:', socket);
    socket.end(`HTTP/1.1 503 Service Unavailable\r\n\r\n`);
}
