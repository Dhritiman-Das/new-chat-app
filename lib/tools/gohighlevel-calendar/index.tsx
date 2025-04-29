import { z } from "zod";
import { ToolDefinition } from "../definitions/tool-interface";
import HighlevelCalendarLogo from "./assets/logo";

export const highlevelCalendarTool: ToolDefinition = {
  id: "highlevel-calendar",
  name: "GoHighLevel / Calendar",
  description:
    "Book, reschedule, cancel, and list appointments on GoHighLevel Calendar",
  type: "CALENDAR_BOOKING",
  integrationType: "highlevel",
  version: "1.0.0",
  icon: <HighlevelCalendarLogo className="w-[32px] h-[32px]" />,
  functions: {},
  configSchema: z.object({}),
  getCredentialSchema: () => z.object({}),
};
