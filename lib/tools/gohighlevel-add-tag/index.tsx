import { z } from "zod";
import { ToolDefinition } from "../definitions/tool-interface";
import HighlevelCalendarLogo from "./assets/logo";

export const highlevelAddTagTool: ToolDefinition = {
  id: "highlevel-add-tag",
  name: "GoHighLevel / Add Tag",
  description: "Add a tag to a contact in GoHighLevel",
  type: "CONTACT_TAG",
  integrationType: "highlevel",
  version: "1.0.0",
  icon: <HighlevelCalendarLogo className="w-[32px] h-[32px]" />,
  functions: {},
  configSchema: z.object({}),
  getCredentialSchema: () => z.object({}),
};
