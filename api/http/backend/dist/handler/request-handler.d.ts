/// <reference types="node" />
import { IncomingMessage, ServerResponse } from "http";
import { MyHttpRouter } from "../util/config/router-config";
import { Pool } from "pg";
export declare function handleRequest(nodeReq: IncomingMessage, nodeRes: ServerResponse, router: MyHttpRouter, _: Pool): Promise<void>;
