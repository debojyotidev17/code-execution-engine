import logger from "../config/logger.config.js";
import type { CreateSubmissionDTO } from "../dtos/submission.dto.js";
import {
    submissionQueue,
    SUBMISSION_QUEUE,
} from "../queues/submission.queue.js";

// data that will be sent to the submission queue
type SubmissionJobData = {
    // id of the submission stored in the database
    submissionId: string;

    // id of the problem that needs to be evaluated
    problemId: string;

    // source code submitted by the user
    code: string;

    // programming language used by the submission
    language: CreateSubmissionDTO["language"];
};

// adds a submission job to the BullMQ queue
export async function addSubmissionJob(data: SubmissionJobData) {
    try {
        // add the submission data as a job to the queue
        const job = await submissionQueue.add(SUBMISSION_QUEUE, data);

        // log the job id so the queued job can be traced
        logger.info(`Submission job added successfully: ${job.id}`);
    } catch (error) {
        // log the error if the job could not be added
        logger.error(`Failed to add submission job: ${error}`);

        // throw error to the error middleware
        throw new Error("Cannot add Submission job to queue");
    }
}