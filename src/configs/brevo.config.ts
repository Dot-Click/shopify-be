import nodemailer from "nodemailer";
import BrevoTransport from "nodemailer-brevo-transport";
import { env } from "../utils/env.util";
import { logger } from "../utils/logger.util";



export interface SendEmailOptions {
    to: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    from?: string;
}



export const sendEmail = async (
    options: SendEmailOptions
): Promise<boolean> => {
    try {

        const apiKey = env.BREVO_API_KEY || process.env.BREVO_API_KEY;
        if (!apiKey) {
            logger.warn(
                "BREVO_API_KEY not configured. Email not sent. Set BREVO_API_KEY in .env to enable."
            );
            return false;
        }
        // Create transporter using Brevo transport
        const transport = nodemailer.createTransport(
            new BrevoTransport({ apiKey })
        );
        // Send email
        console.log("Sending email with options:", options.from);
        const data = await transport.sendMail({
            from: process.env.BREVO_EMAIL,
            to: options.to,
            subject: options.subject,
            html: options.htmlContent,
            text: options.textContent,
        });

        logger.info(
            `Email sent successfully to ${options.to}. Message ID: ${data.messageId || "unknown"
            }`
        );
        return true;
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        logger.error(`Failed to send email to ${options.to}:`, errorMessage);
        if (error instanceof Error && (error as any).response) {
            logger.error("Brevo API Error:", (error as any).response.body);
        }
        return false;
    }
};