import express from "express";
import logger from "./config/logger.config.js";
import problemRouter from "./routers/problem.router.js";

import { serverConfig } from "./config/index.js";
import { genericErrorHandler } from "./middlewares/error.middleware.js";
import { attachCorrelationIdMiddleware } from "./middlewares/correlation.middleware.js";

const app = express();

app.use(express.json()); 

/*
 * {
 *  "title": "Two Sum",
 *  "description": "Find two numbers...",
 *  "difficulty": "easy"
 * }
 * 
 * Without express.json(), Express won't automatically put that JSON into req.body
 */

app.use(attachCorrelationIdMiddleware); // every new API req gets a correlation ID

app.use("/problems", problemRouter);

app.use(genericErrorHandler);

app.listen(serverConfig.PORT, () => {
    logger.info(`Server is running on ${serverConfig.PORT}`);
});