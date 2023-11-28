import {MyHttpHandler} from "../util/tool/http-tools";
import {Pool} from "pg";
import * as http from "http";
import {streamToString} from "../util/util";
import {jsonResponse, notFoundResponse} from "../util/tool/http-responses";

export type HomeGateway = {
    device_id: string,
    ip_address: string,
    username: string,
    password: string,
    user_id: string,
    is_allowed: boolean
}

export function getNodeRedConfig(pool: Pool): MyHttpHandler {
    return async req => {
        const device_id = req.url.searchParams.get('device_id')
        if (!device_id) return jsonResponse({message: 'Missing Device_ID'})
        const result = await pool.query<HomeGateway>(`SELECT username, password, ip_address
                                                      FROM iot.public.accepted_home_gateways
                                                      WHERE device_id = $1`, [device_id])
        if (!result.rows[0]) return notFoundResponse()
        const {username, password, ip_address} = result.rows[0]
        // const credsBase64 = Buffer.from(username).toString('base64') + ':' + Buffer.from(password).toString('base64')
        console.log(result.rows[0])
        return new Promise((resolve, reject) => http.get(`http://${username}:${password}@${ip_address}:1880/flows`, res => streamToString(res).then(body => {
            resolve(jsonResponse(body))
        }).catch(reason => reject(jsonResponse(reason)))))
    }
}