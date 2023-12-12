import {Pool} from "pg";
import {IClientSubscribeOptions, IClientSubscribeProperties, MqttClient} from "mqtt";
import {heartrateHandler} from "../../handler/heartrate-handler";
import {activityHandler} from "../../handler/activity-handler";
import {logError} from "../tool/logger";
import {spo2Handler} from "../../handler/spo2-handler";

export type MyMqttHandler = (topic: string, payload: Buffer, params?: { [key: string]: string }) => Promise<void>

export type MyMqttRouter = {
    subscribe(topic: string | string[], handler: MyMqttHandler): void;
    subscribe(topic: string | string [], opts: IClientSubscribeOptions | IClientSubscribeProperties, handler: MyMqttHandler): void;
}

export async function initMqttRouter(mqttClient: MqttClient, dbPool: Pool): Promise<MyMqttRouter> {
    const routerPackage = require('mqtt-router')
    const router: MyMqttRouter = routerPackage.wrap(mqttClient)
    await configureMqttRoutes(router, dbPool)
    return router;
}

async function configureMqttRoutes(router: MyMqttRouter, dbPool: Pool) {
    try {
        router.subscribe('tele/+:id/heartrate', {qos: 1}, heartrateHandler(dbPool))
        router.subscribe('tele/+:id/activity', activityHandler(dbPool))
        router.subscribe('tele/+:id/spo2', spo2Handler(dbPool))
    } catch (err) {
        logError('Error Subscribing:', err)
    }
}