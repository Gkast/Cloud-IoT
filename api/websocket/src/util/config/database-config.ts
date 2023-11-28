import {Pool, PoolConfig} from "pg";
import {logError, logInfo} from "../tool/logger";

export function initDBPool(): Promise<Pool> {
    return new Promise((resolve, reject) => {
        logInfo('Initializing Database Pool');

        const params = new URL(process.env.PG_URL)
        const config: PoolConfig = {
            user: params.username,
            password: params.password,
            host: params.hostname,
            port: parseInt(params.port),
            database: params.pathname.split('/')[1]
        };

        const pool = new Pool(config)

        pool.connect((err) => {
            if (err) {
                logError(`Database Error:`, err)
                reject(err)
            } else {
                resolve(pool);
            }
        })
    })
}