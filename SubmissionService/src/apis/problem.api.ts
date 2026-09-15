import { serverConfig } from "../config/index.js";
import logger from "../config/logger.config.js";
export async function getProblemById(problemId: string) {
    try {
        const response = await fetch(
            `${serverConfig.PROBLEM_SERVICE_URL}/problems/${problemId}`,
        );

        if (!response.ok) {
            return null;
        }

        return await response.json();
        
    } catch (error) {
        logger.error(`Failed to get problem details: ${error}`);
        return null;
    }
}
