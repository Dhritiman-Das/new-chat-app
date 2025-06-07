import { toolRegistry } from "./registry";
import { googleCalendarTool } from "./google-calendar";
import { leadCaptureTool } from "./lead-capture";
import { gohighlevelCalendarTool } from "./gohighlevel-calendar";
import { highlevelAddContactFieldTool } from "./gohighlevel-add-contact-field";
import { highlevelAddTagTool } from "./gohighlevel-add-tag";
import { prisma } from "@/lib/db/prisma";
import { createCustomToolDefinition } from "./custom-tool";

// Initialize all tools
export async function initializeTools() {
  // Register built-in tools in registry
  toolRegistry.register(googleCalendarTool);
  toolRegistry.register(leadCaptureTool);
  toolRegistry.register(gohighlevelCalendarTool);
  // toolRegistry.register(highlevelAddContactFieldTool);
  // toolRegistry.register(highlevelAddTagTool);

  // Load and synchronize custom tools from database
  try {
    const customTools = await prisma.tool.findMany({
      where: {
        type: "CUSTOM",
        isActive: true,
        createdByBotId: null, // Only load public/admin tools (not bot-specific)
      },
    });

    // Get all current custom tool IDs from the registry
    const currentCustomToolIds = toolRegistry
      .getAll()
      .filter((tool) => tool.type === "CUSTOM")
      .map((tool) => tool.id);

    // Get active custom tool IDs from database
    const activeCustomToolIds = customTools.map((tool) => tool.id);

    // Remove tools that are no longer in the database or are inactive
    for (const currentId of currentCustomToolIds) {
      if (!activeCustomToolIds.includes(currentId)) {
        toolRegistry.remove(currentId);
        console.log(`Removed custom tool from registry: ${currentId}`);
      }
    }

    // Add or update tools from database
    for (const customTool of customTools) {
      try {
        const toolDefinition = createCustomToolDefinition({
          id: customTool.id,
          name: customTool.name,
          description: customTool.description || "",
          functions: customTool.functions as Record<string, unknown>,
          functionsSchema: customTool.functionsSchema as Record<
            string,
            unknown
          >,
          requiredConfigs: customTool.requiredConfigs as Record<
            string,
            unknown
          >,
        });

        toolRegistry.register(toolDefinition);
      } catch (error) {
        console.error(
          `Failed to register custom tool ${customTool.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Failed to load custom tools from database:", error);
  }

  toolRegistry.setInitialized(true);

  return {
    toolRegistry,
  };
}

// Synchronous version for cases where we can't use async
export function initializeToolsSync() {
  // Register built-in tools in registry
  toolRegistry.register(googleCalendarTool);
  toolRegistry.register(leadCaptureTool);
  toolRegistry.register(gohighlevelCalendarTool);
  toolRegistry.register(highlevelAddContactFieldTool);
  toolRegistry.register(highlevelAddTagTool);

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
