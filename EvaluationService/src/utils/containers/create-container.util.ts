import logger from "../../config/logger.config.js";
import Docker from "dockerode";

import { InternalServerError } from "../errors/app.error.js";

// Defines what we need to create a container for running submitted code.
export type CreateContainerOptions = {
    imageName: string;
    cmdExecutable: string[];
    memoryLimit: number;
};

export async function createNewDockerContainer(
    options: CreateContainerOptions,
) {
    try {
        // Connects our Node.js application to Docker.
        const docker = new Docker();

        // Creates a container with the requested image, command, and settings.
        const container = await docker.createContainer({
            // Selects the environment in which the submitted code will run.
            Image: options.imageName,

            // Specifies the program Docker should execute when the container starts.
            Cmd: options.cmdExecutable,

            // Allows our evaluator to connect to the program's input stream.
            AttachStdin: true,

            // Allows our evaluator to read the program's normal output.
            AttachStdout: true,

            // Allows our evaluator to capture the program's error output.
            AttachStderr: true,

            // Runs without a terminal because our evaluator uses input/output streams.
            Tty: false,

            // Keeps the input stream open so our evaluator can send test-case data.
            OpenStdin: true,

            // Sets resource limits and security restrictions for the container.
            HostConfig: {
                // Limits how much RAM the submitted program can use, in bytes.
                Memory: options.memoryLimit,

                // Prevents the container from creating more than 100 processes.
                PidsLimit: 100,

                // Limits the container to 50% of one CPU core over each 100 ms period.
                CpuQuota: 50000,
                CpuPeriod: 100000,

                // Prevents processes from gaining additional privileges.
                SecurityOpt: ["no-new-privileges"],

                // Blocks network access from inside the container.
                NetworkMode: "none",
            },
        });

        // Records the container ID to help us debug issues later.
        logger.info("Docker container created successfully", {
            containerId: container.id,
        });

        // Returns the container so another function can start and use it.
        return container;
    } catch (error) {
        // Records the error if Docker fails to create the container.
        logger.error("Failed to create Docker container", {
            error: error instanceof Error ? error.message : error,
        });

        throw new InternalServerError("Failed to create a container");
    }
}