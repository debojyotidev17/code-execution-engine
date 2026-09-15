import dotenv from "dotenv";

type ServerConfig = {
    PORT: number;
    DATABASE_URL: string;
};

dotenv.config();

/*
* So after dotenv.config():
*
* PORT=3001
* DATABASE_URL=...
* 
* becomes accessible as:
* 
* process.env.PORT
* process.env.DATABASE_URL
*/

export const serverConfig: ServerConfig = {
    PORT: Number(process.env.PORT!),
    DATABASE_URL: process.env.DATABASE_URL!,
};