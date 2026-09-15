import logger from "../config/logger.config.js";

import { NextFunction, Request, Response } from "express";
import { z } from "zod";

/**
 * @params schema = zod schema to validate
 * @returns = middleware function to validate
 */

export const validateRequestBody = (schema: z.ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info("Validating req body");
            await schema.parseAsync(req.body);
            logger.info("Request body is valid");
            next();
        } catch (error) {
            // if the validation fails
            logger.error("Request body is invalid");
            return res.json({
                message: "Invalid request body",
                success: false,
                error: error,
            });
        }
    };
};

export const validateRequestParams = (schema: z.ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info("Validating req params");
            await schema.parseAsync(req.params);
            next();
        } catch (error) {
            logger.error("Request params is invalid");
            res.status(400).json({
                message: "Invalid request params",
                success: false,
                error: error,
            });
        }
    };
};

export const validateQueryParams = (schema: z.ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info("Validating query params");
            await schema.parseAsync(req.query);
            next();
        } catch (error) {
            logger.error("Query params is invalid");
            res.status(400).json({
                message: "Invalid query params",
                success: false,
                error,
            });
        }
    };
};
