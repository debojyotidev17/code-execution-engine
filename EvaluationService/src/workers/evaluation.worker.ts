import logger from "../config/logger.config.js";
import redis from "../config/redis.config.js";

import { SUBMISSION_QUEUE } from "../queues/submission.queue.js";
import { Worker, Job } from "bullmq";

async function setUpEvaluationWorker() {
    const worker = new Worker(
        SUBMISSION_QUEUE,
        async (job: Job) => {
            logger.info(`processing job with id ${job.id}`);
        },
        {
            connection: redis,
        },
    );

    worker.on("completed", (job) => {
        logger.info(`Evaluation job completed: ${job.id}`);
    });

    worker.on("error", (error) => {
        logger.error(`Evaluation worker error: ${error}`);
    }); 
}

export async function startEvaluationWorker() {
    await setUpEvaluationWorker();
}
