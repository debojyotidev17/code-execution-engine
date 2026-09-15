import {
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]); // "difficulty" is the name of the PostgreSQL enum type

export const problems = pgTable("problems", {
    id: uuid().defaultRandom().primaryKey(), 
    title: varchar({ length: 100 }).notNull(),
    description: text().notNull(),
    difficulty: difficultyEnum().notNull().default("easy"),
    editorial: text(),
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

export const testcases = pgTable("testcases", {
    id: uuid().defaultRandom().primaryKey(),

    problemId: uuid("problem_id")
        .notNull()
        .references(() => problems.id, {
            onDelete: "cascade",
        }),

    input: text().notNull(),
    output: text().notNull(),
});

/*
*                   PostgreSQL

┌───────────────────────────────────────────┐
│                  problems                 │
├───────────────────────────────────────────┤
│ id          UUID PRIMARY KEY              │
│ title       VARCHAR(100) NOT NULL         │
│ description TEXT NOT NULL                 │
│ difficulty  difficulty NOT NULL           │
│ editorial   TEXT                          │
│ created_at  TIMESTAMPTZ NOT NULL          │
│ updated_at  TIMESTAMPTZ NOT NULL          │
└──────────────────────-┬───────────────────┘
*                       │
*                       │ 1
*                       │
*                       │
*                       │ N
*                       ▼
┌───────────────────────────────────────────┐
│                 testcases                 │
├───────────────────────────────────────────┤
│ id          UUID PRIMARY KEY              │
│ problem_id  UUID FOREIGN KEY              │
│ input       TEXT NOT NULL                 │
│ output      TEXT NOT NULL                 │
└───────────────────────────────────────────┘
*/
