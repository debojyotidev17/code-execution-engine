import { z } from "zod";

// validates the request body when creating a new submission
export const createSubmissionSchema = z.object({
    // id of the problem the code is being submitted for
    problemId: z.uuid(),

    // source code submitted by the user
    // the code must not be empty
    code: z.string().min(1),

    // programming language used for the submitted code
    language: z.enum(["python", "cpp"]),
});

// validates the submission ID received through request parameters
export const submissionIdSchema = z.object({
    submissionId: z.uuid(),
});

// validates the problem ID received through request parameters
export const problemIdSchema = z.object({
    problemId: z.uuid(),
});

// validates status updates for a submission
export const updateSubmissionStatusSchema = z.object({
    // only allow statuses supported by the submission lifecycle
    status: z.enum([
        "pending",
        "accepted",
        "wrong_answer",
        "time_limit_exceeded",
        "runtime_error",
    ]),
});