export type Difficulty = "easy" | "medium" | "hard";

export type CreateProblemDto = {
    title: string;
    description: string;
    difficulty?: Difficulty;
    editorial?: string;
};

export type UpdateProblemDto = {
    title?: string;
    description?: string;
    difficulty?: Difficulty;
    editorial?: string;
};
