import { Queue } from "bullmq";

import redis from "../config/redis.config.js";

// queue name for submissions
export const SUBMISSION_QUEUE = "submission";

// create the submission queue
export const submissionQueue = new Queue(SUBMISSION_QUEUE, {
    connection: redis,

    // default options for every job added to this queue
    defaultJobOptions: {
        // retry the job up to 3 times if it fails
        attempts: 3,

        // wait before retrying a failed job
        backoff: {
            // increase the delay after each failed attempt
            type: "exponential",

            // initial retry delay in milliseconds
            delay: 2000,
        },
    },
});
