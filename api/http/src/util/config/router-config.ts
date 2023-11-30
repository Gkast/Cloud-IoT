import Router from "trek-router";
import {MyHttpHandler} from "../tool/http-tools";
import {Pool} from "pg";
import {jsonResponse, notFoundResponse} from "../tool/http-responses";
import {getAllUsers} from "../../handler/user-handler";
import {logInfo} from "../tool/logger";
import {getHighHeartrateScenario, getLowHeartrateScenario,} from "../../handler/heartrate-handler";
import {getNodeRedConfig,} from "../../handler/node-red-config";
import {addHeartrateScenario, addScenarioV1} from "../../handler/scenario-handler";

export type HttpMethod =
    | "GET"
    | "POST"
    | "HEAD"
    | "PUT"
    | "DELETE"
    | "CONNECT"
    | "OPTIONS"
    | "TRACE"
    | "PATCH";

export type MyHttpRouter = {
    add(method: HttpMethod, path: string, handler: MyHttpHandler): void;

    find(
        method: string,
        path: string,
    ): [MyHttpHandler, { [key: string]: string } | undefined];
};

export function createRouter(): MyHttpRouter {
    const router: MyHttpRouter = new Router();
    return {
        add: (method, path, handler) => {
            router.add(method, path, handler);
            return this;
        },
        find: (method, path) => {
            return router.find(method, path);
        },
    };
}

export async function initHttpRouter(dbPool: Pool): Promise<MyHttpRouter> {
    logInfo("Initializing HTTP Router");
    const router: MyHttpRouter = new Router();
    await configureHttpRoutes(router, dbPool);
    return router;
}

async function configureHttpRoutes(
    httpRouter: MyHttpRouter,
    dbPool: Pool,
): Promise<void> {
    httpRouter.add("GET", "*", () => Promise.resolve(notFoundResponse()));
    httpRouter.add("POST", "*", () => Promise.resolve(notFoundResponse()));

    httpRouter.add("GET", "/api/get-users", getAllUsers(dbPool));
    httpRouter.add(
        "GET",
        "/api/scenario/high-heart-rate",
        getHighHeartrateScenario(dbPool),
    );
    httpRouter.add(
        "GET",
        "/api/scenario/low-heart-rate",
        getLowHeartrateScenario(dbPool),
    );
    httpRouter.add("GET", "/api/node-red/flows", getNodeRedConfig(dbPool));
    httpRouter.add(
        "GET",
        "/api/node-red/add-heartrate",
        addHeartrateScenario(dbPool),
    );
    httpRouter.add("GET", "/api/test/scenario", addScenarioV1(dbPool, 1, 'coreVM'))

    if (process.env.NODE_ENV === "production")
        httpRouter.add("GET", "/health", () =>
            Promise.resolve(jsonResponse({message: "I am healthy"})),
        );
}
