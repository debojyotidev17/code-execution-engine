import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

import { getCorrelationID } from "../utils/helpers/request.helper.js";

/*
 * logger levels:
 * info  -> general information about the application
 * warn  -> something unexpected but not necessarily an error
 * error -> something that went wrong
 *
 * transports -> where the logs should be sent
 * format     -> how the logs should be structured
 */

const logger = winston.createLogger({
    // defines how every log entry should be formatted
    format: winston.format.combine(
        // adds the current date and time to every log
        winston.format.timestamp({
            format: "DD-MM-YYYY HH:mm:ss",
        }),

        // creates the final structure of the log entry
        winston.format.printf(({ level, message, timestamp }) => {
            const output = {
                level,
                message,

                // gets the correlation ID of the current request from AsyncLocalStorage
                correlationID: getCorrelationID(),

                timestamp,
            };

            // converts the log object into a JSON string
            return JSON.stringify(output);
        }),
    ),

    // defines where the logs should be sent
    transports: [
        // prints logs in the terminal/console
        new winston.transports.Console(),

        // saves logs to files and automatically rotates them
        new DailyRotateFile({
            // %DATE% is replaced with the current date
            filename: "logs/%DATE%-app.log",

            // creates a new log file each day
            datePattern: "DD-MM-YYYY",

            // keeps log files for 14 days
            maxFiles: "14d",

            // rotates the log file when it reaches 20 MB
            maxSize: "20m",
        }),
    ],
});

// exports the configured logger so it can be used throughout the application
export default logger;