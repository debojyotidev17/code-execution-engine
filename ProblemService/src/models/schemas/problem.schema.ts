import {
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

// Restricts problem difficulty to the three supported levels.
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

// Stores the coding problems created on the platform.
export const problems = pgTable("problems", {
    // Generates a unique UUID for each problem.
    id: uuid().defaultRandom().primaryKey(),

    // Prevents multiple problems from having the same title.
    title: varchar({ length: 100 }).notNull().unique(),

    // Stores the problem statement shown to users.
    description: text().notNull(),

    // Defaults new problems to easy unless another level is provided.
    difficulty: difficultyEnum().notNull().default("easy"),

    // Stores the optional explanation of the problem's solution.
    editorial: text(),

    // Records when the problem was first created.
    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .notNull()
        .defaultNow(),

    // Records when the problem was last updated.
    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .notNull()
        .defaultNow(),
});

// Stores the input and expected output for each problem's test cases.
export const testcases = pgTable("testcases", {
    // Generates a unique UUID for each test case.
    id: uuid().defaultRandom().primaryKey(),

    // Links each test case to its parent problem and removes it when the problem is deleted.
    problemId: uuid("problem_id")
        .notNull()
        .references(() => problems.id, {
            onDelete: "cascade",
        }),

    // Stores the input passed to the submitted solution.
    input: text().notNull(),

    // Stores the expected output used to evaluate the solution.
    output: text().notNull(),
});
