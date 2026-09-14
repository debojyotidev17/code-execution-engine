import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const submissionLanguageEnum = pgEnum("submission_language", [
    "javascript",
    "python",
    "cpp",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
    "pending",
    "running",
    "accepted",
    "wrong_answer",
    "time_limit_exceeded",
    "runtime_error",
    "compilation_error",
]);

export const submissions = pgTable("submissions", {
    id: uuid("id").defaultRandom().primaryKey(),

    problemId: uuid("problem_id").notNull(),

    code: text("code").notNull(),

    language: submissionLanguageEnum("language").notNull(),

    status: submissionStatusEnum("status").notNull().default("pending"),

    submissionData: jsonb("submission_data"),

    /**
    * we might store something like:

    *{
    *    "passedTestCases": 10,
    *    "totalTestCases": 10,
    *    "executionTime": 123,
    *    "memoryUsed": 2048
    }
     */

    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .notNull()
        .defaultNow(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .notNull()
        .defaultNow(),
});

/**
*                    submissions
┌─────────────────────────────────────────────┐
│ id                  UUID                    │
│ problem_id          UUID                    │
│ code                TEXT                    │
│ language            submission_language     │
│ status              submission_status       │
│ submission_data     JSONB                   │
│ created_at          TIMESTAMPTZ             │
│ updated_at          TIMESTAMPTZ             │
└─────────────────────────────────────────────┘
 */