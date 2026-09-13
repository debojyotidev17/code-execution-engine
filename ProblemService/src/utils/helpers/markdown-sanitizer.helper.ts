import { marked } from "marked";
import logger from "../../config/logger.config.js";
import sanitizeHtml from "sanitize-html";
import TurndownService from "turndown";

// converts markdown to safe markdown by removing unsafe html
export async function sanitizeMarkdown(markdown: string) {
    // return empty string if markdown is missing or invalid
    if (!markdown || typeof markdown !== "string") {
        return "";
    }

    try {
        // convert markdown into html so it can be sanitized
        const convertedHtml = await marked.parse(markdown);

        // remove unsafe html and allow only required tags and attributes
        const sanitizedHtml = sanitizeHtml(convertedHtml, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat([
                "img",
                "pre",
                "code",
            ]),

            allowedAttributes: {
                ...sanitizeHtml.defaults.allowedAttributes,

                // allow basic image attributes
                img: ["src", "alt", "title"],

                // allow class for code formatting
                code: ["class"],
                pre: ["class"],

                // allow links with safe attributes
                a: ["href", "target"],
            },

            // allow only safe url protocols
            allowedSchemes: ["http", "https"],

            // allow http and https sources for images
            allowedSchemesByTag: {
                img: ["http", "https"],
            },
        });

        // convert the sanitized html back into markdown
        const tds = new TurndownService();

        return tds.turndown(sanitizedHtml);
    } catch (error) {
        // log the error and return an empty string if sanitization fails
        logger.error("Error sanitizing markdown", error);
        return "";
    }
}