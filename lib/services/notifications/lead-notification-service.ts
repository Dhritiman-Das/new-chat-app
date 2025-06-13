"use server";

import { prisma } from "@/lib/db/prisma";
import { sendEmail, type EmailRecipient } from "../email/email-service";
import {
  generateLeadNotificationEmail,
  type LeadNotificationData,
} from "../email/templates/lead-notification";

export interface LeadNotificationOptions {
  leadId: string;
  botId: string;
  notifyOwners?: boolean;
  additionalRecipients?: EmailRecipient[];
}

export interface LeadNotificationResult {
  success: boolean;
  messagesSent: number;
  errors: string[];
  notifications: {
    recipient: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

/**
 * Get organization owners for a given bot
 */
async function getOrganizationOwners(botId: string): Promise<EmailRecipient[]> {
  try {
    // Get the bot and its organization with owners
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: {
        organization: {
          include: {
            users: {
              where: {
                role: "OWNER",
              },
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!bot) {
      console.error(`Bot not found: ${botId}`);
      return [];
    }

    // Extract owner emails and names
    const owners: EmailRecipient[] = bot.organization.users.map((userOrg) => {
      const user = userOrg.user;
      return {
        email: user.email,
        name:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.firstName || user.email,
      };
    });

    return owners;
  } catch (error) {
    console.error("Error getting organization owners:", error);
    return [];
  }
}

/**
 * Get lead information with bot and organization details
 */
async function getLeadWithDetails(
  leadId: string
): Promise<LeadNotificationData | null> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        bot: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!lead) {
      console.error(`Lead not found: ${leadId}`);
      return null;
    }

    const customProperties = lead.properties
      ? typeof lead.properties === "object" && lead.properties !== null
        ? (lead.properties as Record<string, unknown>)
        : {}
      : {};

    return {
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: lead.email,
      leadPhone: lead.phone,
      leadCompany: lead.company,
      triggerKeyword: lead.triggerKeyword,
      source: lead.source,
      capturedAt: lead.createdAt.toISOString(),
      botName: lead.bot.name,
      organizationName: lead.bot.organization.name,
      conversationId: lead.conversationId,
      customProperties,
    };
  } catch (error) {
    console.error("Error getting lead details:", error);
    return null;
  }
}

/**
 * Check if lead notifications are enabled for a bot
 */
async function areLeadNotificationsEnabled(botId: string): Promise<boolean> {
  try {
    // Find the lead capture tool configuration for this bot
    const botTool = await prisma.botTool.findFirst({
      where: {
        botId,
        tool: {
          id: "lead-capture",
        },
        isEnabled: true,
      },
      include: {
        tool: true,
      },
    });

    if (!botTool) {
      // If no tool configuration found, default to false
      return false;
    }

    // Check the config for leadNotifications setting
    const config = botTool.config as Record<string, unknown> | null;

    if (!config) {
      // If no config, default to true (backwards compatibility)
      return true;
    }

    // Check if leadNotifications is explicitly set to false
    return config.leadNotifications !== false;
  } catch (error) {
    console.error("Error checking lead notification settings:", error);
    // Default to false if we can't determine the setting
    return false;
  }
}

/**
 * Send lead capture notification
 */
export async function sendLeadNotification(
  options: LeadNotificationOptions
): Promise<LeadNotificationResult> {
  const result: LeadNotificationResult = {
    success: false,
    messagesSent: 0,
    errors: [],
    notifications: [],
  };

  try {
    // Check if notifications are enabled for this bot
    const notificationsEnabled = await areLeadNotificationsEnabled(
      options.botId
    );

    if (!notificationsEnabled) {
      result.errors.push("Lead notifications are disabled for this bot");
      return result;
    }

    // Get lead data
    const leadData = await getLeadWithDetails(options.leadId);
    if (!leadData) {
      result.errors.push("Lead not found or could not be retrieved");
      return result;
    }

    // Collect recipients
    const recipients: EmailRecipient[] = [];

    // Add organization owners if requested (default: true)
    if (options.notifyOwners !== false) {
      const owners = await getOrganizationOwners(options.botId);
      recipients.push(...owners);
    }

    // Add additional recipients if provided
    if (options.additionalRecipients) {
      recipients.push(...options.additionalRecipients);
    }

    // Remove duplicates based on email
    const uniqueRecipients = recipients.filter(
      (recipient, index, self) =>
        index === self.findIndex((r) => r.email === recipient.email)
    );

    if (uniqueRecipients.length === 0) {
      result.errors.push("No recipients found to notify");
      return result;
    }

    // Generate email template
    const emailTemplate = generateLeadNotificationEmail(leadData);

    // Send emails to all recipients
    for (const recipient of uniqueRecipients) {
      try {
        const emailResult = await sendEmail({
          ...emailTemplate,
          to: [recipient],
        });

        result.notifications.push({
          recipient: recipient.email,
          success: emailResult.success,
          messageId: emailResult.messageId,
          error: emailResult.error,
        });

        if (emailResult.success) {
          result.messagesSent++;
        } else {
          result.errors.push(
            `Failed to send to ${recipient.email}: ${emailResult.error}`
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push(
          `Failed to send to ${recipient.email}: ${errorMessage}`
        );
        result.notifications.push({
          recipient: recipient.email,
          success: false,
          error: errorMessage,
        });
      }
    }

    result.success = result.messagesSent > 0;

    console.log(
      `Lead notification result: ${result.messagesSent}/${uniqueRecipients.length} emails sent successfully`
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in sendLeadNotification:", error);
    result.errors.push(errorMessage);
    return result;
  }
}

/**
 * Send lead notification with basic options (simplified interface)
 */
export async function notifyLeadCapture(
  leadId: string,
  botId: string
): Promise<boolean> {
  try {
    const result = await sendLeadNotification({
      leadId,
      botId,
      notifyOwners: true,
    });

    return result.success;
  } catch (error) {
    console.error("Error in notifyLeadCapture:", error);
    return false;
  }
}
