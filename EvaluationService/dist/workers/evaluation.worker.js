import logger from "../config/logger.config.js";
import redis from "../config/redis.config.js";
import { Worker } from "bullmq";
import { SUBMISSION_QUEUE } from "../constants/evaluation.constant.js";
import { runCode } from "../utils/containers/code-runner.util.js";
import { LANGUAGE_CONFIG } from "../config/language.config.js";
import { updateSubmission } from "../apis/submission.api.js";
import { InternalServerError } from "../utils/errors/app.error.js";
// Determine the final submission status based on the results of all test cases.
function getSubmissionStatus(testCases, results) {
    // Every test case should have a corresponding execution result.
    if (results.length !== testCases.length) {
        throw new Error("Number of test case results does not match number of test cases");
    }
    // Check each result and return the first status that determines the outcome.
    for (let index = 0; index < testCases.length; index++) {
        const testCase = testCases[index];
        const result = results[index];
        // If any test case exceeds its time limit, the submission gets TLE.
        if (result.status === "time_limit_exceeded") {
            return "time_limit_exceeded";
        }
        // Treat unsuccessful program execution as a runtime error.
        if (result.status === "failed") {
            return "runtime_error";
        }
        // If the actual output differs from the expected output, the answer is wrong.
        if (result.output !== testCase.output) {
            return "wrong_answer";
        }
    }
    // All test cases passed, so the submission is accepted.
    return "accepted";
}
// Create a worker that processes code evaluation jobs from the submission queue.
async function setupEvaluationWorker() {
    const worker = new Worker(SUBMISSION_QUEUE, 
    // BullMQ calls this processor whenever a job is picked up for evaluation.
    async (job) => {
        logger.info(`Processing evaluation job ${job.id}`);
        // Get the submitted code, language, problem, and submission ID from the job.
        const data = job.data;
        // Run the submitted code against every test case concurrently.
        const testCaseRunnerPromises = data.problem.testcases.map((testCase) => {
            return runCode({
                code: data.code,
                language: data.language,
                // Use the execution time limit configured for this language.
                timeout: LANGUAGE_CONFIG[data.language].timeout,
                // Use the Docker image configured for this language.
                imageName: LANGUAGE_CONFIG[data.language].imageName,
                // Pass this test case's input to the submitted program.
                input: testCase.input,
            });
        });
        // Wait for every test case to finish before deciding the final status.
        let testCaseResults;
        try {
            testCaseResults = await Promise.all(testCaseRunnerPromises);
        }
        catch (error) {
            // Stop evaluation if an execution fails because of an infrastructure issue.
            logger.error("Infrastructure error during code evaluation", {
                error,
                jobId: job.id,
            });
            throw new InternalServerError("Code evaluation infrastructure failed");
        }
        // Determine the final status from the results of all test cases.
        const submissionStatus = getSubmissionStatus(data.problem.testcases, testCaseResults);
        logger.info(`Submission ${data.submissionId} evaluated as ${submissionStatus}`, {
            jobId: job.id,
            submissionId: data.submissionId,
            submissionStatus,
        });
        // Send the final evaluation status back to the Submission Service.
        const response = await updateSubmission(data.submissionId, submissionStatus, String(job.id));
        // Fail the job if the Submission Service could not update the status.
        if (!response) {
            throw new InternalServerError("Failed to update submission status");
        }
    }, {
        // Use the configured Redis connection for BullMQ.
        connection: redis,
    });
    // Log errors emitted by the worker itself.
    worker.on("error", (error) => {
        logger.error("Evaluation worker error", {
            error: error.message,
        });
    });
    // Log job failures; BullMQ may retry the job depending on its configuration.
    worker.on("failed", (job, error) => {
        logger.error("Evaluation job failed", {
            jobId: job?.id,
            error: error.message,
        });
    });
    // Log jobs that complete successfully.
    worker.on("completed", (job) => {
        logger.info("Evaluation job completed", {
            jobId: job.id,
        });
    });
}
// Start the evaluation worker.
export async function startWorkers() {
    await setupEvaluationWorker();
}
