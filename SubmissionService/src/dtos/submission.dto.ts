import { z } from "zod";

import {
    createSubmissionSchema,
    updateSubmissionStatusSchema,
    submissionIdSchema,
} from "../validators/submission.validator.js";

export type CreateSubmissionDTO = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionStatusDTO = z.infer<typeof updateSubmissionStatusSchema>;
export type SubmissionIdDTO = z.infer<typeof submissionIdSchema>;
