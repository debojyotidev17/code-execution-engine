import logger from "../config/logger.config.js";

import { SubmissionJobData } from "../dtos/submission-job.dto.js";
import { SUBMISSION_JOB_NAME } from "../constants/submission.constants.js";
import { submissionQueue } from "../queues/submission.queue.js";
import { InternalServerError } from "../utils/errors/app.error.js";

// Add a submission to the queue so a worker can evaluate it asynchronously.
export async function addSubmissionJob(data: SubmissionJobData) {
    try {
        // Store the job in Redis so an Evaluation Worker can process it.
        const job = await submissionQueue.add(SUBMISSION_JOB_NAME, data);

        // Log the job ID to help trace the submission through the evaluation workflow.
        logger.info(`Submission job added successfully: ${job.id}`);
    } catch (error) {
        // Log the original error to help diagnose why the job could not be queued.
        logger.error("Failed to add submission job", error);

        throw new InternalServerError(
            `Cannot add submission job to queue: ${error}`,
        );
    }
}
