import { Request, Response } from "express";
import fs from "fs/promises";
import { InternalServerError } from "../utils/errors/app.error.js";

export const pingHandler = async (req: Request, res: Response) => {
    try {
        await fs.readFile("sample");
        res.status(200).json({ message: "Pong" });
    } catch (error) { 
        throw new InternalServerError("File not found");
    }
};