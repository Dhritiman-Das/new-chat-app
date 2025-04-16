import { ToolFunction } from "../definitions/tool-interface";
import { saveLeadSchema, requestLeadInfoSchema } from "./schema";

export const saveLead: ToolFunction = {
  description: "Save lead contact information",
  parameters: saveLeadSchema,
  execute: async (params, context) => {
    try {
      console.log("params", params);
      console.log("context", context);
      // In a real implementation, you would:
      // 1. Save the lead to a database
      // 2. Maybe trigger a notification to the team
      // 3. Maybe add the lead to a CRM

      // For now, return a dummy successful response
      return {
        success: true,
        leadId: "lead_" + Math.random().toString(36).substring(2, 10),
        message: `Successfully saved lead information for ${params.name}.`,
      };
    } catch (error) {
      console.error("Error saving lead info:", error);
      return {
        success: false,
        error: {
          code: "SAVE_LEAD_FAILED",
          message: "Failed to save lead information",
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
      console.log("params", params);
      console.log("context", context);
      // Get the fields to request
      const { fields, message } = params;

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
          : defaultMessage;

      return {
        success: true,
        formMessage: message || defaultMessage,
        fieldsToRequest: fields,
        assistantInstructions: `Please ask for ${fieldRequests} from the user.`,
      };
    } catch (error) {
      console.error("Error requesting lead info:", error);
      return {
        success: false,
        error: {
          code: "REQUEST_INFO_FAILED",
          message: "Failed to process information request",
        },
      };
    }
  },
};
