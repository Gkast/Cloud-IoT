"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = void 0;
const http_responses_1 = require("../util/tool/http-responses");
function getAllUsers(pool) {
    return async (_) => {
        const result = await pool.query(`SELECT first_name,
                                                last_name,
                                                email,
                                                date_of_birth,
                                                city,
                                                street_address,
                                                postal_code
                                         FROM users`);
        return (0, http_responses_1.jsonResponse)(result.rows);
    };
}
exports.getAllUsers = getAllUsers;
//# sourceMappingURL=user-handler.js.map