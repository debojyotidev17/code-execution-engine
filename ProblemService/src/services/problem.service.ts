import { CreateProblemDto, UpdateProblemDto } from "../dtos/problem.dto.js";

import {
    createProblem,
    getProblemById,
    getAllProblems,
    updateProblem,
    deleteProblem,
    findByDifficulty,
    searchProblems,
} from "../repositories/problem.repository.js";

import { BadRequestError, NotFoundError } from "../utils/errors/app.error.js";

import { sanitizeMarkdown } from "../utils/helpers/markdown-sanitizer.helper.js";

// creates a problem after sanitizing markdown
export async function createProblemService(problem: CreateProblemDto) {
    const sanitizedPayload = {
        ...problem,

        description: await sanitizeMarkdown(problem.description),

        editorial: problem.editorial
            ? await sanitizeMarkdown(problem.editorial)
            : undefined,
    };

    return await createProblem(sanitizedPayload);
}

// gets a problem by id
export async function getProblemByIdService(id: string) {
    const problem = await getProblemById(id);

    if (!problem) {
        throw new NotFoundError("Problem not found");
    }

    return problem;
}

// gets all problems
export async function getAllProblemsService() {
    return await getAllProblems();
}

// updates a problem
export async function updateProblemService(
    id: string,
    updateData: UpdateProblemDto,
) {
    // make sure the problem exists
    const problem = await getProblemById(id);

    if (!problem) {
        throw new NotFoundError("Problem not found");
    }

    // separate testcases because they belong to another table
    const { testcases, ...problemData } = updateData;

    const sanitizedPayload: UpdateProblemDto = {
        ...problemData,
    };

    if (problemData.description) {
        sanitizedPayload.description = await sanitizeMarkdown(
            problemData.description,
        );
    }

    if (problemData.editorial) {
        sanitizedPayload.editorial = await sanitizeMarkdown(
            problemData.editorial,
        );
    }

    if (testcases !== undefined) {
        sanitizedPayload.testcases = testcases;
    }

    return await updateProblem(id, sanitizedPayload);
}

// deletes a problem
export async function deleteProblemService(id: string) {
    const result = await deleteProblem(id);

    if (!result) {
        throw new NotFoundError("Problem not found");
    }

    return result;
}

// finds problems by difficulty
export async function findByDifficultyService(
    difficulty: "easy" | "medium" | "hard",
) {
    return await findByDifficulty(difficulty);
}

// searches problems
export async function searchProblemsService(query: string) {
    if (!query || query.trim() === "") {
        throw new BadRequestError("Query is required");
    }

    return await searchProblems(query);
}
