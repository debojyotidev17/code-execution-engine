import { getProblemById } from "../apis/problem.api.js";
import { createSubmission, getSubmissionById, getAllSubmissionsForProblemId, deleteSubmission, updateSubmissionStatus, } from "../repositories/submission.repository.js";
import { NotFoundError } from "../utils/errors/app.error.js";
import { addSubmissionJob, } from "../producers/submission.producer.js";
// creates a new submission
export async function createSubmissionService(data) {
    // check that the problem exists before creating the submission
    const problem = await getProblemById(data.problemId);
    if (!problem) {
        throw new NotFoundError("Problem not found");
    }
    // save the submission in the Submission Service database
    const submission = await createSubmission(data);
    // add the submission to the queue so the evaluator can process it
    await addSubmissionJob({
        submissionId: submission.id,
        problem,
        code: data.code,
        language: data.language,
    });
    return submission;
}
// gets a submission by its id
export async function getSubmissionByIdService(data) {
    const submission = await getSubmissionById(data);
    if (!submission) {
        throw new NotFoundError("Submission not found");
    }
    return submission;
}
// gets all submissions for a particular problem
export async function getAllSubmissionsForProblemIdService(data) {
    return await getAllSubmissionsForProblemId(data.problemId);
}
// deletes a submission by its id
export async function deleteSubmissionService(data) {
    const submission = await deleteSubmission(data);
    if (!submission) {
        throw new NotFoundError("Submission not found");
    }
    return submission;
}
// updates the status of a submission
export async function updateSubmissionStatusService(data, statusData) {
    const submission = await updateSubmissionStatus(data, statusData);
    if (!submission) {
        throw new NotFoundError("Submission not found");
    }
    return submission;
}
