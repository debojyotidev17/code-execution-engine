import { CreateSubmissionDTO } from "./submission.dto.js";

// Represents the input and expected output for a single test case.
export type TestCaseType = {
    input: string;
    output: string;
};

// Contains the problem details and test cases needed to evaluate a submission.
export type ProblemType = {
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    editorial?: string;
    testcases: TestCaseType[];
};

// Contains all the information the Evaluation Service needs to evaluate a submission.
export type SubmissionJobData = {
    // Identifies the submission whose code needs to be evaluated.
    submissionId: string;

    // Provides the problem details and test cases used during evaluation.
    problem: ProblemType;

    // Source code submitted by the user.
    code: string;

    // Reuse the DTO's language type to keep supported languages consistent.
    language: CreateSubmissionDTO["language"];
};
