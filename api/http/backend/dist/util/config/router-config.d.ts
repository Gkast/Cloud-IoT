import { MyHttpHandler } from "../tool/http-tools";
import { Pool } from "pg";
export type HttpMethod = "GET" | "POST" | "HEAD" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";
export type MyHttpRouter = {
    add(method: HttpMethod, path: string, handler: MyHttpHandler): void;
    find(method: string, path: string): [MyHttpHandler, {
        [key: string]: string;
    } | undefined];
};
export declare function createRouter(): MyHttpRouter;
export declare function initHttpRouter(dbPool: Pool): Promise<MyHttpRouter>;
