import { z } from "zod";
import { ToolDefinition } from "../definitions/tool-interface";
import HighlevelCalendarLogo from "./assets/logo";

export const highlevelAddContactFieldTool: ToolDefinition = {
  id: "highlevel-add-contact-field",
  name: "GoHighLevel / Add Contact Field",
  description: "Add a field to a contact in GoHighLevel",
  type: "CONTACT_FIELD",
  integrationType: "highlevel",
  version: "1.0.0",
  icon: <HighlevelCalendarLogo className="w-[32px] h-[32px]" />,
  functions: {},
  configSchema: z.object({}),
  getCredentialSchema: () => z.object({}),
};
