import { ToolDefinition } from "../definitions/tool-interface";
import { leadCaptureConfigSchema, leadCaptureCredentialSchema } from "./schema";
import { saveLead, requestLeadInfo, detectTriggerKeyword } from "./functions";
import LeadCaptureLogo from "./assets/logo";

export const leadCaptureTool: ToolDefinition = {
  id: "lead-capture",
  name: "Lead Info Collector",
  description: "Collect and store lead information during conversations",
  type: "CONTACT_FORM",
  integrationType: undefined,
  version: "1.0.0",
  icon: <LeadCaptureLogo className="w-8 h-8" />,
  configSchema: leadCaptureConfigSchema,
  functions: {
    saveLead,
    requestLeadInfo,
    detectTriggerKeyword,
  },
  getCredentialSchema: () => leadCaptureCredentialSchema,
  defaultConfig: {
    requiredFields: ["name", "email"],
    leadNotifications: true,
    leadCaptureTriggers: ["pricing", "demo", "contact", "quote", "trial"],
  },
};
