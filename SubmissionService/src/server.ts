import express from "express";
import submissionRouter from "./routers/submission.router.js";
import logger from "./config/logger.config.js";

import { serverConfig } from "./config/server.config.js";
import { genericErrorHandler } from "./middlewares/error.middleware.js";
import { attachCorrelationIdMiddleware } from "./middlewares/correlation.middleware.js";

const app = express();

app.use(attachCorrelationIdMiddleware);
app.use(express.json());

app.use("/submissions", submissionRouter);

app.use(genericErrorHandler);

app.listen(serverConfig.PORT, () => {
    logger.info(`Submission Service is running on ${serverConfig.PORT}`);
});