import { desc, eq, ilike, or, sql } from "drizzle-orm";
import db from "../models/index.js";
import { problems } from "../models/schemas/problems.schema.js";
import {
    CreateProblemDto,
    UpdateProblemDto,
    Difficulty,
} from "../dtos/problems.dto.js";

// creates a new problem
export async function createProblem(data: CreateProblemDto) {
    const [problem] = await db
        .insert(problems)
        .values({
            title: data.title,
            description: data.description,
            difficulty: data.difficulty ?? "easy",
            editorial: data.editorial,
        })
        .returning();

    return problem;
}

// gets a problem by its id
export async function getProblemById(id: string) {
    const [problem] = await db
        .select()
        .from(problems)
        .where(eq(problems.id, id))
        .limit(1);

    return problem ?? null;
}

// gets all problems with the total count
export async function getAllProblems() {
    const problemList = await db
        .select()
        .from(problems)
        .orderBy(desc(problems.createdAt));

    const [{ total }] = await db
        .select({
            total: sql<number>`count(*)`,
        })
        .from(problems);

    return {
        problems: problemList,
        total: Number(total),
    };
}

// updates a problem by its id
export async function updateProblem(id: string, data: UpdateProblemDto) {
    const [problem] = await db
        .update(problems)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(eq(problems.id, id))
        .returning();

    return problem ?? null;
}

// deletes a problem by its id
export async function deleteProblem(id: string) {
    const deleted = await db
        .delete(problems)
        .where(eq(problems.id, id))
        .returning({
            id: problems.id,
        });

    return deleted.length > 0;
}

// gets problems filtered by difficulty
export async function findByDifficulty(difficulty: Difficulty) {
    return await db
        .select()
        .from(problems)
        .where(eq(problems.difficulty, difficulty))
        .orderBy(desc(problems.createdAt));
}

// searches problems by title or description
export async function searchProblems(query: string) {
    return await db
        .select()
        .from(problems)
        .where(
            or(
                ilike(problems.title, `%${query}%`),
                ilike(problems.description, `%${query}%`),
            ),
        )
        .orderBy(desc(problems.createdAt));
}