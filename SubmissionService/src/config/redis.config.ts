import { Redis } from "ioredis";
import { serverConfig } from "./index.js";

const redis = new Redis({
    host: serverConfig.REDIS_HOST,
    port: serverConfig.REDIS_PORT,
});

redis.on("connect", () => {
    console.log("Redis connected");
});

redis.on("error", (error) => {
    console.error("Redis error:", error);
});

export default redis;
