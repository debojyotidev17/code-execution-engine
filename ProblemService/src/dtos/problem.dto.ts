import { z } from "zod";

import {
    createProblemSchema,
    updateProblemSchema,
} from "../validators/problem.validator.js";

export type CreateProblemDto = z.infer<typeof createProblemSchema>;
export type UpdateProblemDto = z.infer<typeof updateProblemSchema>;
export type Difficulty = "easy" | "medium" | "hard";
