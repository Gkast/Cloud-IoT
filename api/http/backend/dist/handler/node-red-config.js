"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFlow = exports.getFlow = exports.deleteFlow = exports.sendNodeRedConfig = exports.getNodeRedConfig = exports.getNodeRedConfigBrowser = void 0;
const http = __importStar(require("http"));
const util_1 = require("../util/util");
const http_responses_1 = require("../util/tool/http-responses");
const mime_types_1 = require("../util/tool/mime-types");
function getNodeRedConfigBrowser(pool) {
    return async (req) => {
        const device_id = req.url.searchParams.get("device_id");
        if (!device_id)
            return (0, http_responses_1.jsonResponse)({ message: "Missing Device_ID" });
        const result = await pool.query(`SELECT username, password, ip_address
             FROM iot.public.accepted_home_gateways
             WHERE device_id = $1`, [device_id]);
        if (!result.rows[0])
            return (0, http_responses_1.notFoundResponse)();
        const { username, password, ip_address } = result.rows[0];
        console.log(result.rows[0]);
        return new Promise((resolve, reject) => http.get(`http://${username}:${password}@${ip_address}:1880/flows`, (res) => (0, util_1.streamToString)(res)
            .then((body) => {
            resolve((0, http_responses_1.jsonResponse)(JSON.parse(body)));
        })
            .catch((reason) => reject((0, http_responses_1.jsonResponse)(reason)))));
    };
}
exports.getNodeRedConfigBrowser = getNodeRedConfigBrowser;
async function getNodeRedConfig(username, password, ip_address) {
    return new Promise((resolve, reject) => http.get(`http://${username}:${password}@${ip_address}:1880/flows`, (res) => (0, util_1.streamToString)(res)
        .then((body) => resolve(JSON.parse(body)))
        .catch((reason) => reject(reason))));
}
exports.getNodeRedConfig = getNodeRedConfig;
async function sendNodeRedConfig(username, password, ip_address, nodeRedConfig) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: ip_address,
            port: 1880,
            path: '/flows',
            method: 'POST',
            headers: {
                "content-type": (0, mime_types_1.getMimeType)("json"),
                "content-length": Buffer.byteLength(JSON.stringify(nodeRedConfig)),
                authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
                'Node-RED-Deployment-Type': 'full'
            }
        }, res => res.statusCode === 204 ? resolve('Injected') : resolve(undefined));
        req.on("error", (err) => reject(err));
        req.write(JSON.stringify(nodeRedConfig));
        req.end();
    });
}
exports.sendNodeRedConfig = sendNodeRedConfig;
function deleteFlow(ipAddress, username, password, flowID) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: ipAddress,
            port: 1880,
            method: 'DELETE',
            path: `/flow/${flowID}`,
            headers: {
                authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
            }
        }, res => {
            console.log(res.statusCode);
            console.log(res.headers);
            res.statusCode >= 200 && res.statusCode < 300 ? resolve('Deleted') : resolve(undefined);
        });
        req.on("error", (err) => reject(err));
        req.end();
    });
}
exports.deleteFlow = deleteFlow;
function getFlow(ipAddress, username, password, flowID) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: ipAddress,
            port: 1880,
            method: 'GET',
            path: `/flow/${flowID}`,
            headers: {
                authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
            }
        }, res => (0, util_1.streamToString)(res).then(body => resolve(JSON.parse(body))));
        req.on("error", (err) => reject(err));
        req.end();
    });
}
exports.getFlow = getFlow;
async function updateFlow(username, password, ip_address, flowID, flow) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: ip_address,
            port: 1880,
            path: `/flow/${flowID}`,
            method: 'PUT',
            headers: {
                "content-type": (0, mime_types_1.getMimeType)("json"),
                "content-length": Buffer.byteLength(JSON.stringify(flow)),
                authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
            }
        }, res => res.statusCode === 200 ? resolve('Injected') : resolve(undefined));
        req.on("error", (err) => reject(err));
        req.write(JSON.stringify(flow));
        req.end();
    });
}
exports.updateFlow = updateFlow;
//# sourceMappingURL=node-red-config.js.map