import { commands } from "./commands.util.js";
import { createNewDockerContainer } from "./create-container.util.js";

export type RunCodeOptions = {
    code: string;
    language: "python" | "cpp";
    timeout: number;
    imageName: string;
    input: string;
};

export async function runCode(options: RunCodeOptions) {
    // get the information needed to execute the submitted code
    const { code, language, timeout, imageName, input } = options;

    // create a docker container where the submitted code will run
    // imageName tells docker which environment to use
    // commands[language](code, input) creates the command that will actually execute the user's python/c++ code
    // memoryLimit prevents the program from using unlimited ram
    const container = await createNewDockerContainer({
        imageName: imageName,
        cmdExecutable: commands[language](code, input),
        memoryLimit: 1024 * 1024 * 1024, // 1 gb
    });

    // this flag helps us remember whether the program was killed because it exceeded the time limit
    let isTimeLimitExceeded = false;

    // start the container so the submitted program actually begins running
    await container?.start();

    // start the execution timer after the container has started
    
    // if the program is still running when the time limit is reached,
    // kill the container and mark the execution as time-limit exceeded
    const timeLimitExceededTimeout = setTimeout(() => {
        console.log("Time limit exceeded");

        isTimeLimitExceeded = true;

        // forcefully stop the container
        // this also causes container.wait() to finish
        container?.kill();
    }, timeout);

    // wait until the container stops running
    //
    // await pauses this function while it waits,
    // but it does not block the node.js event loop.
    //
    // the container can stop normally when the program finishes,
    // or it can be killed by the timeout above.
    const status = await container?.wait();

    // if the timeout killed the container, we don't need
    // to process its normal output.
    // the execution result is simply time_limit_exceeded.
    if (isTimeLimitExceeded) {
        await container?.remove();

        return {
            status: "time_limit_exceeded",
            output: "Time limit exceeded",
        };
    }

    // the program finished before the time limit,
    // so the timeout is no longer needed
    clearTimeout(timeLimitExceededTimeout);

    // get everything the program wrote to stdout and stderr
    //
    // stdout = normal program output
    // stderr = runtime/compiler error output
    const logs = await container?.logs({
        stdout: true,
        stderr: true,
    });

    // docker returns the logs as a buffer.
    // convert them into a normal string and remove
    // unwanted control characters.
    const containerLogs = processLogs(logs);

    // the container is no longer needed after we have its result,
    // so remove it to avoid leaving unused containers behind
    await container?.remove();

    // docker uses exit code 0 to indicate that the program
    // finished successfully.
    //
    // important:
    // "success" does NOT mean the user's answer is correct.
    // it only means the program ran without an execution error.
    //
    // the evaluator will later compare the program's output
    // with the expected output to determine accepted/wrong_answer.
    if (status.StatusCode === 0) {
        return {
            status: "success",
            output: containerLogs,
        };
    }

    // a non-zero exit code means that something went wrong
    // while executing the program.
    //
    // for example:
    // - runtime error
    // - compilation error
    // - another execution failure
    return {
        status: "failed",
        output: containerLogs,
    };
}

function processLogs(logs: Buffer | undefined) {
    // docker gives us the logs as a buffer.
    // convert the buffer into a utf-8 string,
    // remove unwanted control characters,
    // and remove extra whitespace from the beginning/end.
    return logs
        ?.toString("utf8")
        .replace(/\x00/g, "")
        .replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "")
        .trim();
}