import { getProblemById } from "../apis/problem.api.js";
import {
    createSubmission as createSubmissionRepository,
    getSubmissionById as getSubmissionByIdRepository,
    getSubmissionsByProblemId as getSubmissionsByProblemIdRepository,
    deleteSubmission as deleteSubmissionRepository,
    updateSubmissionStatus as updateSubmissionStatusRepository,
} from "../repositories/submission.repository.js";
import type {
    CreateSubmissionDTO,
    SubmissionIdDTO,
    UpdateSubmissionStatusDTO,
} from "../dtos/submission.dto.js";
import { NotFoundError } from "../utils/errors/app.error.js";
import { addSubmissionJob } from "../producers/submission.producer.js";

// create a new submission
export async function createSubmission(data: CreateSubmissionDTO) {
    const problem = await getProblemById(data.problemId);

    if (!problem) {
        throw new NotFoundError("Problem not found");
    }

    const submission = await createSubmissionRepository(data);

    await addSubmissionJob({
        submissionId: submission.id,
        problemId: data.problemId,
        code: data.code,
        language: data.language,
    });

    return submission;
}

// get a submission by its id
export async function getSubmissionById(data: SubmissionIdDTO) {
    const submission = await getSubmissionByIdRepository(data);

    if (!submission) {
        throw new NotFoundError("Submission not found");
    }

    return submission;
}

// get all submissions for a problem
export async function getSubmissionsByProblemId(problemId: string) {
    return await getSubmissionsByProblemIdRepository(problemId);
}

// delete a submission by its id
export async function deleteSubmission(data: SubmissionIdDTO) {
    const submission = await deleteSubmissionRepository(data);

    if (!submission) {
        throw new NotFoundError("Submission not found");
    }

    return submission;
}

// update the status of a submission
export async function updateSubmissionStatus(
    data: SubmissionIdDTO,
    statusData: UpdateSubmissionStatusDTO,
) {
    const submission = await updateSubmissionStatusRepository(data, statusData);

    if (!submission) {
        throw new NotFoundError("Submission not found");
    }

    return submission;
}
