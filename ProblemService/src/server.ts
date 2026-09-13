import express from "express";
import { serverConfig } from "./config/index.js";
import { genericErrorHandler } from "./middlewares/error.middleware.js";
import logger from "./config/logger.config.js";
import { attachCorrelationIdMiddleware } from "./middlewares/correlation.middleware.js";
import problemRouter from "./routers/problem.router.js";

const app = express();

app.use(express.json());
app.use(attachCorrelationIdMiddleware);

app.use("/problems", problemRouter);

app.use(genericErrorHandler);

app.listen(serverConfig.PORT, () => {
    logger.info("Server is up", { data: "dev server" });
    console.log(`Server is running on ${serverConfig.PORT}`);
});
