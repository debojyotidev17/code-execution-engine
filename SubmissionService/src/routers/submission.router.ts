import express from "express";

import {
    createSubmissionSchema,
    submissionIdSchema,
    updateSubmissionStatusSchema,
} from "../validators/submission.validator.js";

import {
    validateRequestBody,
    validateRequestParams,
} from "../validators/index.js";

import {
    createSubmission,
    getSubmissionById,
    getSubmissionsByProblemId,
    deleteSubmission,
    updateSubmissionStatus,
} from "../controllers/submission.controller.js";

const submissionRouter = express.Router();

// create a new submission
submissionRouter.post(
    "/",
    validateRequestBody(createSubmissionSchema),
    createSubmission,
);

// get a submission by its id
submissionRouter.get(
    "/:id",
    validateRequestParams(submissionIdSchema),
    getSubmissionById,
);

// get all submissions for a problem
submissionRouter.get("/problem/:problemId", getSubmissionsByProblemId);

// delete a submission by its id
submissionRouter.delete(
    "/:id",
    validateRequestParams(submissionIdSchema),
    deleteSubmission,
);

// update the status of a submission
submissionRouter.put(
    "/:id/status",
    validateRequestParams(submissionIdSchema),
    validateRequestBody(updateSubmissionStatusSchema),
    updateSubmissionStatus,
);

export default submissionRouter;
