import {Pool} from "pg";
import {MyHttpHandler} from "../util/tool/http-tools";
import {jsonResponse} from "../util/tool/http-responses";


export function getAllUsers(pool: Pool): MyHttpHandler {
    return async _ => {
        const result = await pool.query(`SELECT first_name,
                                                last_name,
                                                email,
                                                date_of_birth,
                                                city,
                                                street_address,
                                                postal_code
                                         FROM users`)
        return jsonResponse(result.rows)
    }
}