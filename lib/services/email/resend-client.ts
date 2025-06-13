"use server";

import { env } from "@/src/env";
import { CreateEmailOptions } from "resend";

// Define our own email interface that's more lenient
interface EmailData {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
  cc?: string[];
  bcc?: string[];
  tags?: string[];
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email using Resend
 * This wrapper handles the TypeScript compatibility issues
 */
export async function sendResendEmail(
  emailData: EmailData
): Promise<EmailResult> {
  try {
    // Use dynamic import to avoid issues with Resend types during build
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);

    const resendData: CreateEmailOptions = {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || "",
      replyTo: emailData.reply_to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      tags: emailData.tags?.map((tag) => ({ name: tag, value: tag })),
    };

    const { data, error } = await resend.emails.send(resendData);

    if (error) {
      console.error("Resend email error:", error);
      return {
        success: false,
        error: error.message || "Unknown email error",
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
