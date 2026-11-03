import express from "express";

import {
    createSubmissionSchema,
    submissionIdSchema,
    updateSubmissionStatusSchema,
    problemIdSchema,
} from "../validators/submission.validator.js";

import {
    validateRequestBody,
    validateRequestParams,
} from "../validators/index.js";

import {
    createSubmission,
    getSubmissionById,
    getAllSubmissionsForProblemId,
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

// get all submissions for a problem
submissionRouter.get(
    "/problem/:problemId",
    validateRequestParams(problemIdSchema),
    getAllSubmissionsForProblemId,
);

// get a submission by its id
submissionRouter.get(
    "/:submissionId",
    validateRequestParams(submissionIdSchema),
    getSubmissionById,
);

// delete a submission by its id
submissionRouter.delete(
    "/:submissionId",
    validateRequestParams(submissionIdSchema),
    deleteSubmission,
);

// update the status of a submission
submissionRouter.patch(
    "/:submissionId/status",
    validateRequestParams(submissionIdSchema),
    validateRequestBody(updateSubmissionStatusSchema),
    updateSubmissionStatus,
);

export default submissionRouter;