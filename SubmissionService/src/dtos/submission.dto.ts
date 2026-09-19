import { z } from "zod";

import {
    createSubmissionSchema,
    updateSubmissionStatusSchema,
    submissionIdSchema,
    problemIdSchema,
} from "../validators/submission.validator.js";

// type for data required when creating a submission
export type CreateSubmissionDTO = z.infer<typeof createSubmissionSchema>;

// type for data required when updating a submission's status
export type UpdateSubmissionStatusDTO = z.infer<
    typeof updateSubmissionStatusSchema
>;

// type for data containing a submission ID
export type SubmissionIdDTO = z.infer<typeof submissionIdSchema>;

// type for data containing a problem ID
export type ProblemIdDTO = z.infer<typeof problemIdSchema>;