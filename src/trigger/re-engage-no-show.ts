import { logger, task } from "@trigger.dev/sdk/v3";
import { TriggerDevSchedulerService } from "../../lib/scheduler/providers/trigger-dev";
import { prisma } from "../../lib/db/prisma";
import { createTokenContext } from "../../lib/auth/index";
import { createGoHighLevelClient } from "../../lib/auth/clients/gohighlevel/index";
import type {
  Message,
  MessageType,
} from "../../lib/auth/clients/gohighlevel/messaging";
import { mapGoHighLevelMessageType } from "../../lib/auth/clients/gohighlevel/messaging";

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

      // Create TokenContext for GoHighLevel client
      const tokenContext = createTokenContext(
        deployment.bot.userId,
        "gohighlevel",
        {
          botId: deployment.bot.id,
        }
      );

      // Create GoHighLevel client
      const ghlClient = await createGoHighLevelClient(tokenContext, locationId);

      // Check if contact still has the no-show tag
      const contactData = await ghlClient.contacts.getContact(contactId);

      if (!contactData) {
        logger.error("Contact not found", { contactId });
        return { success: false, error: "Contact not found" };
      }

      const contactTags = contactData.contact?.tags || [];

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

      // Get the last message type from conversation history
      let messageType: MessageType = "SMS"; // Default fallback

      try {
        const conversationSearch =
          await ghlClient.messaging.searchConversations({
            contactId,
            limit: 1,
            sortBy: "last_message_date",
            sort: "desc",
          });

        if (conversationSearch.conversations.length > 0) {
          const lastConversation = conversationSearch.conversations[0];
          messageType = mapGoHighLevelMessageType(
            lastConversation.lastMessageType
          );

          logger.info("Detected last message type for re-engagement", {
            contactId,
            ghlMessageType: lastConversation.lastMessageType,
            mappedMessageType: messageType,
          });
        } else {
          logger.info("No conversation history found, using default SMS", {
            contactId,
          });
        }
      } catch (error) {
        logger.warn("Failed to fetch conversation history, using default SMS", {
          contactId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Send re-engagement message using the client with dynamic message type
      const messagePayload: Message = {
        type: messageType,
        contactId,
        message,
        locationId,
      };

      const messageResult = await ghlClient.messaging.sendMessage(
        messagePayload
      );

      if (!messageResult.success) {
        logger.error("Failed to send re-engagement message", {
          contactId,
          error: "Message sending failed",
        });
        return { success: false, error: "Failed to send message" };
      }

      logger.info("Re-engagement message sent successfully", {
        contactId,
        messageId: messageResult.messageId,
        messageType,
        scheduleId: __scheduleId,
      });

      return {
        success: true,
        messageId: messageResult.messageId,
        messageType,
        scheduleId: __scheduleId,
      };
    } catch (error) {
      logger.error("Error in re-engagement task", {
        error: error instanceof Error ? error.message : String(error),
        contactId,
        scheduleId: __scheduleId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
