import { Request, Response, NextFunction } from "express";
import { v4 as uuidV4 } from "uuid";
import { asyncLocalStorage } from "../utils/helpers/request.helper.js";

export const attachCorrelationIdMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const correlationID = uuidV4();
    asyncLocalStorage.run({ correlationID }, () => { 
        next();
    })
};