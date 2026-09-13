import express from "express";
import { serverConfig } from "./config/index.js";
import pingRouter from "./routers/ping.router.js";
import { genericErrorHandler } from "./middlewares/error.middleware.js";
import logger from "./config/logger.config.js";
import { attachCorrelationIdMiddleware } from "./middlewares/correlation.middleware.js";

const app = express();

app.use(express.json());
app.use(attachCorrelationIdMiddleware);

app.use('/ping', pingRouter);

app.use(genericErrorHandler);

app.listen(serverConfig.PORT, () => { 
    logger.info("Server is up", { data: "dev server" },);
    console.log(`Server is running on ${serverConfig.PORT}`);
})