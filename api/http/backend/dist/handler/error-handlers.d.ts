/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { Duplex } from "stream";
import { IncomingMessage } from "http";
import ErrnoException = NodeJS.ErrnoException;
export declare function handleUnhandledRejection(reason: unknown, promise: unknown): void;
export declare function handleStartAPIError(reason: any): void;
export declare function handleServerError(err: ErrnoException, port: string | number): void;
export declare function handleClientError(err: ErrnoException, socket: Duplex): void;
export declare function handleDropRequest(req: IncomingMessage, socket: Duplex): void;
