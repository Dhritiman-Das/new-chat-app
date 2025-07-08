import { logger, task } from "@trigger.dev/sdk/v3";
import { TriggerDevSchedulerService } from "../../lib/scheduler/providers/trigger-dev";
import { prisma } from "../../lib/db/prisma";

interface ReEngagePayload {
  contactId: string;
  locationId: string;
  deploymentId: string;
  message: string;
  noShowTag?: string;
  __scheduleId: string;
  __metadata?: {
    contactId: string;
    locationId: string;
    provider: string; // e.g., "gohighlevel", "hubspot", "salesforce"
    triggerType: string;
  };
}

export const reEngageNoShowTask = task({
  id: "re-engage-no-show",
  run: async (payload: ReEngagePayload) => {
    const {
      contactId,
      locationId,
      deploymentId,
      message,
      noShowTag,
      __scheduleId,
    } = payload;

    logger.info("Starting re-engagement task", {
      contactId,
      locationId,
      deploymentId,
      scheduleId: __scheduleId,
      provider: "gohighlevel", // This is specifically for GoHighLevel
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL,
      nodeEnv: process.env.NODE_ENV,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + "...",
    });

    try {
      // Check if the schedule was cancelled
      const schedulerService = new TriggerDevSchedulerService();
      const isCancelled = await schedulerService.isScheduleCancelled(
        __scheduleId
      );

      if (isCancelled) {
        logger.info("Schedule was cancelled, skipping re-engagement", {
          scheduleId: __scheduleId,
          contactId,
          provider: "gohighlevel",
        });
        return { success: true, skipped: true, reason: "Schedule cancelled" };
      }

      // Get the deployment to access configuration
      const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentId },
        include: {
          bot: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!deployment) {
        logger.error("Deployment not found", { deploymentId });
        return { success: false, error: "Deployment not found" };
      }

      // Get GoHighLevel credentials
      const credentials = await prisma.credential.findFirst({
        where: {
          userId: deployment.bot.userId,
          provider: "gohighlevel",
        },
      });

      if (!credentials) {
        logger.error("GoHighLevel credentials not found", {
          userId: deployment.bot.userId,
        });
        return { success: false, error: "GoHighLevel credentials not found" };
      }

      // Parse credentials from JSON
      const credentialsData = credentials.credentials as {
        access_token: string;
      };

      // Check if contact still has the no-show tag
      const contactResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/${contactId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${credentialsData.access_token}`,
            Version: "2021-07-28",
          },
        }
      );

      if (!contactResponse.ok) {
        logger.error("Failed to fetch contact", {
          contactId,
          status: contactResponse.status,
          statusText: contactResponse.statusText,
        });
        return { success: false, error: "Failed to fetch contact" };
      }

      const contact = await contactResponse.json();
      const contactTags = contact.contact?.tags || [];

      // Check if the contact still has the no-show tag
      if (!contactTags.includes(noShowTag)) {
        logger.info(
          "Contact no longer has no-show tag, skipping re-engagement",
          {
            contactId,
            noShowTag,
            currentTags: contactTags,
          }
        );
        return { success: true, skipped: true, reason: "Tag removed" };
      }

      // Send re-engagement message
      const messageResponse = await fetch(
        "https://services.leadconnectorhq.com/conversations/messages",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credentialsData.access_token}`,
            Version: "2021-07-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "SMS",
            contactId,
            message,
            locationId,
          }),
        }
      );

      if (!messageResponse.ok) {
        logger.error("Failed to send re-engagement message", {
          contactId,
          status: messageResponse.status,
          statusText: messageResponse.statusText,
        });
        return { success: false, error: "Failed to send message" };
      }

      const messageResult = await messageResponse.json();

      logger.info("Re-engagement message sent successfully", {
        contactId,
        messageId: messageResult.messageId,
        scheduleId: __scheduleId,
        provider: "gohighlevel",
      });

      // Log the activity in the database as a tool execution
      await prisma.toolExecution.create({
        data: {
          conversationId: `re-engage-${contactId}-${Date.now()}`,
          toolId: "re-engage-no-show",
          functionName: "sendReEngagementMessage",
          params: {
            contactId,
            message,
            noShowTag,
            locationId,
            deploymentId,
          },
          result: {
            messageId: messageResult.messageId,
            scheduleId: __scheduleId,
          },
          status: "COMPLETED",
        },
      });

      return {
        success: true,
        messageId: messageResult.messageId,
        scheduleId: __scheduleId,
      };
    } catch (error) {
      logger.error("Error in re-engagement task", {
        error: error instanceof Error ? error.message : String(error),
        contactId,
        scheduleId: __scheduleId,
        provider: "gohighlevel",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
