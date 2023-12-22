/// <reference types="node" />
import { MyHttpRouter } from "./router-config";
import { Pool } from "pg";
import * as http from "http";
export declare function setupServer(httpRouter: MyHttpRouter, dbPool: Pool, port: string | number): Promise<http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>>;
