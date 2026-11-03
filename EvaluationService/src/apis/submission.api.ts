import logger from "../config/logger.config.js";
import { serverConfig } from "../config/server.config.js";

// Updates the submission status in the Submission Service.
export async function updateSubmission(
    submissionId: string,
    status: string,
    jobId: string,
) {
    try {
        // Log which submission the Evaluation Service is updating.
        logger.info(
            `Updating submission status for submissionId: ${submissionId}`,
        );

        // Send the updated status to the Submission Service.
        const response = await fetch(
            `${serverConfig.SUBMISSION_SERVICE_URL}/submissions/${submissionId}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
            },
        );

        // Throw an error if the Submission Service returns an unsuccessful response.
        if (!response.ok) {
            throw new Error(
                `Submission Service returned status ${response.status}.`,
            );
        }

        // Convert the response body into a JavaScript object.
        const responseData = await response.json();

        // Log that the submission status was updated successfully.
        logger.info(
            `Submission status updated successfully for submissionId: ${submissionId}`,
            {
                jobId,
                data: responseData.data,
            },
        );

        // Return the updated submission.
        return responseData.data;
    } catch (error) {
        // Log the failure and let the worker handle the failed job.
        logger.error(
            `Failed to update submission status for submissionId: ${submissionId}`,
            {
                jobId,
                error,
            },
        );

        throw error;
    }
}
