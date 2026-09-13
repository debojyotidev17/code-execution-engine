import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { getCorrelationID } from "../utils/helpers/request.helper.js";

/**
 * Types of logs (levels)-
 * 1. INFO
 * 2. WARN
 * 3. ERROR
 *
 * transports => where the log should be saved. eg - file,DB,console,etc
 * format => how the log should be printed
 */

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({ format: "MM-DD-YYYY HH:mm:ss" }), // how the timestamp should look
        winston.format.json(), // format the log message as JSON
        winston.format.printf(({ level, message, timestamp, ...data }) => {
            const output = {
                level,
                message,
                correlationID: getCorrelationID(),
                timestamp,
                data,
            };
            return JSON.stringify(output);
        }),
    ),
    transports: [
        new winston.transports.Console(),
        new DailyRotateFile({
            filename: "logs/%DATE%-app.log",
            datePattern: "YYYY-MM-DD",
            maxFiles: "14d",
            maxSize: "20m",
        }), // log to a file on daily basis
    ],
});

export default logger;
