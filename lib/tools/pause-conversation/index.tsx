import { ToolDefinition } from "../definitions/tool-interface";
import {
  pauseConversationConfigSchema,
  pauseConversationCredentialSchema,
} from "./schema";
import { checkPauseCondition, pauseConversation } from "./functions";
import PauseConversationLogo from "./assets/logo";

export const pauseConversationTool: ToolDefinition = {
  id: "pause-conversation",
  name: "Conversation Pause",
  description:
    "Automatically pause conversations when specific conditions are met",
  type: "DATA_QUERY",
  integrationType: undefined,
  version: "1.0.0",
  icon: <PauseConversationLogo className="w-8 h-8" />,
  configSchema: pauseConversationConfigSchema,
  functions: {
    checkPauseCondition,
    pauseConversation,
  },
  getCredentialSchema: () => pauseConversationCredentialSchema,
  defaultConfig: {
    pauseConditionPrompt:
      "The user wants to end the conversation or talk to a human",
  },
};
