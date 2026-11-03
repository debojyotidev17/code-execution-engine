import express from "express";
import logger from "./config/logger.config.js";

import { serverConfig } from "./config/server.config.js";
import { genericErrorHandler } from "./middlewares/error.middleware.js";
import { startWorkers } from "./workers/evaluation.worker.js";

const app = express();

app.use(genericErrorHandler);

app.listen(serverConfig.PORT, async () => {
    logger.info(`Server is running on ${serverConfig.PORT}`);
    try {
        await startWorkers();
        logger.info("evalutaion workers started");
    } catch (error) {
        logger.error(`Failed to start evalutaion worker: ${String(error)}`);
    } 
});