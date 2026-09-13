import { Request, Response, NextFunction } from "express";
import { AppError} from "../utils/errors/app.error.js"

export const genericErrorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => { 
    res.status(err.statusCode).json({
        success: false,
        message: err.message
    })
}