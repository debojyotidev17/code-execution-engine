// Use bash to execute the commands inside the container.
const bashConfig = ["/bin/bash", "-c"];
export const commands = {
    // Prepare and run the submitted Python code with the test case input.
    python: function (code, input) {
        const runCommand = 
        // Save the code and test input to separate files.
        `echo '${code}' > code.py && ` +
            `echo '${input}' > input.txt && ` +
            // Run the program with the test input passed through stdin.
            `python3 code.py < input.txt`;
        // Return the command in the format Docker expects.
        return [...bashConfig, runCommand];
    },
    // Compile and run the submitted C++ code with the test case input.
    cpp: function (code, input) {
        const runCommand = 
        // Create a directory for the program and move into it.
        `mkdir app && ` +
            `cd app && ` +
            // Save the code and test input to separate files.
            `echo '${code}' > code.cpp && ` +
            `echo '${input}' > input.txt && ` +
            // Compile the code into an executable named "run".
            `g++ code.cpp -o run && ` +
            // Run the executable with the test input passed through stdin.
            `./run < input.txt`;
        // Return the command in the format Docker expects.
        return [...bashConfig, runCommand];
    },
};
