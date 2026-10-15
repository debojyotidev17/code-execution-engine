import logger from "../../config/logger.config.js";
import { commands } from "./commands.util.js";
import { createNewDockerContainer } from "./create-container.util.js";
export async function runCode(options) {
    // Get everything needed to run the submitted code.
    const { code, language, timeout, imageName, input } = options;
    // Create a container with the right environment, execution command, and memory limit.
    const container = await createNewDockerContainer({
        imageName,
        cmdExecutable: commands[language](code, input),
        memoryLimit: 1024 * 1024 * 1024, // Limit memory usage to 1 GB.
    });
    // Track whether the program was stopped because it exceeded the time limit.
    let isTimeLimitExceeded = false;
    // Start the container to begin executing the submitted code.
    await container.start();
    // Kill the container if the program runs longer than the allowed time.
    const timeLimitExceededTimeout = setTimeout(() => {
        logger.error("Time limit exceeded");
        isTimeLimitExceeded = true;
        // Stop the program so it cannot continue running beyond the time limit.
        container.kill();
    }, timeout);
    // Wait for the program to finish or be stopped by the timeout.
    const status = await container.wait();
    // If the program exceeded the time limit, return the TLE result.
    if (isTimeLimitExceeded) {
        await container.remove();
        return {
            status: "time_limit_exceeded",
            output: "Time limit exceeded",
        };
    }
    // Clear the timer because the program finished within the allowed time.
    clearTimeout(timeLimitExceededTimeout);
    // Collect the program's standard output and error output.
    const logs = await container.logs({
        stdout: true,
        stderr: true,
    });
    // Convert Docker's logs into a clean string that we can compare with the expected output.
    const containerLogs = processLogs(logs);
    // Remove the container because we no longer need it.
    await container.remove();
    // An exit code of 0 means the program executed successfully, not necessarily that its answer is correct.
    if (status.StatusCode === 0) {
        return {
            status: "success",
            output: containerLogs,
        };
    }
    // A non-zero exit code means the program failed during compilation or execution.
    return {
        status: "failed",
        output: containerLogs,
    };
}
function processLogs(logs) {
    // Convert the logs to text, remove unwanted control characters, and trim extra whitespace.
    return logs
        ?.toString("utf8")
        .replace(/\x00/g, "")
        .replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "")
        .trim();
}
