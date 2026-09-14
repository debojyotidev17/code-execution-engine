import type { Request, Response } from "express";

import {
    createSubmission as createSubmissionService,
    getSubmissionById as getSubmissionByIdService,
    getSubmissionsByProblemId as getSubmissionsByProblemIdService,
    deleteSubmission as deleteSubmissionService,
    updateSubmissionStatus as updateSubmissionStatusService,
} from "../services/submission.service.js";

// create a new submission
export async function createSubmission(req: Request, res: Response) {
    const submission = await createSubmissionService(req.body);

    res.status(201).json({
        message: "Submission created successfully",
        data: submission,
        success: true,
    });
}

// get a submission by its id
export async function getSubmissionById(req: Request, res: Response) {
    const submission = await getSubmissionByIdService({
        submissionId: req.params.id as string,
    });

    res.status(200).json({
        message: "Submission fetched successfully",
        data: submission,
        success: true,
    });
}

// get all submissions for a problem
export async function getSubmissionsByProblemId(req: Request, res: Response) {
    const submissions = await getSubmissionsByProblemIdService(
        req.params.problemId as string,
    );

    res.status(200).json({
        message: "Submissions fetched successfully",
        data: submissions,
        success: true,
    });
}

// delete a submission by its id
export async function deleteSubmission(req: Request, res: Response) {
    const submission = await deleteSubmissionService({
        submissionId: req.params.id as string,
    });

    res.status(200).json({
        message: "Submission deleted successfully",
        data: submission,
        success: true,
    });
}

// update the status of a submission
export async function updateSubmissionStatus(req: Request, res: Response) {
    const submission = await updateSubmissionStatusService(
        {
            submissionId: req.params.id as string,
        },
        req.body,
    );

    res.status(200).json({
        message: "Submission status updated successfully",
        data: submission,
        success: true,
    });
}
