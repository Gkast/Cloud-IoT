"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initHttpRouter = exports.createRouter = void 0;
const trek_router_1 = __importDefault(require("trek-router"));
const http_responses_1 = require("../tool/http-responses");
const user_handler_1 = require("../../handler/user-handler");
const logger_1 = require("../tool/logger");
const node_red_config_1 = require("../../handler/node-red/node-red-config");
const delete_scenario_handler_1 = require("../../handler/scenario/delete-scenario-handler");
const add_scenario_handler_1 = require("../../handler/scenario/add-scenario-handler");
const update_scenario_handler_1 = require("../../handler/scenario/update-scenario-handler");
function createRouter() {
    const router = new trek_router_1.default();
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
exports.createRouter = createRouter;
async function initHttpRouter(dbPool) {
    (0, logger_1.logInfo)("Initializing HTTP Router");
    const router = new trek_router_1.default();
    await configureHttpRoutes(router, dbPool);
    return router;
}
exports.initHttpRouter = initHttpRouter;
async function configureHttpRoutes(httpRouter, dbPool) {
    httpRouter.add("GET", "*", () => Promise.resolve((0, http_responses_1.notFoundResponse)()));
    httpRouter.add("POST", "*", () => Promise.resolve((0, http_responses_1.notFoundResponse)()));
    httpRouter.add("GET", "/api/get-users", (0, user_handler_1.getAllUsers)(dbPool));
    httpRouter.add("GET", "/api/node-red/flows", (0, node_red_config_1.getNodeRedConfigBrowser)(dbPool));
    httpRouter.add("GET", "/api/node-red/add-scenario", (0, add_scenario_handler_1.addScenario)(dbPool));
    httpRouter.add("GET", "/api/node-red/delete-scenario", (0, delete_scenario_handler_1.deleteScenario)(dbPool));
    httpRouter.add("GET", "/api/node-red/update-scenario", (0, update_scenario_handler_1.updateScenario)(dbPool));
    if (process.env.NODE_ENV === "production")
        httpRouter.add("GET", "/health", () => Promise.resolve((0, http_responses_1.jsonResponse)({ message: "I am healthy" })));
}
//# sourceMappingURL=router-config.js.map