// its purpose is to give every incoming request a unique ID and make that ID available throughout the request's execution.

import { Request, Response, NextFunction } from "express";
import { v4 as uuidV4 } from "uuid";
import { asyncLocalStorage } from "../utils/helpers/request.helper.js";

export const attachCorrelationIdMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const correlationID = uuidV4(); // generates a random UUID

    //  its job is to store the correlationID in the current request's asynchronous context, so that code deeper in the request flow can retrieve it later.
    asyncLocalStorage.run({ correlationID }, () => {
        next();
    });
};