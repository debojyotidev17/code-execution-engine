import express from "express";
import { pingHandler } from "../controllers/ping.controller.js";
import { pingSchema } from "../validators/ping.validator.js";
import { validateRequestBody } from "../validators/index.js";

const pingRouter = express.Router();

pingRouter.get("/", validateRequestBody(pingSchema), pingHandler);

export default pingRouter;
