import dotenv from "dotenv";

type ServerConfig = {
    PORT: number;
    REDIS_HOST: string;
    REDIS_PORT: number;
    PROBLEM_SERVICE_URL: string;
    SUBMISSION_SERVICE_URL: string;
};

dotenv.config();

export const serverConfig: ServerConfig = {
    PORT: Number(process.env.PORT!),
    REDIS_HOST: process.env.REDIS_HOST!,
    REDIS_PORT: Number(process.env.REDIS_PORT!),
    PROBLEM_SERVICE_URL: process.env.PROBLEM_SERVICE_URL!,
    SUBMISSION_SERVICE_URL: process.env.SUBMISSION_SERVICE_URL!,
};