import logger from "../config/logger.config.js";
import { serverConfig } from "../config/server.config.js";

// Fetches problem details from the Problem Service.
export async function getProblemById(problemId: string) {
    try {
        // Log which problem the Submission Service is requesting.
        logger.info(`Fetching problem details for problemId: ${problemId}`);

        // Request the problem from the Problem Service.
        const response = await fetch(
            `${serverConfig.PROBLEM_SERVICE_URL}/problems/${problemId}`,
        );

        // A 404 means the requested problem does not exist.
        if (response.status === 404) {
            logger.warn(`Problem not found: ${problemId}`);
            return null;
        }

        // Other unsuccessful responses indicate a failed service request.
        if (!response.ok) {
            throw new Error(
                `Problem Service returned status ${response.status}.`,
            );
        }

        // Convert the response body into a JavaScript object.
        const responseData = await response.json();

        return responseData.data;
    } catch (error) {
        // Log the failure and let the centralized error middleware handle it.
        logger.error(`Failed to fetch problem details for ${problemId}`, {
            error,
        });

        throw error;
    }
}
