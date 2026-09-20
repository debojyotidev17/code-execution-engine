import logger from "../config/logger.config.js";
import type { CreateSubmissionDTO } from "../dtos/submission.dto.js";
import {
    submissionQueue,
    SUBMISSION_QUEUE,
} from "../queues/submission.queue.js";

/**
 * Represents a single test case of a problem.
 *
 * `input`  → input given to the submitted program.
 * `output` → expected output from the submitted program.
 */
export type TestCaseType = {
    input: string;
    output: string;
};

/**
 * Represents the problem data required by the
 * Evaluation Service to evaluate a submission.
 *
 * The Evaluation Service needs the test cases and
 * problem information so it can run the submitted
 * code against each test case.
 */
export type ProblemType = {
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    editorial?: string;
    testcases: TestCaseType[];
};

/**
 * Data sent to the BullMQ submission queue.
 *
 * This object contains everything the Evaluation Service
 * needs to evaluate a user's submission.
 */
export type SubmissionJobData = {
    /**
     * ID of the submission stored in the database.
     *
     * Used by the Evaluation Service to identify
     * which submission is being evaluated.
     */
    submissionId: string;

    /**
     * Problem associated with the submission.
     *
     * Contains the test cases that the submitted code
     * needs to pass.
     */
    problem: ProblemType;

    /**
     * Source code submitted by the user.
     */
    code: string;

    /**
     * Programming language used by the submitted code.
     *
     * The type is reused from CreateSubmissionDTO so
     * the allowed languages stay consistent with the
     * Submission Service.
     */
    language: CreateSubmissionDTO["language"];
};

/**
 * Adds a submission to the BullMQ queue.
 *
 * The job will remain in Redis until an Evaluation Worker
 * picks it up and starts evaluating the submitted code.
 */
export async function addSubmissionJob(data: SubmissionJobData) {
    try {
        /**
         * Add the submission data as a job to the
         * submission queue.
         *
         * BullMQ stores the job in Redis. The Evaluation
         * Worker will later receive this job and process it.
         */
        const job = await submissionQueue.add(SUBMISSION_QUEUE, data);

        /**
         * Log the job ID so the submission can be
         * traced through the evaluation workflow.
         */
        logger.info(`Submission job added successfully: ${job.id}`);
    } catch (error) {
        /**
         * If adding the job to Redis/BullMQ fails,
         * log the original error for debugging.
         */
        logger.error(`Failed to add submission job: ${error}`);

        /**
         * Throw an error so the caller/error middleware
         * knows that the submission could not be queued.
         */
        throw new Error("Cannot add Submission job to queue");
    }
}
