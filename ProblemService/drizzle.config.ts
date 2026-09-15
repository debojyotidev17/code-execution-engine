import { defineConfig } from "drizzle-kit";
import { serverConfig } from "./src/config/index.js";

export default defineConfig({
    out: "./drizzle",
    schema: "./src/models/schemas/*",
    dialect: "postgresql",
    dbCredentials: {
        url: serverConfig.DATABASE_URL!,
    },
});