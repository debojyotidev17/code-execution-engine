import express from "express";
import { serverConfig } from "./config/index.js";
import pingRouter from "./routers/ping.router.js";
import { genericErrorHandler } from "./middlewares/error.middleware.js";
import logger from "./config/logger.config.js";
import { attachCorrelationIdMiddleware } from "./middlewares/correlation.middleware.js";
import { startEvaluationWorker } from "./workers/evaluation.worker.js";

const app = express();

app.use(express.json());
app.use(attachCorrelationIdMiddleware);

app.use("/ping", pingRouter);

app.use(genericErrorHandler);

app.listen(serverConfig.PORT, async () => {
    logger.info(`Server is running on ${serverConfig.PORT}`);
    await startEvaluationWorker();
    logger.info("evalutaion workers started");
});
