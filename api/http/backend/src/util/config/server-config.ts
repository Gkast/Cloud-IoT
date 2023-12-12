import {MyHttpRouter} from "./router-config";
import {Pool} from "pg";
import * as http from "http";
import helmet from "helmet";
import {logError} from "../tool/logger";
import {getHttpStatusMessage} from "../tool/http-tools";
import {getMimeType} from "../tool/mime-types";
import {handleClientError, handleDropRequest, handleServerError} from "../../handler/error-handlers";
import {handleRequest} from "../../handler/request-handler";

export async function setupServer(httpRouter: MyHttpRouter, dbPool: Pool, port: string | number) {
    const server = http.createServer()
    server.on('request', (req, res) =>
        helmet()(req, res, (err) => {
                if (err) {
                    logError('Error Request', err)
                    const body = 'Unexpected Error occurred'
                    res.writeHead(500, getHttpStatusMessage(500), {
                        "Content-Length": Buffer.byteLength(body),
                        "Content-Type": getMimeType("pl")
                    }).end(body)
                } else {
                    handleRequest(req, res, httpRouter, dbPool)
                }
            }
        )
    )
    server.on('error', err => handleServerError(err, port))
    server.on('clientError', (err: NodeJS.ErrnoException, socket) => handleClientError(err, socket))
    server.on('dropRequest', (req, socket) => handleDropRequest(req, socket))
    return server
}