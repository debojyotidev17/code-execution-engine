import dotenv from "dotenv";

type ServerConfig = {
    PORT: number;
    REDIS_HOST: string;
    REDIS_PORT: number;
    SUBMISSION_SERVICE_URL: string;
};

dotenv.config();

export const serverConfig: ServerConfig = {
    PORT: Number(process.env.PORT!),
    REDIS_HOST: process.env.REDIS_HOST!,
    REDIS_PORT: Number(process.env.REDIS_PORT!),
    SUBMISSION_SERVICE_URL: process.env.SUBMISSION_SERVICE_URL!,
};