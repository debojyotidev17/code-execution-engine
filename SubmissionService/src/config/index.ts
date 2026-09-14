import dotenv from "dotenv";
import { NotFoundError } from "../utils/errors/app.error.js";

type ServerConfig = {
    PORT: number;
    DATABASE_URL: string;
    REDIS_HOST: string;
    REDIS_PORT: number;
    PROBLEM_SERVICE_URL: string;
};

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new NotFoundError("DB url is not defined");
}

if (!process.env.REDIS_HOST) {
    throw new NotFoundError("redis host is not defined");
}

if (!process.env.PROBLEM_SERVICE_URL) {
    throw new NotFoundError("problem service url is not defined");
}

export const serverConfig: ServerConfig = {
    PORT: Number(process.env.PORT) || 300,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: Number(process.env.REDIS_PORT) || 6380,
    PROBLEM_SERVICE_URL: process.env.PROBLEM_SERVICE_URL,
};
