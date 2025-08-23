import { env } from "@/utils/env.util";
import { config } from "dotenv";
import sgMail from "@sendgrid/mail";
// import twilio from "twilio";

config();

sgMail.setApiKey(env.SENDGRID_API_KEY!);
export const sendgridClient = sgMail;
