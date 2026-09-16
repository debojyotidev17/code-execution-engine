import express from "express";

import {
    createProblemSchema,
    updateProblemSchema,
    findByDifficultySchema,
    searchProblemSchema,
    problemIdSchema,
} from "../validators/problem.validator.js";

import {
    validateRequestBody,
    validateRequestParams,
    validateQueryParams,
} from "../validators/index.js";

import {
    createProblem,
    updateProblem,
    getProblemById,
    getAllProblems,
    deleteProblem,
    findByDifficulty,
    searchProblems,
} from "../controllers/problem.controller.js";

const problemRouter = express.Router();

problemRouter.get("/", getAllProblems);

// API -> GET /problems/search?query=two
problemRouter.get(
    "/search",
    validateQueryParams(searchProblemSchema),
    searchProblems,
);

problemRouter.get(
    "/:id",
    validateRequestParams(problemIdSchema),
    getProblemById,
);

problemRouter.get(
    "/difficulty/:difficulty",
    validateRequestParams(findByDifficultySchema),
    findByDifficulty,
);

problemRouter.post(
    "/",
    validateRequestBody(createProblemSchema),
    createProblem,
);

problemRouter.put(
    "/:id",
    validateRequestParams(problemIdSchema),
    validateRequestBody(updateProblemSchema),
    updateProblem,
);

problemRouter.delete("/:id", deleteProblem);

export default problemRouter;