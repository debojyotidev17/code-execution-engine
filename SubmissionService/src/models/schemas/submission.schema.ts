import {
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

// defines the programming languages supported by the evaluator
export const submissionLanguageEnum = pgEnum("submission_language", [
    "javascript",
    "python",
    "cpp",
]);

// defines the possible states of a submission during evaluation
export const submissionStatusEnum = pgEnum("submission_status", [
    "pending",
    "running",
    "accepted",
    "wrong_answer",
    "time_limit_exceeded",
    "runtime_error",
    "compilation_error",
]);

// defines the submissions table
export const submissions = pgTable("submissions", {
    // unique identifier for each submission
    id: uuid("id").defaultRandom().primaryKey(),

    // id of the problem this submission belongs to
    // the problem is managed by the Problem Service
    problemId: uuid("problem_id").notNull(),

    // stores the source code submitted by the user
    code: text("code").notNull(),

    // programming language used for the submission
    language: submissionLanguageEnum("language").notNull(),

    // current state of the submission
    // every new submission starts as pending
    status: submissionStatusEnum("status").notNull().default("pending"),

    /*
     * stores additional evaluation results returned by the evaluator
     *
     * example:
     * {
     *   "passedTestCases": 10,
     *   "totalTestCases": 10,
     *   "executionTime": 123,
     *   "memoryUsed": 2048
     * }
     */
    submissionData: jsonb("submission_data"),

    // stores when the submission was created
    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .notNull()
        .defaultNow(),

    // stores when the submission was last updated
    // this needs to be manually updated when the submission changes
    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .notNull()
        .defaultNow(),
});