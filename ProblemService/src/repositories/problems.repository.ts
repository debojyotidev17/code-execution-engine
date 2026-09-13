import { desc, eq, ilike, or, sql } from "drizzle-orm";

import db from "../models/index.js";
import { problems, testcases } from "../models/schemas/problems.schema.js";

import {
    CreateProblemDto,
    UpdateProblemDto,
    Difficulty,
} from "../dtos/problems.dto.js";

// creates a problem and all of its testcases
export async function createProblem(data: CreateProblemDto) {
    return await db.transaction(async (tx) => {
        // create the problem first
        const [problem] = await tx
            .insert(problems)
            .values({
                title: data.title,
                description: data.description,
                difficulty: data.difficulty,
                editorial: data.editorial,
            })
            .returning();

        // attach all testcases to the new problem
        await tx.insert(testcases).values(
            data.testcases.map((testcase) => ({
                problemId: problem.id,
                input: testcase.input,
                output: testcase.output,
            })),
        );

        return problem;
    });
}

// gets a problem along with all of its testcases
export async function getProblemById(id: string) {
    const [problem] = await db
        .select()
        .from(problems)
        .where(eq(problems.id, id))
        .limit(1);

    if (!problem) {
        return null;
    }

    // get all testcases belonging to this problem
    const problemTestcases = await db
        .select()
        .from(testcases)
        .where(eq(testcases.problemId, id));

    return {
        ...problem,
        testcases: problemTestcases,
    };
}

// gets all problems without testcases
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

// updates a problem and optionally replaces its testcases
export async function updateProblem(id: string, data: UpdateProblemDto) {
    return await db.transaction(async (tx) => {
        // separate testcases because they are stored in another table
        const { testcases: testcaseData, ...problemData } = data;

        // update the problem
        const [problem] = await tx
            .update(problems)
            .set({
                ...problemData,
                updatedAt: new Date(),
            })
            .where(eq(problems.id, id))
            .returning();

        // if no problem exists with the id given
        if (!problem) {
            return null;
        }

        // replace testcases only when they were included in the request
        if (testcaseData) {
            await tx.delete(testcases).where(eq(testcases.problemId, id));

            await tx.insert(testcases).values(
                testcaseData.map((testcase) => ({
                    problemId: id,
                    input: testcase.input,
                    output: testcase.output,
                })),
            );
        }

        return problem;
    });
}

// deletes a problem and its testcases
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
