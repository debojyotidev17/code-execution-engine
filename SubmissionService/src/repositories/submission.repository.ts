import db from "../models/index.js";
import { submissions } from "../models/schemas/submission.schema.js";
import type {
    CreateSubmissionDTO,
    SubmissionIdDTO,
    UpdateSubmissionStatusDTO,
} from "../dtos/submission.dto.js";
import { eq } from "drizzle-orm";

// create a new submission
export async function createSubmission(data: CreateSubmissionDTO) {
    const [submission] = await db
        .insert(submissions)
        .values({
            problemId: data.problemId,
            code: data.code,
            language: data.language,
        })
        .returning();

    return submission;
}

// get a submission by its id
export async function getSubmissionById(data: SubmissionIdDTO) {
    const [submission] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, data.submissionId));

    return submission;
}

// get all submissions for a problem
export async function getSubmissionsByProblemId(problemId: string) {
    return await db
        .select()
        .from(submissions)
        .where(eq(submissions.problemId, problemId));
}

// delete a submission by its id
export async function deleteSubmission(data: SubmissionIdDTO) {
    const [submission] = await db
        .delete(submissions)
        .where(eq(submissions.id, data.submissionId))
        .returning();

    return submission;
}

// update the status of a submission by its id
export async function updateSubmissionStatus(
    data: SubmissionIdDTO,
    statusData: UpdateSubmissionStatusDTO,
) {
    const [submission] = await db
        .update(submissions)
        .set({
            status: statusData.status,
            updatedAt: new Date(),
        })
        .where(eq(submissions.id, data.submissionId))
        .returning();

    return submission;
}
