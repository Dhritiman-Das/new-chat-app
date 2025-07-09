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
import type { GoHighLevelFollowUpSituation } from "../../lib/shared/types/gohighlevel";

interface FollowUpPayload {
  contactId: string;
  locationId: string;
  deploymentId: string;
  message: string;
  situationId: string;
  situationTag: string;
  __scheduleId: string;
  __metadata?: {
    contactId: string;
    locationId: string;
    triggerType: string;
    situationId: string;
  };
}

export const reEngageFollowUpTask = task({
  id: "re-engage-follow-up",
  run: async (payload: FollowUpPayload) => {
    const {
      contactId,
      locationId,
      deploymentId,
      message,
      situationId,
      situationTag,
      __scheduleId,
    } = payload;

    logger.info("Starting follow-up task", {
      contactId,
      locationId,
      deploymentId,
      situationId,
      scheduleId: __scheduleId,
      provider: "gohighlevel",
    });

    try {
      // Check if the schedule was cancelled
      const schedulerService = new TriggerDevSchedulerService();
      const isCancelled = await schedulerService.isScheduleCancelled(
        __scheduleId
      );

      if (isCancelled) {
        logger.info("Schedule was cancelled, skipping follow-up", {
          scheduleId: __scheduleId,
          contactId,
          situationId,
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

      // Get the follow-up situation configuration to check if it's still enabled
      const config = deployment.config as unknown as {
        globalSettings?: {
          followUpSituations?: GoHighLevelFollowUpSituation[];
        };
      };

      const followUpSituations =
        config.globalSettings?.followUpSituations || [];
      const situation = followUpSituations.find((s) => s.id === situationId);

      if (!situation || !situation.enabled) {
        logger.info("Follow-up situation no longer enabled, skipping", {
          situationId,
          contactId,
        });
        return { success: true, skipped: true, reason: "Situation disabled" };
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

      // Check if contact still has the trigger tag
      const contactData = await ghlClient.contacts.getContact(contactId);

      if (!contactData) {
        logger.error("Contact not found", { contactId });
        return { success: false, error: "Contact not found" };
      }

      const contactTags = contactData.contact?.tags || [];

      // Check if the contact still has the trigger tag
      if (!contactTags.includes(situationTag)) {
        logger.info("Contact no longer has trigger tag, skipping follow-up", {
          contactId,
          situationTag,
          currentTags: contactTags,
        });
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

          logger.info("Detected last message type for follow-up", {
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

      // Send follow-up message using the client with dynamic message type
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
        logger.error("Failed to send follow-up message", {
          contactId,
          error: "Message sending failed",
        });
        return { success: false, error: "Failed to send message" };
      }

      logger.info("Follow-up message sent successfully", {
        contactId,
        messageId: messageResult.messageId,
        messageType,
        situationId,
        scheduleId: __scheduleId,
      });

      return {
        success: true,
        messageId: messageResult.messageId,
        messageType,
        situationId,
        scheduleId: __scheduleId,
      };
    } catch (error) {
      logger.error("Error in follow-up task", {
        error: error instanceof Error ? error.message : String(error),
        contactId,
        situationId,
        scheduleId: __scheduleId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
