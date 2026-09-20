import logger from "../../config/logger.config.js";
import Docker from "dockerode";

// options required to create a new docker container
export type CreateContainerOptions = {
    // name of the docker image that will be used
    // for example: "python:3.12" or "gcc:14"
    imageName: string;

    // command that should be executed inside the container
    // for example: ["python", "main.py"]
    cmdExecutable: string[];

    // maximum amount of memory the container is allowed to use
    memoryLimit: number;
};

export async function createNewDockerContainer(
    options: CreateContainerOptions,
) {
    try {
        // create a dockerode client so our node.js application can communicate with the docker daemon
        const docker = new Docker();

        // create a new container using the given image,
        // command, resource limits, and security restrictions
        const container = await docker.createContainer({
            // choose the docker image from which the container
            // will be created
            Image: options.imageName,

            // command that will be executed inside the container
            // when we start it later
            Cmd: options.cmdExecutable,

            // allow our evaluation service to connect to the container's standard input (stdin)
            AttachStdin: true,

            // allow our evaluation service to read the program's normal output from standard output (stdout)
            AttachStdout: true,

            // allow our evaluation service to read error output from standard error (stderr)
            AttachStderr: true,

            // do not create an interactive terminal (tty).
            // the evaluator communicates with the program through stdin, stdout, and stderr instead of a terminal
            Tty: false,

            // keep the container's stdin stream open
            // this allows the evaluator to send test case input to the program while it is running
            OpenStdin: true,

            // configure resource limits and security restrictions
            // for the container
            HostConfig: {
                // limit the amount of RAM the submitted program is allowed to use
                Memory: options.memoryLimit,

                // limit how many processes can be created inside the container
                PidsLimit: 100,

                // limit cpu usage of the container.
                // in every 100 ms period, this container can consume up to 50 ms of CPU time (1 core)
                // 50 percent CPU capacity max
                CpuQuota: 50000,
                CpuPeriod: 100000,

                // prevent processes inside the container from gaining additional privileges
                SecurityOpt: ["no-new-privileges"],

                // disable network access for the container.
                // this prevents submitted code from accessing the internet or other network resources
                NetworkMode: "none",
            },
        });

        // log the id assigned to the newly created container which can be useful for debugging
        logger.info(`Container created with id ${container.id}`);

        // return the container so the caller can start it and interact with it later
        return container;
    } catch (error) {
        // log the error if docker fails to create the container
        logger.error("Error creating new docker container", error);

        // return null so the caller knows that container creation was unsuccessful
        return null;
    }
}

/*
 * AttachStdin: true → allow us to connect to the container's stdin
 * OpenStdin: true → keep stdin open so we can send input
 * AttachStdout: true → allow us to connect to and read stdout
 * AttachStderr: true → allow us to connect to and read stderr
 * 
 * The input pipe needs to be explicitly kept open because your evaluator needs to send data into the program.
 * The output pipe is simply there for the evaluator to receive whatever the program produces.
 */