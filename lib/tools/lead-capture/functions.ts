import prisma from "@/lib/db/prisma";
import { ToolFunction } from "../definitions/tool-interface";
import {
  saveLeadSchema,
  requestLeadInfoSchema,
  detectTriggerKeywordSchema,
} from "./schema";
import { InputJsonValue } from "@/lib/generated/prisma/runtime/library";

// Extended ToolContext with the fields we need
interface LeadCaptureToolContext {
  botId: string;
  toolId?: string;
  conversationId?: string;
  config?: Record<string, unknown>;
}

// Type for config
interface LeadCaptureConfig {
  requiredFields?: string[];
  leadNotifications?: boolean;
  leadCaptureTriggers?: string[];
  customTriggerPhrases?: string[];
}

export const saveLead: ToolFunction = {
  description: "Save lead contact information.",
  parameters: saveLeadSchema,
  execute: async (params, context) => {
    try {
      // Type-safe cast of context
      const toolContext = context as unknown as LeadCaptureToolContext;

      // Extract parameters with proper typing
      const {
        name = "",
        phone = "",
        email,
        company,
        source,
        triggerKeyword,
        ...rest
      } = params as Record<string, unknown>;

      // Get config from context and type it correctly
      const config = (toolContext.config || {}) as LeadCaptureConfig;

      // Get the required fields from config
      const requiredFields = config.requiredFields || ["name", "phone"];
      const conversationId = toolContext.conversationId || undefined;

      console.log("Saving lead info:", {
        name,
        phone,
        email,
        company,
        source: source || "chat",
        triggerKeyword,
      });
      console.log("Context:", toolContext);

      // Validate required fields from config
      const missingFields = requiredFields.filter((field) => {
        // Check if any required field is missing
        if (field === "name" && !name) return true;
        if (field === "email" && !email) return true;
        if (field === "phone" && !phone) return true;
        if (field === "company" && !company) return true;
        return false;
      });

      if (missingFields.length > 0) {
        return {
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: `Missing required fields: ${missingFields.join(", ")}`,
          },
        };
      }

      // Save lead to the database
      try {
        // Extract custom properties (fields not in our standard schema)
        const standardFields = [
          "name",
          "phone",
          "email",
          "company",
          "source",
          "triggerKeyword",
        ];
        const properties = Object.entries(rest).reduce((acc, [key, value]) => {
          if (!standardFields.includes(key)) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, unknown>);

        const savedLead = await prisma.lead.create({
          data: {
            botId: toolContext.botId,
            name: String(name) || null,
            phone: String(phone) || null,
            email: email ? String(email) : null,
            company: company ? String(company) : null,
            source: source ? String(source) : "chat",
            triggerKeyword: triggerKeyword ? String(triggerKeyword) : null,
            conversationId: conversationId || null,
            properties:
              Object.keys(properties).length > 0
                ? (properties as InputJsonValue)
                : undefined,
            metadata: {
              capturedAt: new Date().toISOString(),
              toolId: toolContext.toolId || "lead-capture",
              conversationId: conversationId || null,
            } as InputJsonValue,
          },
        });

        // Check if we should send notifications based on config
        const shouldNotify = config.leadNotifications !== false;
        let notificationSent = false;

        if (shouldNotify) {
          try {
            // Import notification service dynamically to avoid circular dependencies
            const { notifyLeadCapture } = await import(
              "@/lib/services/notifications/lead-notification-service"
            );

            // Send notification asynchronously (don't await to avoid blocking the response)
            notifyLeadCapture(savedLead.id, toolContext.botId)
              .then((success) => {
                console.log(
                  `Lead notification sent: ${success ? "success" : "failed"}`
                );
              })
              .catch((error) => {
                console.error("Error sending lead notification:", error);
              });

            notificationSent = true;
          } catch (error) {
            console.error("Error importing notification service:", error);
            notificationSent = false;
          }
        }

        return {
          success: true,
          leadId: savedLead.id,
          message: `Successfully saved lead information for ${name}.`,
          data: {
            name: String(name),
            email: email ? String(email) : null,
            phone: String(phone),
            company: company ? String(company) : null,
            conversationId: conversationId || null,
            notificationSent: notificationSent,
          },
        };
      } catch (dbError) {
        console.error("Database error when saving lead:", dbError);
        throw dbError;
      }
    } catch (error) {
      console.error("Error saving lead info:", error);
      return {
        success: false,
        error: {
          code: "SAVE_LEAD_FAILED",
          message: "Failed to save lead information",
          details: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
};

export const requestLeadInfo: ToolFunction = {
  description: "Request specific information from the lead",
  parameters: requestLeadInfoSchema,
  execute: async (params, context) => {
    try {
      console.log("Requesting lead info:", params);
      console.log("Context:", context);

      // Get config from context and type it correctly
      const config = (context.config || {}) as LeadCaptureConfig;

      // Get the required fields from config, or use default fields
      const configRequiredFields = config.requiredFields || [
        "name",
        "email",
        "phone",
      ];

      // Get the fields to request and trigger keyword if available
      const { fields, message, triggerKeyword } = params;

      // Use the fields from params, or fall back to required fields from config
      const fieldsToRequest = configRequiredFields || fields;

      // In a real implementation, this might show a form to the user
      // For now, return instructions for the assistant

      const defaultMessage = "I need to collect some information from you.";
      const fieldLabels: Record<string, string> = {
        name: "your full name",
        email: "your email address",
        phone: "your phone number",
        company: "your company name",
      };

      const fieldRequests =
        fieldsToRequest && Array.isArray(fieldsToRequest)
          ? fieldsToRequest
              .map(
                (field: string) =>
                  fieldLabels[field as keyof typeof fieldLabels] || field
              )
              .filter((label) => label) // Filter out any undefined labels
              .join(", ")
          : "";

      // Customize message based on trigger keyword
      let customMessage = message || defaultMessage;
      if (triggerKeyword) {
        if (triggerKeyword === "pricing") {
          customMessage =
            "To provide you with pricing information, I need to collect some details from you.";
        } else if (triggerKeyword === "demo") {
          customMessage =
            "To schedule a product demo for you, I need some information.";
        } else if (triggerKeyword === "trial") {
          customMessage =
            "To set up your free trial, I need to collect some details.";
        }
      }

      return {
        success: true,
        formMessage: customMessage,
        fieldsToRequest: fieldsToRequest,
        assistantInstructions: `Please ask for ${
          fieldRequests || "required information"
        } from the user.`,
        triggerKeyword,
      };
    } catch (error) {
      console.error("Error requesting lead info:", error);
      return {
        success: false,
        error: {
          code: "REQUEST_INFO_FAILED",
          message: "Failed to process information request",
          details: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
};

export const detectTriggerKeyword: ToolFunction = {
  description:
    "Detect if a user message contains lead capture trigger keywords.",
  parameters: detectTriggerKeywordSchema,
  execute: async (params, context) => {
    try {
      const { message } = params as { message: string };

      // Get config from context and type it correctly
      const config = (context.config || {}) as LeadCaptureConfig;
      console.log("Detect keyword config:", config);
      // Get the trigger keywords from config, merge both standard and custom triggers
      const defaultTriggers = ["pricing", "demo", "contact", "quote", "trial"];
      const configTriggers = Array.isArray(config.leadCaptureTriggers)
        ? config.leadCaptureTriggers
        : defaultTriggers;

      const customTriggers = Array.isArray(config.customTriggerPhrases)
        ? config.customTriggerPhrases
        : [];

      // Combine configured triggers with custom triggers
      const triggerKeywords = [...configTriggers, ...customTriggers];

      // Check if message contains any trigger keywords
      const messageLower = message.toLowerCase();
      const detectedKeywords = triggerKeywords.filter((keyword) =>
        messageLower.includes(keyword.toLowerCase())
      );

      const detected = detectedKeywords.length > 0;
      const triggerKeyword = detected ? detectedKeywords[0] : null;

      return {
        success: true,
        detected,
        triggerKeyword,
        message: detected
          ? `Detected lead capture trigger keyword: "${triggerKeyword}"`
          : "No lead capture trigger keywords detected",
        allTriggerKeywords: triggerKeywords,
      };
    } catch (error) {
      console.error("Error detecting trigger keywords:", error);
      return {
        success: false,
        detected: false,
        error: {
          code: "DETECT_TRIGGER_FAILED",
          message: "Failed to detect trigger keywords",
          details: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
};
