import { z } from "zod";

// Validates the structure of an individual test case.
const testcaseSchema = z.object({
    // Input passed to the submitted program; cannot be empty.
    input: z.string().trim().min(1, {
        message: "Test case input is required.",
    }),

    // Expected output used to check the program's result; cannot be empty.
    output: z.string().trim().min(1, {
        message: "Test case output is required.",
    }),
});

// Validates the request body when creating a new problem.
export const createProblemSchema = z.object({
    // Problem title must contain between 1 and 100 characters after trimming.
    title: z
        .string()
        .trim()
        .min(1, {
            message: "Problem title is required.",
        })
        .max(100, {
            message: "Problem title must be at most 100 characters long.",
        }),

    // Problem description must not be empty.
    description: z.string().trim().min(1, {
        message: "Problem description is required.",
    }),

    // Use easy when the client does not provide a difficulty.
    difficulty: z
        .enum(["easy", "medium", "hard"], {
            message: "Difficulty must be easy, medium, or hard.",
        })
        .default("easy"),

    // Editorial is optional and may be omitted from the request.
    editorial: z.string().trim().optional(),

    // A problem must include at least one test case.
    testcases: z.array(testcaseSchema).min(1, {
        message: "At least one test case is required.",
    }),
});

// Makes every field optional for partial updates.
// Any field provided is still validated using its original rules.
export const updateProblemSchema = createProblemSchema
    .partial()
    .refine(
        (data) => Object.values(data).some((value) => value !== undefined),
        {
            message:
                "At least one field must be provided to update the problem.",
        },
    );

// Validates the difficulty query parameter.
export const findByDifficultySchema = z.object({
    difficulty: z.enum(["easy", "medium", "hard"], {
        message: "Difficulty must be easy, medium, or hard.",
    }),
});

// Validates the search query parameter.
export const searchProblemSchema = z.object({
    query: z.string().min(1, {
        message: "Search query is required.",
    }),
});

// Validates the problem ID provided in route parameters.
export const problemIdSchema = z.object({
    id: z.uuid({
        message: "Problem ID must be a valid UUID.",
    }),
});
