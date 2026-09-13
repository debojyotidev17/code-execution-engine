import dotenv from "dotenv";
import { NotFoundError } from "../utils/errors/app.error.js";

type ServerConfig = {
    PORT: number;
    DATABASE_URL: string;
    REDIS_HOST: string;
    REDIS_PORT: number;
};

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new NotFoundError("DB url is not defined");
}

if (!process.env.REDIS_HOST) {
    throw new NotFoundError("redis host is not defined");
}

export const serverConfig: ServerConfig = {
    PORT: Number(process.env.PORT) || 3001,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: Number(process.env.REDIS_PORT) || 6380,
};
