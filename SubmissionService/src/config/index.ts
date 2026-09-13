import dotenv from "dotenv";
import { NotFoundError } from "../utils/errors/app.error.js";

type ServerConfig = {
    PORT: number;
    DATABASE_URL: string;
};

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new NotFoundError("DB url is not defined");
}

export const serverConfig: ServerConfig = {
    PORT: Number(process.env.PORT) || 3001,
    DATABASE_URL: process.env.DATABASE_URL,
};
