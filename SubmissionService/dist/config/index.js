import dotenv from "dotenv";
dotenv.config();
export const serverConfig = {
    PORT: Number(process.env.PORT),
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: Number(process.env.REDIS_PORT),
    PROBLEM_SERVICE_URL: process.env.PROBLEM_SERVICE_URL,
};
