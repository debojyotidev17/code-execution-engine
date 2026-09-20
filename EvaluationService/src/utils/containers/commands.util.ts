// tells docker to use bash for executing the commands we build below
// "-c" tells bash to execute the command provided as the next argument
const bashConfig = ["/bin/bash", "-c"];

export const commands = {
    // builds the command required to run submitted python code
    python: function (code: string, input: string) {
        const runCommand =
            // save the submitted code into a python file
            `echo '${code}' > code.py && ` +
            // save the test case input into a text file
            `echo '${input}' > input.txt && ` +
            // run the python program and provide input.txt
            // as the program's standard input (stdin)
            `python3 code.py < input.txt`;

        // returns:
        // ["/bin/bash", "-c", runCommand]
        // which docker can use as the container command
        return [...bashConfig, runCommand];
    },

    // builds the command required to compile and run submitted c++ code
    cpp: function (code: string, input: string) {
        const runCommand =
            // create a separate directory for the c++ program
            `mkdir app && ` +
            // move into the newly created directory
            `cd app && ` +
            // save the submitted c++ code into a source file
            `echo '${code}' > code.cpp && ` +
            // save the test case input into a text file
            `echo '${input}' > input.txt && ` +
            // compile the c++ source code
            // "-o run" names the generated executable "run"
            `g++ code.cpp -o run && ` +
            // execute the compiled program and provide input.txt
            // as the program's standard input (stdin)
            `./run < input.txt`;

        // returns:
        // ["/bin/bash", "-c", runCommand]
        // which docker can use as the container command
        return [...bashConfig, runCommand];
    },
};
