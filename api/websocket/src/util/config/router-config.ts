import Router from 'trek-router'
import {WebSocket} from "ws";
import {Pool} from "pg";
import {syncHandler} from "./sync-handler";
import {logInfo} from "../tool/logger";

export type MyWebSocketRouter = {
    addRoute(path: string): void
    findRoute(path: string): [boolean, { [key: string]: string }]
    addCommand(command: string, handler: MyWebSocketHandler): void
    findCommand(command: string): [MyWebSocketHandler, { [key: string]: string } | undefined]
}

export type MyWebSocketHandler = (ws: WebSocket, params?: { [key: string]: string }) => Promise<void>;

export function createWebSocketRouter(): MyWebSocketRouter {
    logInfo('Initializing WebSocket Router')
    const router = new Router()
    return {
        addCommand(command: string, handler: MyWebSocketHandler): void {
            router.add('', command, handler)
            return this;
        },
        addRoute(path: string): void {
            router.add('', path, true)
            return this;
        },
        findCommand(command: string): [MyWebSocketHandler, { [p: string]: string }] {
            return router.find('', command)
        },
        findRoute(path: string): [boolean, { [p: string]: string }] {
            return router.find('', path)
        }
    }
}

export async function initWebSocketRouter(dbPool: Pool) {
    const router = createWebSocketRouter()
    await configureWebSocketRoutes(router, dbPool);
    await configureWebSocketCommands(router, dbPool)
    return router
}

async function configureWebSocketRoutes(router: MyWebSocketRouter, _: Pool) {
    router.addRoute('/ws/info-channel')
}

async function configureWebSocketCommands(router: MyWebSocketRouter, _: Pool) {
    router.addCommand('sync', syncHandler())
}

