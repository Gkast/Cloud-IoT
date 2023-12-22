"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHTTP = exports.authDevice = exports.parseRequestCookies = exports.formatHttpLogRequest = exports.generateTimestamp = exports.streamToString = void 0;
const http_1 = __importDefault(require("http"));
const logger_1 = require("./tool/logger");
function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}
exports.streamToString = streamToString;
function generateTimestamp() {
    return new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
}
exports.generateTimestamp = generateTimestamp;
function formatHttpLogRequest(req, res) {
    const { socket, method, url, httpVersion, headers } = req;
    const { remoteAddress } = socket;
    const { statusCode } = res;
    const remoteAddressFormatted = process.env.NODE_ENV === 'production' ? req.headers["x-forwarded-for"] : (remoteAddress || '-');
    const authUser = '-';
    const timestamp = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
    const contentLength = res.getHeader('content-length') || '-';
    const referer = headers.referer || '-';
    const userAgent = headers['user-agent'] || '-';
    return `-- ${remoteAddressFormatted} ${authUser} [${timestamp}] "${method || '-'} ${url || '-'} HTTP/${httpVersion || '-'}" ${statusCode || '-'} ${contentLength} "${referer}" "${userAgent}" --`;
}
exports.formatHttpLogRequest = formatHttpLogRequest;
function parseRequestCookies(cookie) {
    const allCookiesMap = new Map();
    if (cookie) {
        cookie.split(";").forEach(cookie => {
            const parts = cookie.split('=', 2);
            allCookiesMap.set(parts[0].trim(), parts[1]);
        });
    }
    return allCookiesMap;
}
exports.parseRequestCookies = parseRequestCookies;
async function authDevice(deviceID, pool) {
    const authResult = await pool.query(`SELECT ip_address, username, password, is_alive
                                                      FROM accepted_home_gateways
                                                      WHERE device_id = $1`, [deviceID]);
    if (!authResult.rows[0]) {
        (0, logger_1.logInfo)('Unauthorized');
        return undefined;
    }
    const { ip_address, username, password, is_alive } = authResult.rows[0];
    return { ip_address, username, password, is_alive };
}
exports.authDevice = authDevice;
function getHTTP(url) {
    return new Promise((resolve, reject) => {
        const req = http_1.default.get(url, res => streamToString(res)
            .then(body => resolve(JSON.parse(body)))
            .catch(reason => reject(reason)));
        req.on('error', err => reject(err));
    });
}
exports.getHTTP = getHTTP;
//# sourceMappingURL=util.js.map