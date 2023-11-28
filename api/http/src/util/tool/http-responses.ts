import {MyHttpResponse} from "./http-tools";
import {getMimeType} from "./mime-types";

export function jsonResponse(body: Object): MyHttpResponse {
    return {
        status: 200,
        headers: {"content-type": getMimeType("json")},
        body: JSON.stringify(body, null, 2)
    }
}

export function notAuthorizedResponse(): MyHttpResponse {
    return {
        status: 401,
        headers: {"content-type": getMimeType("json")},
        body: JSON.stringify({error: "Not Authorized"}, null, 2)
    }
}

export function forbiddenResponse(): MyHttpResponse {
    return {
        status: 403,
        headers: {"content-type": getMimeType("json")},
        body: JSON.stringify({error: "Forbidden"}, null, 2)
    }
}

export function notFoundResponse(): MyHttpResponse {
    return {
        status: 404,
        headers: {"content-type": getMimeType("json")},
        body: JSON.stringify({error: "Not Found"}, null, 2)
    }
}
