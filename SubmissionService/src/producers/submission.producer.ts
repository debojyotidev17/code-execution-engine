import logger from "../config/logger.config.js";
import type { CreateSubmissionDTO } from "../dtos/submission.dto.js";
import {
    submissionQueue,
    SUBMISSION_QUEUE,
} from "../queues/submission.queue.js";

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

// Add a submission to the queue so a worker can evaluate it asynchronously.
export async function addSubmissionJob(data: SubmissionJobData) {
    try {
        // Store the job in Redis so an Evaluation Worker can process it.
        const job = await submissionQueue.add(SUBMISSION_QUEUE, data);

        // Log the job ID to help trace the submission through the evaluation workflow.
        logger.info(`Submission job added successfully: ${job.id}`);
    } catch (error) {
        // Log the original error to help diagnose why the job could not be queued.
        logger.error("Failed to add submission job", error);

        // Let the caller know that the submission could not be queued.
        throw new Error("Cannot add submission job to queue", {
            cause: error,
        });
    }
}