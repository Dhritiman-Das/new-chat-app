"use server";

import { redis } from "@/lib/db/kv";
import { sendResendEmail } from "./resend-client";
import { EMAIL_CONFIG } from "./config";

// Types for email notifications
export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailOptions {
  to: EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  tags?: string[];
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Rate limiting helper
async function checkRateLimit(email: string): Promise<boolean> {
  try {
    const key = `${EMAIL_CONFIG.RATE_LIMIT_PREFIX}${email}`;
    const current = await redis.get(key);

    if (
      current &&
      parseInt(current as string) >= EMAIL_CONFIG.RATE_LIMIT_MAX_EMAILS
    ) {
      return false;
    }

    await redis.incr(key);
    await redis.expire(key, EMAIL_CONFIG.RATE_LIMIT_WINDOW);

    return true;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Allow email if rate limit check fails
    return true;
  }
}

// Main email sending function
export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  try {
    // Validate required fields
    if (!options.to || options.to.length === 0) {
      return {
        success: false,
        error: "No recipients specified",
      };
    }

    if (!options.subject || !options.html) {
      return {
        success: false,
        error: "Subject and HTML content are required",
      };
    }

    // Check rate limits for all recipients
    for (const recipient of options.to) {
      const canSend = await checkRateLimit(recipient.email);
      if (!canSend) {
        console.warn(`Rate limit exceeded for ${recipient.email}`);
        return {
          success: false,
          error: `Rate limit exceeded for ${recipient.email}`,
        };
      }
    }

    // Prepare email data
    const emailData = {
      from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
      to: options.to.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
      cc: options.cc?.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
      bcc: options.bcc?.map((r) =>
        r.name ? `${r.name} <${r.email}>` : r.email
      ),
      tags: options.tags,
    };

    // Send email via Resend
    const result = await sendResendEmail({
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      reply_to: emailData.reply_to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      tags: emailData.tags,
    });

    return result;
  } catch (error) {
    console.error("Email service error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Batch email sending for multiple different emails
export async function sendBatchEmails(
  emails: EmailOptions[]
): Promise<EmailResponse[]> {
  const results = await Promise.allSettled(
    emails.map((email) => sendEmail(email))
  );

  return results.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : { success: false, error: "Batch email failed" }
  );
}

// Template-based email sending
export async function sendTemplateEmail<T = Record<string, unknown>>(
  templateId: string,
  recipients: EmailRecipient[],
  templateData: T,
  options?: Partial<EmailOptions>
): Promise<EmailResponse> {
  // This is a placeholder for template-based emails
  // You can integrate with Resend's template system or build your own
  console.log("Template email sending not yet implemented", {
    templateId,
    recipients,
    templateData,
    options,
  });

  return {
    success: false,
    error: "Template email sending not yet implemented",
  };
}
