import dotenv from "dotenv";
dotenv.config();
export const serverConfig = {
    PORT: Number(process.env.PORT),
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: Number(process.env.REDIS_PORT),
    PROBLEM_SERVICE_URL: process.env.PROBLEM_SERVICE_URL,
    SUBMISSION_SERVICE_URL: process.env.SUBMISSION_SERVICE_URL,
};
