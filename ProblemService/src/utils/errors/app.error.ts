export interface AppError extends Error {
    statusCode: number;
}

export class InternalServerError extends Error implements AppError {
    statusCode: number;

    constructor(message: string) {
        super(message);

        this.statusCode = 500;
        this.name = "Internal Server Error"; // JS default Error constructor only requires the message not the name
    }
}

export class NotFoundError extends Error implements AppError {
    statusCode: number;

    constructor(message: string) {
        super(message);

        this.statusCode = 404;
        this.name = "Not Found Error";
    }
}

export class BadRequestError extends Error implements AppError {
    statusCode: number;

    constructor(message: string) {
        super(message);

        this.statusCode = 400;
        this.name = "Bad Request from client";
    }
}