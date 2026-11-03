import logger from "../config/logger.config.js";

import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { BadRequestError } from "../utils/errors/app.error.js";

export const validateRequestBody = (schema: z.ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info("Validating request body");

            // Zod strips extra fields by default and doesn’t return a validation error just for those fields.
            // A blank required name fails validation and moves execution to catch.
            req.body = await schema.parseAsync(req.body);

            logger.info("Request body is valid");

            next();
        } catch (error) {
            // Tell the caller when the body does not match the expected shape.
            logger.error("Request body is invalid");

            throw new BadRequestError("Invalid req body");
        }
    };
};

/**
 * {
 *  "name": "  Taj Hotel  ",
 *  "address": "Apollo Bunder",
 * }
 * After parsing, req.body is roughly:
 * {
 *  "name": "Taj Hotel",
 *  "address": "Apollo Bunder",
 * }
 */

export const validateRequestParams = (schema: z.ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info("Validating route params");

            await schema.parseAsync(req.params);

            logger.info("Route params are valid");

            next();
        } catch (error) {
            logger.error("Route params are invalid");

            throw new BadRequestError("Route params are invalid");
        }
    };
};

export const validateQueryParams = (schema: z.ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info("Validating query params");

            await schema.parseAsync(req.query);

            logger.info("Query params are valid");

            next();
        } catch (error) {
            logger.error("Query params are invalid");

            throw new BadRequestError("Query params are invalid");
        }
    };
};
