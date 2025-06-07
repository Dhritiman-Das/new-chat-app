import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { toolRegistry } from "@/lib/tools";
import { initializeToolsSync } from "@/lib/tools";

// Initialize tools
initializeToolsSync();

interface Params {
  params: Promise<{ botId: string }>;
}
// GET endpoint to fetch tools available for a bot
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { botId } = await params;

    // Verify bot exists
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Get tools already installed for this bot
    const botTools = await prisma.botTool.findMany({
      where: { botId },
      include: { tool: true },
    });

    // Get all available tools from database (only public/admin tools)
    const dbTools = await prisma.tool.findMany({
      where: {
        isActive: true,
        createdByBotId: null, // Only show public/admin tools
      },
      include: { category: true },
    });

    // Map tools with installation status
    const tools = dbTools.map((dbTool) => {
      // Find if this tool is installed
      const installedTool = botTools.find((bt) => bt.toolId === dbTool.id);

      return {
        id: dbTool.id,
        name: dbTool.name,
        description: dbTool.description,
        type: dbTool.type,
        category: dbTool.category,
        installed: !!installedTool,
        enabled: installedTool ? installedTool.isEnabled : false,
        requiresAuth: !!dbTool.integrationType,
        hasCredentials: installedTool ? !!installedTool.credentialId : false,
      };
    });

    return NextResponse.json({ tools });
  } catch (error) {
    console.error("Error fetching tools:", error);
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 500 }
    );
  }
}

// POST endpoint to install a tool to a bot
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { botId } = await params;
    const { toolId, config = {} } = await req.json();

    // Verify tool exists
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    if (!tool.isActive) {
      return NextResponse.json(
        { error: "Tool is not active" },
        { status: 400 }
      );
    }

    // Verify bot exists
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Get tool definition from registry
    let toolDef = toolRegistry.get(toolId);

    // If not found in registry, check if it's a custom tool
    if (!toolDef && tool.type === "CUSTOM") {
      // Import here to avoid circular dependencies
      const { createCustomToolDefinition } = await import(
        "@/lib/tools/custom-tool"
      );

      toolDef = createCustomToolDefinition({
        id: tool.id,
        name: tool.name,
        description: tool.description || "",
        functions: tool.functions as Record<string, unknown>,
        functionsSchema: tool.functionsSchema as Record<string, unknown>,
        requiredConfigs: tool.requiredConfigs as Record<string, unknown>,
      });
    }

    if (!toolDef) {
      return NextResponse.json(
        { error: "Tool implementation not found" },
        { status: 500 }
      );
    }

    // Validate configuration against schema
    try {
      toolDef.configSchema.parse(config);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid configuration", details: error },
        { status: 400 }
      );
    }

    // Check if tool is already installed
    const existingBotTool = await prisma.botTool.findUnique({
      where: {
        botId_toolId: {
          botId,
          toolId,
        },
      },
    });

    let botTool;

    if (existingBotTool) {
      // Update existing bot tool
      botTool = await prisma.botTool.update({
        where: { id: existingBotTool.id },
        data: {
          config,
          isEnabled: true,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new bot tool
      botTool = await prisma.botTool.create({
        data: {
          botId,
          toolId,
          config,
          isEnabled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      botTool,
    });
  } catch (error) {
    console.error("Error installing tool:", error);
    return NextResponse.json(
      { error: "Failed to install tool" },
      { status: 500 }
    );
  }
}

// PATCH endpoint to enable/disable a tool
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { botId } = await params;
    const { toolId, enabled } = await req.json();

    // Check if the bot tool exists
    const botTool = await prisma.botTool.findUnique({
      where: {
        botId_toolId: {
          botId,
          toolId,
        },
      },
    });

    if (!botTool) {
      return NextResponse.json(
        { error: "Tool not installed on this bot" },
        { status: 404 }
      );
    }

    // Update the enabled status
    const updatedBotTool = await prisma.botTool.update({
      where: { id: botTool.id },
      data: {
        isEnabled: enabled,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      botTool: updatedBotTool,
    });
  } catch (error) {
    console.error("Error updating tool:", error);
    return NextResponse.json(
      { error: "Failed to update tool" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to uninstall a tool
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { botId } = await params;
    const { searchParams } = new URL(req.url);
    const toolId = searchParams.get("toolId");

    if (!toolId) {
      return NextResponse.json(
        { error: "Tool ID is required" },
        { status: 400 }
      );
    }

    // Check if the bot tool exists
    const botTool = await prisma.botTool.findUnique({
      where: {
        botId_toolId: {
          botId,
          toolId,
        },
      },
    });

    if (!botTool) {
      return NextResponse.json(
        { error: "Tool not installed on this bot" },
        { status: 404 }
      );
    }

    // Delete the bot tool
    await prisma.botTool.delete({
      where: { id: botTool.id },
    });

    return NextResponse.json({
      success: true,
      message: "Tool uninstalled successfully",
    });
  } catch (error) {
    console.error("Error uninstalling tool:", error);
    return NextResponse.json(
      { error: "Failed to uninstall tool" },
      { status: 500 }
    );
  }
}
