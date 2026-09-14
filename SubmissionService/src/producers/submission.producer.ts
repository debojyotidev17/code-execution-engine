import { Queue } from "bullmq";
import redis from "../config/redis.config.js";
import { CreateSubmissionDTO } from "../dtos/submission.dto.js";

// queue name for submissions
export const SUBMISSION_QUEUE  = "submission";

const submissionQueue = new Queue(SUBMISSION_QUEUE, {
    connection: redis,
});

type SubmissionJobData = {
    submissionId: string;
    problemId: string;
    code: string;
    language: CreateSubmissionDTO["language"];
};

export async function addSubmissionJob(data: SubmissionJobData) {
    await submissionQueue.add(SUBMISSION_QUEUE, data);
}
