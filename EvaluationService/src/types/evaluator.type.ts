export type TestCase = {
    id: string;
    input: string;
    output: string;
};

export type Problem = {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    editorial?: string;
    testcases: TestCase[];
    createdAt: string;
    updatedAt: string;
};

export type EvaluationJob = {
    submissionId: string;
    code: string;
    language: "python" | "cpp";
    problem: Problem;
};

export type EvaluationResult = {
    status: string;
    output: string | undefined;
};