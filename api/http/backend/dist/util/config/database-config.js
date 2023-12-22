"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDBPool = void 0;
const pg_1 = require("pg");
const logger_1 = require("../tool/logger");
function initDBPool() {
    return new Promise((resolve, reject) => {
        (0, logger_1.logInfo)('Initializing Database Pool');
        const params = new URL(process.env.PG_URL);
        const config = {
            user: params.username,
            password: params.password,
            host: params.hostname,
            port: parseInt(params.port),
            database: params.pathname.split('/')[1]
        };
        const pool = new pg_1.Pool(config);
        pool.connect((err) => {
            if (err) {
                (0, logger_1.logError)(`Database Error:`, err);
                reject(err);
            }
            else {
                resolve(pool);
            }
        });
    });
}
exports.initDBPool = initDBPool;
//# sourceMappingURL=database-config.js.map