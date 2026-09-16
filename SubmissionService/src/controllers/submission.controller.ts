import type { Request, Response } from "express";

import {
    createSubmissionService,
    getSubmissionByIdService,
    getSubmissionsByProblemIdService,
    deleteSubmissionService,
    updateSubmissionStatusService,
} from "../services/submission.service.js";

// creates a new submission
export async function createSubmission(req: Request, res: Response) {
    // pass the request body to the service layer
    const submission = await createSubmissionService(req.body);

    // send the newly-created submission back to the client
    res.status(201).json({
        message: "Submission created successfully",
        data: submission,
        success: true,
    });
}

// gets a submission by its id
export async function getSubmissionById(req: Request, res: Response) {
    // get the submission id from the route parameter
    const submission = await getSubmissionByIdService({
        submissionId: req.params.id as string,
    });

    // send the submission back to the client
    res.status(200).json({
        message: "Submission fetched successfully",
        data: submission,
        success: true,
    });
}

// gets all submissions for a particular problem
export async function getSubmissionsByProblemId(req: Request, res: Response) {
    // get the problem id from the route parameter
    const submissions = await getSubmissionsByProblemIdService(
        req.params.problemId as string,
    );

    // send the submissions back to the client
    res.status(200).json({
        message: "Submissions fetched successfully",
        data: submissions,
        success: true,
    });
}

// deletes a submission by its id
export async function deleteSubmission(req: Request, res: Response) {
    // get the submission id from the route parameter
    const submission = await deleteSubmissionService({
        submissionId: req.params.id as string,
    });

    // send the deleted submission back to the client
    res.status(200).json({
        message: "Submission deleted successfully",
        data: submission,
        success: true,
    });
}

// updates the status of a submission
export async function updateSubmissionStatus(req: Request, res: Response) {
    // get the submission id from the route parameter and pass the new status from the request body
    const submission = await updateSubmissionStatusService(
        {
            submissionId: req.params.id as string,
        },
        req.body,
    );

    // send the updated submission back to the client
    res.status(200).json({
        message: "Submission status updated successfully",
        data: submission,
        success: true,
    });
}