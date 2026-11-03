import { serverConfig } from "../config/server.config.js";
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle(serverConfig.DATABASE_URL);

export default db;