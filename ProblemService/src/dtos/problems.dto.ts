import { z } from "zod";

export const testcaseDto = z.object({
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

export const createProblemDto = z.object({
    title: z
        .string()
        .trim()
        .min(1, "title is required")
        .max(100, "title must be less than 100 characters"),

    description: z.string().trim().min(1, "description is required"),

    difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),

    editorial: z.string().trim().optional(),

    testcases: z.array(testcaseDto).min(1, "at least one testcase is required"),

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

export const updateProblemDto = createProblemDto.partial(); // .partial() changes every field to optional.

export type CreateProblemDto = z.infer<typeof createProblemDto>;
export type UpdateProblemDto = z.infer<typeof updateProblemDto>;
export type Difficulty = "easy" | "medium" | "hard";