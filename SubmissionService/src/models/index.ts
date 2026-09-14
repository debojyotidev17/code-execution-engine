import { serverConfig } from "../config/index.js";
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle(serverConfig.DATABASE_URL!);

export default db;
