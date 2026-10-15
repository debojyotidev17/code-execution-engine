export class InternalServerError extends Error {
    statusCode;
    constructor(message) {
        super(message);
        this.statusCode = 500;
        this.name = "Internal Server Error";
    }
}
export class NotFoundError extends Error {
    statusCode;
    constructor(message) {
        super(message);
        this.statusCode = 404;
        this.name = "Not Found Error";
    }
}
export class BadRequestError extends Error {
    statusCode;
    constructor(message) {
        super(message);
        this.statusCode = 400;
        this.name = "Bad Request from client";
    }
}
