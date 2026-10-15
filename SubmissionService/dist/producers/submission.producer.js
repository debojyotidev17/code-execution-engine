import logger from "../config/logger.config.js";
import { submissionQueue, SUBMISSION_QUEUE, } from "../queues/submission.queue.js";
// Add a submission to the queue so a worker can evaluate it asynchronously.
export async function addSubmissionJob(data) {
    try {
        // Store the job in Redis so an Evaluation Worker can process it.
        const job = await submissionQueue.add(SUBMISSION_QUEUE, data);
        // Log the job ID to help trace the submission through the evaluation workflow.
        logger.info(`Submission job added successfully: ${job.id}`);
    }
    catch (error) {
        // Log the original error to help diagnose why the job could not be queued.
        logger.error("Failed to add submission job", error);
        // Let the caller know that the submission could not be queued.
        throw new Error("Cannot add submission job to queue", {
            cause: error,
        });
    }
}
