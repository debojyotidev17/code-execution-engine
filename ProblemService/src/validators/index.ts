import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import logger from "../config/logger.config.js";

/**
 * @params schema = zod schema to validate the req body
 * @returns = middleware function to validate the req body
 */

export const validateRequestBody = (schema: z.ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info("Validating req body")
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
