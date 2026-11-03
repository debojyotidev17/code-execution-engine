import logger from "./logger.config.js";

import { Redis } from "ioredis";
import { serverConfig } from "./server.config.js";

// create a Redis client using the host and port from the environment
const redis = new Redis({
    host: serverConfig.REDIS_HOST,
    port: serverConfig.REDIS_PORT,
    maxRetriesPerRequest: null,
});

// log when the Redis connection is successfully established
redis.on("connect", () => {
    logger.info("Redis connected");
});

// log any Redis connection errors
redis.on("error", (error) => {
    logger.error(`Redis error: ${error.message}`);
});

// export the Redis client so it can be reused throughout the service
export default redis;