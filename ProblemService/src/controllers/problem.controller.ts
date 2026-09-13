import { Request, Response } from "express";
import {
    createProblemService,
    getProblemByIdService,
    getAllProblemsService,
    updateProblemService,
    deleteProblemService,
    findByDifficultyService,
    searchProblemsService,
} from "../services/problem.service.js";
import { Difficulty } from "../dtos/problem.dto.js";

// creates a new problem
export async function createProblem(req: Request, res: Response) {
    const problem = await createProblemService(req.body);

    res.status(201).json({
        message: "Problem created successfully",
        data: problem,
        success: true,
    });
}

// gets a problem by id
export async function getProblemById(req: Request, res: Response) {
    const problem = await getProblemByIdService(req.params.id as string);

    res.status(200).json({
        message: "Problem fetched successfully",
        data: problem,
        success: true,
    });
}

// gets all problems
export async function getAllProblems(req: Request, res: Response) {
    const problems = await getAllProblemsService();

    res.status(200).json({
        message: "Problems fetched successfully",
        data: problems,
        success: true,
    });
}

// updates a problem
export async function updateProblem(req: Request, res: Response) {
    const problem = await updateProblemService(
        req.params.id as string,
        req.body,
    );

    res.status(200).json({
        message: "Problem updated successfully",
        data: problem,
        success: true,
    });
}

// deletes a problem
export async function deleteProblem(req: Request, res: Response) {
    const deleted = await deleteProblemService(req.params.id as string);

    res.status(200).json({
        message: "Problem deleted successfully",
        data: deleted,
        success: true,
    });
}

// gets problems by difficulty
export async function findByDifficulty(req: Request, res: Response) {
    const difficulty = req.params.difficulty as Difficulty;

    const problems = await findByDifficultyService(difficulty);

    res.status(200).json({
        message: "Problems fetched successfully",
        data: problems,
        success: true,
    });
}

// searches problems
export async function searchProblems(req: Request, res: Response) {
    const query = req.query.query as string;

    const problems = await searchProblemsService(query);

    res.status(200).json({
        message: "Problems fetched successfully",
        data: problems,
        success: true,
    });
}
