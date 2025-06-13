import { env } from "@/src/env";

// Email configuration - Update these values for your application
export const EMAIL_CONFIG = {
  // Update with your verified domain in Resend
  FROM_EMAIL:
    env.NODE_ENV === "production"
      ? "noreply@bonti.co"
      : "onboarding@resend.dev", // Use Resend's test domain in development

  // Update with your application name
  FROM_NAME: "Bonti",

  // Rate limiting settings
  RATE_LIMIT_PREFIX: "email_rate_limit:",
  RATE_LIMIT_WINDOW: 3600, // 1 hour in seconds
  RATE_LIMIT_MAX_EMAILS: 100, // Max emails per hour per recipient

  // Default reply-to email (optional)
  REPLY_TO_EMAIL:
    env.NODE_ENV === "production" ? "support@yourdomain.com" : undefined,

  // Application URLs for email templates
  APP_URL: env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Email tags for tracking
  DEFAULT_TAGS: ["notification", "automated"],
} as const;

// Template-specific configurations
export const TEMPLATE_CONFIG = {
  LEAD_NOTIFICATION: {
    TAGS: ["lead-notification", "lead-capture"],
    PRIORITY: "high" as const,
  },
  // Add more template configs here as needed
} as const;

// Validation helper
export function validateEmailConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!EMAIL_CONFIG.FROM_EMAIL) {
    errors.push("FROM_EMAIL is required");
  }

  if (!EMAIL_CONFIG.FROM_NAME) {
    errors.push("FROM_NAME is required");
  }

  if (!EMAIL_CONFIG.APP_URL) {
    errors.push("APP_URL is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
