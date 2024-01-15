import {IncomingMessage, ServerResponse} from "http";
import {MyHttpRouter} from "../util/config/router-config";
import {Pool} from "pg";
import {logError, logHttpRequest} from "../util/tool/logger";
import {getHttpStatusMessage, myResToNodeRes, nodeReqToMyReq} from "../util/tool/http-tools";
import {getMimeType} from "../util/tool/mime-types";


export async function handleRequest(
    nodeReq: IncomingMessage,
    nodeRes: ServerResponse,
    router: MyHttpRouter,
    _: Pool
): Promise<void> {
    if (nodeReq.url !== '/health') logHttpRequest(nodeReq, nodeRes)

    const httpReq = nodeReqToMyReq(nodeReq);
    const parsedUrl = httpReq.url;
    const handlerFound = router.find(nodeReq.method, parsedUrl.pathname.toLowerCase());

    if (!handlerFound || !handlerFound[0]) {
        nodeRes.statusCode = 405;
        nodeRes.setHeader('Content-Type', getMimeType("pl"));
        nodeRes.end('Method not found')
        return;
    }

    try {
        const httpHandler = handlerFound[0];
        const httpRes = await httpHandler(httpReq);
        myResToNodeRes(httpRes, nodeRes);
    } catch (err) {
        logError(`HTTP Request Handling Error: 
Url: ${nodeReq.url} 
Headers: ${JSON.stringify(nodeReq.headers, null, 4)}`, err);
        nodeRes.statusCode = 500;
        nodeRes.statusMessage = getHttpStatusMessage(nodeRes.statusCode);
        nodeRes.setHeader('Content-Type', getMimeType("text"));
        nodeRes.end('Internal Server Error');
    }
}
