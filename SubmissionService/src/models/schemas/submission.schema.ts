import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Lists the programming languages supported by the code evaluator.
export const submissionLanguageEnum = pgEnum("submission_language", [
    "python",
    "cpp",
]);

// Tracks the possible outcomes and progress states of a submission.
export const submissionStatusEnum = pgEnum("submission_status", [
    "pending",
    "accepted",
    "wrong_answer",
    "time_limit_exceeded",
    "runtime_error",
]);

// Stores each user's submitted code and its evaluation status.
export const submissions = pgTable("submissions", {
    // Unique identifier generated automatically for each submission.
    id: uuid("id").defaultRandom().primaryKey(),

    // Identifies the problem being solved; the Problem Service owns problem data.
    problemId: uuid("problem_id").notNull(),

    // Source code submitted by the user for evaluation.
    code: text("code").notNull(),

    // Programming language used to write the submitted code.
    language: submissionLanguageEnum("language").notNull(),

    // Evaluation status; every new submission starts as pending.
    status: submissionStatusEnum("status").notNull().default("pending"),

    // Timestamp recording when the submission was created.
    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .notNull()
        .defaultNow(),

    // Timestamp recording the most recent update; update this manually when the submission changes.
    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .notNull()
        .defaultNow(),
});
