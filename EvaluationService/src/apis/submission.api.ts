import { serverConfig } from "../config/index.js";
import { InternalServerError } from "../utils/errors/app.error.js";
import logger from "../config/logger.config.js";

export async function updateSubmission(submissionId: string, status: string) {
    try {
        const url = `${serverConfig.SUBMISSION_SERVICE_URL}/submissions/${submissionId}/status`;

        logger.info("Updating submission status", { url });

        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                status,
            }),
        });

        if (!response.ok) {
            throw new InternalServerError("Failed to update submission");
        }

        const data = await response.json();

        logger.info("Submission updated successfully", {
            submissionId,
            data,
        });

        return data;
    } catch (error) {
        logger.error("Failed to update submission", error);
        return null;
    }
}
