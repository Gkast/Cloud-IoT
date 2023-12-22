/// <reference types="node" />
import { IncomingMessage, ServerResponse } from "http";
export declare function logHttpRequest(req: IncomingMessage, res: ServerResponse): void;
export declare function logInfo(message?: any, ...optionParams: any): void;
export declare function logError(message?: any, ...optionParams: any): void;
