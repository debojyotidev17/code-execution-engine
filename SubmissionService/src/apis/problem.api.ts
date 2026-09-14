import { serverConfig } from "../config/index.js";

export async function getProblemById(problemId: string) {
    const response = await fetch(
        `${serverConfig.PROBLEM_SERVICE_URL}/problems/${problemId}`,
    );

    if (!response.ok) {
        return null;
    }

    return await response.json();
}
