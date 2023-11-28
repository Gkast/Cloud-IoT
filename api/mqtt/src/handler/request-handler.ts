// import {IPublishPacket} from "mqtt";
// import {MyMqttRouter} from "../util/config/router-config";
// import {logError, logMqttMessage} from "../util/tool/logger";
//
// export async function handleMessage(topic: string, payload: Buffer, packet: IPublishPacket, router: MyMqttRouter) {
//     logMqttMessage(topic, payload, packet);
//     const [handler, params] = router.find(topic);
//     if (!handler) {
//         logError('Error finding MQTT Handler by topic:', topic)
//     }
//     try {
//         params ? await handler(topic, payload, params) : await handler(topic, payload)
//     } catch (err) {
//         logError('Error Handling MQTT Topic. Packet:', packet)
//     }
//
// }