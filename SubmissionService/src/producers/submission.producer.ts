import type { CreateSubmissionDTO } from "../dtos/submission.dto.js";
import logger from "../config/logger.config.js";

import {
    submissionQueue,
    SUBMISSION_QUEUE,
} from "../queues/submission.queue.js";

type SubmissionJobData = {
    submissionId: string;
    problemId: string;
    code: string;
    language: CreateSubmissionDTO["language"];
};

// add a submission job to the queue
export async function addSubmissionJob(data: SubmissionJobData) {
    try {
        const job = await submissionQueue.add(SUBMISSION_QUEUE, data);
        logger.info(`Submission job added successfully: ${job.id}`);
    } catch (error) {
        logger.error(`Failed to add submission job: ${error}`);
        throw error;
    }
}
