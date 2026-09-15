import { z } from "zod";

const testcaseSchema = z.object({
    input: z.string().trim().min(1, "input is required"),
    output: z.string().trim().min(1, "output is required"),
});

/** test case must look like this
 *  {
 *    "input": "...",
 *    "output": "..."
 *  }
 *
 *  example of a test case -
 *
 *  {
 *   "input": "[2,7,11,15], target = 9",
 *   "output": "[0,1]"
 *  }
 */

export const createProblemSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "title is required")
        .max(100, "title must be less than 100 characters"),
    description: z.string().trim().min(1, "description is required"),

    difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
    // means if the client doesn't provide difficulty, Zod will use easy
    // .default("easy") already makes the field optional from the input's perspective.

    editorial: z.string().trim().optional(),
    // .optional()  → may be absent → can result in undefined
    // undefined will be stored in DB as null automatically

    testcases: z
        .array(testcaseSchema)
        .min(1, "at least one testcase is required"),

    /**
     *  {
     *    "title": "Two Sum",
     *    "description": "Given an array of integers...",
     *    "difficulty": "easy",
     *    "editorial": "Use a hashmap.",
     *    "testcases": [
     *       {
     *            "input": "[2,7,11,15], target = 9",
     *            "output": "[0,1]"
     *       },
     *       {
     *            "input": "[3,2,4], target = 6",
     *            "output": "[1,2]"
     *        }
     *     ]
     *  }
     */
});

export const updateProblemSchema = createProblemSchema.partial(); // .partial() changes every field to optional.

export const findByDifficultySchema = z.object({
    difficulty: z.enum(["easy", "medium", "hard"]),
});

export const searchProblemSchema = z.object({
    query: z.string().trim().min(1, "search query is required"),
});

export const problemIdSchema = z.object({
    id: z.uuid("invalid problem id"),
});