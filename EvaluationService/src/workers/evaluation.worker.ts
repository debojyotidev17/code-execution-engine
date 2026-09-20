import { Job, Worker } from "bullmq";

import { SUBMISSION_QUEUE } from "../constants/evaluation.constant.js";
import logger from "../config/logger.config.js";
import redis from "../config/redis.config.js";

import {
    EvaluationJob,
    EvaluationResult,
    TestCase,
} from "../types/evaluator.type.js";

import { runCode } from "../utils/containers/code-runner.util.js";
import { LANGUAGE_CONFIG } from "../config/language.config.js";
import { updateSubmission } from "../apis/submission.api.js";

/*
 * Checks the execution result of every test case and decides
 * the final status of the submission.
 *
 * Possible final statuses:
 *
 * 1. time_limit_exceeded
 *    → At least one test case took too long.
 *
 * 2. runtime_error
 *    → The submitted program failed while executing.
 *
 * 3. wrong_answer
 *    → The program ran successfully, but its output
 *      did not match the expected output.
 *
 * 4. accepted
 *    → Every test case produced the correct output.
 */
function getSubmissionStatus(
    testCases: TestCase[],
    results: EvaluationResult[],
) {
    /*
     * We should have exactly one result for every test case.
     *
     * If this is not true, something went wrong inside
     * the evaluation system itself.
     */
    if (results.length !== testCases.length) {
        throw new Error(
            "Number of test case results does not match number of test cases",
        );
    }

    /*
     * Check every test case result.
     *
     * We use a normal for loop because we only need to determine
     * the final submission status. We don't need to create
     * another object containing individual test case results.
     */
    
    for (let index = 0; index < testCases.length; index++) {
        const testCase = testCases[index];
        const result = results[index];

        /*
         * If even one test case exceeds the time limit,
         * the entire submission is considered TLE.
         */
        if (result.status === "time_limit_exceeded") {
            return "time_limit_exceeded";
        }

        /*
         * "failed" means the program could not execute successfully.
         *
         * With our current runCode() implementation, we don't
         * distinguish between runtime and compilation errors yet,
         * so we treat it as a runtime error here.
         */
        if (result.status === "failed") {
            return "runtime_error";
        }

        /*
         * If the program executed successfully, compare
         * the actual output with the expected output.
         */
        if (result.output !== testCase.output) {
            return "wrong_answer";
        }
    }

    /*
     * If we reached this point, every test case:
     *
     * - finished within the time limit
     * - executed successfully
     * - produced the expected output
     *
     * Therefore, the submission is accepted.
     */
    return "accepted";
}

/*
 * Creates a BullMQ worker that listens to the submission queue
 * and evaluates submitted code.
 */
async function setupEvaluationWorker() {
    const worker = new Worker(
        SUBMISSION_QUEUE,

        /*
         * BullMQ automatically calls this function whenever
         * a new job is taken from the submission queue.
         */
        async (job: Job) => {
            logger.info(`Processing evaluation job ${job.id}`);

            /*
             * job.data contains everything that the Submission
             * Service put into the queue.
             */
            const data: EvaluationJob = job.data;

            /*
             * Run the submitted code against every test case.
             *
             * map() creates one runCode() Promise for each
             * test case.
             */
            const testCaseRunnerPromises = data.problem.testcases.map(
                (testCase) => {
                    return runCode({
                        code: data.code,
                        language: data.language,

                        /*
                         * Get the time limit configured for
                         * the submitted programming language.
                         */
                        timeout: LANGUAGE_CONFIG[data.language].timeout,

                        /*
                         * Get the Docker image configured for
                         * the submitted programming language.
                         */
                        imageName: LANGUAGE_CONFIG[data.language].imageName,

                        /*
                         * Give this particular test case's
                         * input to the submitted program.
                         */
                        input: testCase.input,
                    });
                },
            );

            /*
             * Wait until ALL test cases have finished running.
             *
             * Promise.all() gives us an array containing the
             * result of each runCode() call.
             *
             * Example:
             *
             * [
             *   { status: "success", output: "5" },
             *   { status: "success", output: "10" },
             *   { status: "time_limit_exceeded", ... }
             * ]
             */
            const testCaseResults: EvaluationResult[] = await Promise.all(
                testCaseRunnerPromises,
            );

            /*
             * Now that we know what happened with every test case,
             * determine the FINAL status of the submission.
             *
             * Example:
             *
             * AC + AC + AC → accepted
             * AC + WA + AC → wrong_answer
             * AC + TLE + AC → time_limit_exceeded
             * AC + Error + AC → runtime_error
             */
            const submissionStatus = getSubmissionStatus(
                data.problem.testcases,
                testCaseResults,
            );

            logger.info(
                `Submission ${data.submissionId} evaluated as ${submissionStatus}`,
            );

            /*
             * Tell the Submission Service the final result.
             *
             * We only send:
             *
             * - submissionId
             * - status
             *
             * We no longer send the individual test case outputs.
             */
            await updateSubmission(data.submissionId, submissionStatus);
        },

        {
            /*
             * Create a Redis connection for this BullMQ worker.
             */
            connection: redis,
        },
    );

    /*
     * Fired when the worker itself encounters an error.
     *
     * This is different from a submission simply getting
     * "wrong_answer" or "time_limit_exceeded".
     */
    worker.on("error", (error) => {
        logger.error("Evaluation worker error", error);
    });

    /*
     * Fired when BullMQ considers a particular job failed.
     *
     * For example, an unexpected exception inside the job
     * processor can cause this event.
     */
    worker.on("failed", (job, error) => {
        logger.error(`Evaluation job failed: ${job?.id}`, error);
    });

    /*
     * Fired when a job finishes successfully.
     */
    worker.on("completed", (job) => {
        logger.info(`Evaluation job completed: ${job.id}`);
    });
}

/*
 * Public function used to start the evaluation worker.
 */
export async function startWorkers() {
    await setupEvaluationWorker();
}
