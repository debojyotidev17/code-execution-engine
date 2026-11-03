import {
    CreateProblemDto,
    Difficulty,
    UpdateProblemDto,
} from "../dtos/problem.dto.js";

import {
    createProblem,
    getProblemById,
    getAllProblems,
    updateProblem,
    deleteProblem,
    findByDifficulty,
    searchProblems,
    findProblemByTitle,
} from "../repositories/problem.repository.js";

import { NotFoundError, ConflictError } from "../utils/errors/app.error.js";

import { sanitizeMarkdown } from "../utils/helpers/markdown-sanitizer.helper.js";

// Creates a problem after sanitizing its Markdown and checking for duplicate titles.
export async function createProblemService(problem: CreateProblemDto) {
    // Check whether the title is already being used.
    const existingProblem = await findProblemByTitle(problem.title);

    if (existingProblem) {
        throw new ConflictError("A problem with this title already exists.");
    }

    // Keep the original problem data while replacing its Markdown with sanitized content.
    const sanitizedPayload = {
        ...problem,
        description: await sanitizeMarkdown(problem.description),
        editorial: problem.editorial
            ? await sanitizeMarkdown(problem.editorial)
            : undefined,
    };

    return createProblem(sanitizedPayload);
}

// Retrieves a problem by ID or reports that it does not exist.
export async function getProblemByIdService(id: string) {
    const problem = await getProblemById(id);

    if (!problem) {
        throw new NotFoundError("Problem not found");
    }

    return problem;
}

// Retrieves all problems from the repository.
export async function getAllProblemsService() {
    return getAllProblems();
}

// Updates a problem after checking its existence and sanitizing Markdown fields.
export async function updateProblemService(
    id: string,
    updateData: UpdateProblemDto,
) {
    // Make sure the problem exists before attempting the update.
    const problem = await getProblemById(id);

    if (!problem) {
        throw new NotFoundError("Problem not found");
    }

    // Prevent this problem from taking another problem's title.
    if (updateData.title !== undefined) {
        const existingProblem = await findProblemByTitle(updateData.title);

        if (existingProblem && existingProblem.id !== id) {
            throw new ConflictError(
                "A problem with this title already exists.",
            );
        }
    }

    // Separate test cases because they are stored in their own table.
    const { testcases, ...problemData } = updateData;

    // Start with the fields the client actually wants to update.
    const sanitizedPayload: UpdateProblemDto = {
        ...problemData,
    };

    if (problemData.description !== undefined) {
        sanitizedPayload.description = await sanitizeMarkdown(
            problemData.description,
        );
    }

    if (problemData.editorial !== undefined) {
        sanitizedPayload.editorial = await sanitizeMarkdown(
            problemData.editorial,
        );
    }

    // Forward test cases separately so the repository can update their table.
    if (testcases !== undefined) {
        sanitizedPayload.testcases = testcases;
    }

    return updateProblem(id, sanitizedPayload);
}

// Deletes a problem or reports that it does not exist.
export async function deleteProblemService(id: string) {
    const result = await deleteProblem(id);

    if (!result) {
        throw new NotFoundError("Problem not found");
    }

    return result;
}

// Retrieves problems that match the requested difficulty.
export async function findByDifficultyService(difficulty: Difficulty) {
    return findByDifficulty(difficulty);
}

// Searches problems using the supplied query.
export async function searchProblemsService(query: string) {
    return searchProblems(query);
}
