import redis from "../config/redis.config.js";
import { Queue } from "bullmq";

// Name of the queue where submission jobs are stored.
export const SUBMISSION_QUEUE = "submission";

// Create the BullMQ queue used to store submission jobs.
export const submissionQueue = new Queue(SUBMISSION_QUEUE, {
    connection: redis,

    // Default options applied to every job added to this queue.
    defaultJobOptions: {
        // Retry a job up to 3 attempts if its processing fails.
        attempts: 3,

        // Configure the delay between failed attempts.
        backoff: {
            // Increase the retry delay after each failed attempt.
            type: "exponential",

            // Start with a 2-second delay before the first retry.
            delay: 2000,
        },
    },
});