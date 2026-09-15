import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors/app.error.js";

export const genericErrorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (err instanceof Error && "statusCode" in err) {
        const appError = err as AppError;

        return res.status(appError.statusCode).json({
            success: false,
            message: appError.message,
        });
    }

    const unknownError = err as Error;

    return res.status(500).json({
        success: false,
        message: unknownError.message,
    });
};

/*
 *  Error
 *  ├── name
 *  ├── message
 *  └── stack
 *
 * For example:
 *
 * throw new Error("Database connection failed");
 *
 *  will now safely become:
 *
 *  {
 *     "success": false,
 *     "message": "Database connection failed"
 *  }
 */
