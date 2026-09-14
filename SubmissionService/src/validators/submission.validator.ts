import { z } from "zod";

export const createSubmissionSchema = z.object({
    problemId: z.uuid(),
    code: z.string().min(1),
    language: z.enum(["javascript", "python", "cpp"]),
});

export const submissionIdSchema = z.object({
    submissionId: z.uuid(),
});

export const updateSubmissionStatusSchema = z.object({
    status: z.enum([
        "pending",
        "running",
        "accepted",
        "wrong_answer",
        "time_limit_exceeded",
        "runtime_error",
        "compilation_error",
    ]),
});
