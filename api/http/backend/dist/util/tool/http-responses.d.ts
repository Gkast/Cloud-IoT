import { HttpStatusCodes, MyHttpResponse } from "./http-tools";
export declare function jsonResponse(body: {
    [key: string]: any;
}, status?: HttpStatusCodes): MyHttpResponse;
export declare function notAuthorizedResponse(): MyHttpResponse;
export declare function forbiddenResponse(): MyHttpResponse;
export declare function notFoundResponse(): MyHttpResponse;
