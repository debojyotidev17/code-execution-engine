import { z } from "zod";

// Validates the request body when a user creates a new submission.
export const createSubmissionSchema = z.object({
    // UUID of the problem the submitted code is intended to solve.
    problemId: z.uuid({
        message: "Problem ID must be a valid UUID.",
    }),

    // Source code must contain at least one character.
    code: z.string().min(1, {
        message: "Minimum length should be 1 character.",
    }),

    // Only allow programming languages supported by the evaluator.
    language: z.enum(["python", "cpp"], {
        message: "Language must be either 'python' or 'cpp'.",
    }),
});

// Validates the submission ID provided in route parameters.
export const submissionIdSchema = z.object({
    submissionId: z.uuid({
        message: "Submission ID must be a valid UUID.",
    }),
});

// Validates the problem ID provided in route parameters.
export const problemIdSchema = z.object({
    problemId: z.uuid({
        message: "Problem ID must be a valid UUID.",
    }),
});

// Validates status updates for an existing submission.
export const updateSubmissionStatusSchema = z.object({
    // Only allow statuses supported by the submission lifecycle.
    status: z.enum(
        [
            "accepted",
            "wrong_answer",
            "time_limit_exceeded",
            "runtime_error",
        ],
        {
            message: "Please provide a valid submission status.",
        },
    ),
});
