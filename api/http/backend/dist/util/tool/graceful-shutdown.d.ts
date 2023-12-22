/// <reference types="node" />
import { Server } from "http";
import { Pool } from "pg";
export declare function initializeGracefulShutdownMechanism(httpServer: Server, dbPool: Pool, timeoutMs: number): Promise<void>;
export declare function gracefulShutdown(httpServer: Server, dbPool: Pool, timeoutMs: number): Promise<void>;
