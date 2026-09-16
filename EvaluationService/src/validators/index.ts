import logger from "../config/logger.config.js";

import { NextFunction, Request, Response } from "express";
import { z } from "zod";

/**
 * @param schema - Zod schema used to validate the request body
 * @returns middleware function that validates the request body
 */

export const validateRequestBody = (schema: z.ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info("Validating request body");

            await schema.parseAsync(req.body);

            logger.info("Request body is valid");

            next();
        } catch (error) {
            // if validation fails, return a bad request response
            logger.error("Request body is invalid");

            return res.status(400).json({
                message: "Invalid request body",
                success: false,
                error: error,
            });
        }
    };
};

/**
 * @param schema - Zod schema used to validate route parameters
 * @returns middleware function that validates route parameters
 */

export const validateRequestParams = (schema: z.ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info("Validating request params");

            await schema.parseAsync(req.params);

            logger.info("Request params are valid");

            next();
        } catch (error) {
            // if validation fails, return a bad request response
            logger.error("Request params are invalid");

            return res.status(400).json({
                message: "Invalid request params",
                success: false,
                error: error,
            });
        }
    };
};