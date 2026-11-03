// Defines what we need to create a container for running submitted code.
export type CreateContainerOptions = {
    imageName: string;
    cmdExecutable: string[];
    memoryLimit: number;
};

export type RunCodeOptions = {
    code: string;
    language: "python" | "cpp";
    timeout: number;
    imageName: string;
    input: string;
};
