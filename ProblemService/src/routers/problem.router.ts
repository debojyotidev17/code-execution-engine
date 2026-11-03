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

// Returns all available problems.
problemRouter.get("/", getAllProblems);

// Searches problems by a query string, such as /problems/search?query=two.
problemRouter.get(
    "/search",
    validateQueryParams(searchProblemSchema),
    searchProblems,
);

// Returns problems matching a difficulty level, such as /problems/difficulty/easy.
problemRouter.get(
    "/difficulty/:difficulty",
    validateRequestParams(findByDifficultySchema),
    findByDifficulty,
);

// Returns a single problem after validating its ID.
problemRouter.get(
    "/:id",
    validateRequestParams(problemIdSchema),
    getProblemById,
);

// Creates a problem after validating the request body.
problemRouter.post(
    "/",
    validateRequestBody(createProblemSchema),
    createProblem,
);

// Updates an existing problem after validating its ID and submitted fields.
problemRouter.patch(
    "/:id",
    validateRequestParams(problemIdSchema),
    validateRequestBody(updateProblemSchema),
    updateProblem,
);

// Deletes a problem after validating its ID.
problemRouter.delete(
    "/:id",
    validateRequestParams(problemIdSchema),
    deleteProblem,
);

export default problemRouter;
