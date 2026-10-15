import logger from "../config/logger.config.js";
import { serverConfig } from "../config/index.js";

// fetches problem details from the Problem Service
export async function getProblemById(problemId: string) {
    try {
        // log which problem the Submission Service is trying to fetch
        logger.info(`Fetching problem details for problemId: ${problemId}`);

        // send a request to the Problem Service to get the problem
        const response = await fetch(
            `${serverConfig.PROBLEM_SERVICE_URL}/problems/${problemId}`,
        );

        // if the Problem Service returns an unsuccessful response, return null so the service layer can handle it
        if (!response.ok) {
            logger.warn(
                `Problem Service returned status ${response.status} for problemId: ${problemId}`,
            );

            return null;
        }

        // convert the response body from JSON into a JavaScript object
        const responseData = await response.json()
        return responseData.data;
    } catch (error) {
        // handle network errors or other fetch-related errors
        logger.error(`Failed to get problem details: ${error}`);

        return null;
    }
}