import logger from "../../config/logger.config.js";

import { commands } from "./commands.util.js";
import { createNewDockerContainer } from "./create-container.util.js";
import { RunCodeOptions } from "../../types/container.type.js";

export async function runCode(options: RunCodeOptions) {
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

    /*
    - container.wait() returns a Promise.
    - Docker resolves that Promise when the container's main process exits.
    - await pauses this function until that Promise resolves.
    - The returned status contains information such as the process's exit code.
    For example, if the program finishes normally, Docker might return:
    {
        StatusCode: 0
    }
    If the program crashes, it might return a non-zero exit code.

    How does Docker know it stopped? Docker monitors the container's main process. When that process exits, Docker marks the container as stopped and completes the wait request.
    */

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
    /*Docker logs might contain:
    Hello, world!
    Result: 5 
    
    After processLogs(logs), containerLogs will be: so "Hello, world!\nResult: 5" */
    // container.logs() contains the output produced by the submitted code while it ran inside the Docker container.
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

function processLogs(logs: Buffer | undefined) {
    // Convert the logs to text, remove unwanted control characters, and trim extra whitespace.
    return logs
        ?.toString("utf8")
        .replace(/\x00/g, "")
        .replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "")
        .trim();
}
