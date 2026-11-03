import db from "../models/index.js";
import { submissions } from "../models/schemas/submission.schema.js";
import type {
    CreateSubmissionDTO,
    SubmissionIdDTO,
    UpdateSubmissionStatusDTO,
} from "../dtos/submission.dto.js";
import { eq } from "drizzle-orm";

// creates a new submission in the database
export async function createSubmission(data: CreateSubmissionDTO) {
    const [submission] = await db
        .insert(submissions)
        .values({
            // id of the problem this submission belongs to
            problemId: data.problemId,

            // source code submitted by the user
            code: data.code,

            // programming language used for the submission
            language: data.language,
        })
        .returning();

    return submission;
}

// gets a submission by its id
export async function getSubmissionById(data: SubmissionIdDTO) {
    const [submission] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, data.submissionId));

    return submission;
}

// gets all submissions belonging to a particular problem
export async function getAllSubmissionsForProblemId(problemId: string) {
    return await db
        .select()
        .from(submissions)
        .where(eq(submissions.problemId, problemId));
}

// deletes a submission by its id
export async function deleteSubmission(data: SubmissionIdDTO) {
    const [submission] = await db
        .delete(submissions)
        .where(eq(submissions.id, data.submissionId))
        .returning();

    return submission;
}

// updates the status of a submission by its id
export async function updateSubmissionStatus(
    data: SubmissionIdDTO,
    statusData: UpdateSubmissionStatusDTO,
) {
    const [submission] = await db
        .update(submissions)
        .set({
            // update the submission status
            status: statusData.status,

            // manually update the timestamp because defaultNow() only applies when the row is inserted
            updatedAt: new Date(),
        })
        .where(eq(submissions.id, data.submissionId))
        .returning();

    return submission;
}