export const genericErrorHandler = (err, req, res, next) => {
    if (err instanceof Error && "statusCode" in err) {
        const appError = err;
        return res.status(appError.statusCode).json({
            success: false,
            message: appError.message,
        });
    }
    const unknownError = err;
    return res.status(500).json({
        success: false,
        message: unknownError.message,
    });
};
/*
 *  Error
 *  ├── name
 *  ├── message
 *  └── stack
 *
 * For example:
 *
 * throw new Error("Database connection failed");
 *
 *  will now safely become:
 *
 *  {
 *     "success": false,
 *     "message": "Database connection failed"
 *  }
 */ 
