import { ToolFunction } from "../definitions/tool-interface";
import {
  saveLeadSchema,
  requestLeadInfoSchema,
  detectTriggerKeywordSchema,
} from "./schema";

export const saveLead: ToolFunction = {
  description: "Save lead contact information",
  parameters: saveLeadSchema,
  execute: async (params, context) => {
    try {
      const { name, phone, email, company, source, triggerKeyword } = params;
      console.log("Saving lead info:", {
        name,
        phone,
        email,
        company,
        source: source || "chat",
        triggerKeyword,
      });
      console.log("Context:", context);
      // Validate required fields
      if (!name || !phone) {
        return {
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: "Name and phone number are required",
          },
        };
      }

      // In a real implementation, you would:
      // 1. Save the lead to a database
      // 2. Maybe trigger a notification to the team
      // 3. Maybe add the lead to a CRM

      // For now, return a successful response
      return {
        success: true,
        leadId: "lead_" + Math.random().toString(36).substring(2, 10),
        message: `Successfully saved lead information for ${name}.`,
        data: {
          name,
          phone,
          email,
          company,
          source: source || "chat",
          triggerKeyword,
          timestamp: new Date().toISOString(),
        },
      };
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

      // Get the fields to request and trigger keyword if available
      const { fields, message, triggerKeyword } = params;

      // In a real implementation, this might show a form to the user
      // For now, return instructions for the assistant

      const defaultMessage = "I need to collect some information from you.";
      const fieldLabels: Record<string, string> = {
        name: "your full name",
        email: "your email address",
        phone: "your phone number",
        company: "your company name",
        message: "any additional information or questions",
      };

      const fieldRequests =
        fields && Array.isArray(fields)
          ? fields
              .map(
                (field: string) =>
                  fieldLabels[field as keyof typeof fieldLabels]
              )
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
        fieldsToRequest: fields,
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
    "Detect if a user message contains lead capture trigger keywords",
  parameters: detectTriggerKeywordSchema,
  execute: async (params, context) => {
    try {
      const { message } = params as { message: string };

      // Get the trigger keywords from config
      const config = context.config || {};
      const defaultTriggers = ["pricing", "demo", "contact", "quote", "trial"];
      const triggerKeywords = Array.isArray(config.leadCaptureTriggers)
        ? config.leadCaptureTriggers
        : defaultTriggers;

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
