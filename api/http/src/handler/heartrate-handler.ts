import {MyHttpHandler} from "../util/tool/http-tools";
import {Pool} from "pg";
import * as http from "http";
import {streamToString} from "../util/util";
import {jsonResponse} from "../util/tool/http-responses";

// const healthServicesTab = {
//     type: "tab",
//     label: "Health Services",
//     disabled: false,
//     info: "",
//     env: []
// }

export function getHighHeartrateScenario(pool: Pool): MyHttpHandler {
    return async _ => {
        const url = await getScenarioUrl(1, pool)
        return new Promise((resolve, reject) => {
            http.get(url, res => streamToString(res).then(body => {
                const parsedBody = JSON.parse(body)
                resolve(jsonResponse(parsedBody))
            })).on('error', err => reject(err))
        })
    }
}

export function getLowHeartrateScenario(pool: Pool): MyHttpHandler {
    return async _ => {
        const url = await getScenarioUrl(2, pool)
        return new Promise((resolve, reject) => {
            http.get(url, res => streamToString(res).then(body => {
                const parsedBody = JSON.parse(body)
                resolve(jsonResponse(parsedBody))
            })).on('error', err => reject(err))
        })
    }
}

export function getScenarioUrl(id: number, pool: Pool) {
    return new Promise((resolve, reject) => {
        pool.query('SELECT url FROM services WHERE id = $1', [id], (err, result) =>
            err ? reject(err) : resolve(result.rows[0].url))
    })
}