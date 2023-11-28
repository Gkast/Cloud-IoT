import {IPublishPacket} from "mqtt";
import {generateTimestamp} from "../util";

export function logMqttMessage(topic: string, payload: Buffer, packet: IPublishPacket) {
    logInfo('MQTT Message received', `[Topic]: ${topic}`, `[Payload]: ${payload.toString()}`, '[QoS]:', packet.qos, '[LENGTH]:', packet.length)
}

export function logInfo(message?: any, ...optionParams: any) {
    const timestamp = generateTimestamp()
    console.log(`[${timestamp}] [INFO]:`, message ? message : '', ...optionParams)
}

export function logError(message?: any, ...optionParams: any) {
    const timestamp = generateTimestamp()
    console.log(`[${timestamp}] [ERROR]:`, message ? message : '', ...optionParams)
}

