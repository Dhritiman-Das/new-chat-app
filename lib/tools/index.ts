import { toolRegistry } from "./registry";
import { googleCalendarTool } from "./google-calendar";
import { leadCaptureTool } from "./lead-capture";

// Initialize all tools
export function initializeTools() {
  // Register tools in registry
  toolRegistry.register(googleCalendarTool);
  toolRegistry.register(leadCaptureTool);

  // Add more tools here as they are created

  toolRegistry.setInitialized(true);

  return {
    toolRegistry,
  };
}

// Export everything
export * from "./registry";
export * from "./definitions/tool-interface";
export * from "./services/tool-execution-service";
export * from "./services/credentials-service";
export * from "./google-calendar";
export * from "./lead-capture";
