import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { streamText, ToolSet } from "ai";
import { toolRegistry, ToolExecutionService } from "@/lib/tools";
import { prisma } from "@/lib/db/prisma";
import { initializeTools } from "@/lib/tools";
import { getModelById } from "@/lib/models";
import { format } from "date-fns";

// Initialize the tools and get tool services
initializeTools();
const toolExecutionService = new ToolExecutionService();

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const url = new URL(req.url);
    const modelId = url.searchParams.get("model");
    const botId = url.searchParams.get("botId");

    if (!modelId) {
      return NextResponse.json(
        { error: "Model ID is required" },
        { status: 400 }
      );
    }

    if (!botId) {
      return NextResponse.json(
        { error: "Bot ID is required" },
        { status: 400 }
      );
    }

    // Get the model
    const model = getModelById(modelId);
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Get bot details and enabled tools
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: {
        botTools: {
          where: { isEnabled: true },
          include: { tool: true },
        },
      },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Create enabled tools for the bot
    const enabledTools: Record<string, unknown> = {};

    // Use real user and organization IDs in production
    const userId = bot.userId;
    const organizationId = bot.organizationId;

    // Process enabled tools
    for (const botTool of bot.botTools) {
      // Skip tools that aren't active globally
      if (!botTool.tool.isActive) continue;

      // Get tool definition from the registry
      const toolDef = toolRegistry.get(botTool.tool.id);
      if (!toolDef) continue;

      // Add each function from the tool
      for (const [functionName, func] of Object.entries(toolDef.functions)) {
        enabledTools[`${botTool.tool.id}_${functionName}`] = {
          description: func.description,
          parameters: func.parameters, // Zod schema will be handled appropriately by the AI SDK
          execute: async (params: Record<string, unknown>) => {
            // Execute the tool through the execution service
            return toolExecutionService.executeTool(
              botTool.tool.id,
              functionName,
              params,
              {
                userId,
                botId,
                organizationId,
              }
            );
          },
        };
      }
    }
    console.log("enabledTools", enabledTools);
    // Generate system message
    let systemMessage = bot.systemPrompt || "You are a helpful AI assistant.";
    const timeContext = `The current date and time is ${new Date().toLocaleString()}. Today's DD/MM/YYYY is ${format(
      new Date(),
      "dd/MM/yyyy"
    )}.`;
    const behaviorContext = `The responses should be concise and to the point. Refrain from sending links. Should the responses be in a rich text format (like **example**)? => False.`;
    systemMessage += [timeContext, behaviorContext].join("\n\n");
    // Check if we have any tools to use
    const hasTools = Object.keys(enabledTools).length > 0;

    // Initialize the right AI model based on provider
    let aiModel;
    if (model.provider === "xai") {
      aiModel = xai(model.id);
    } else if (model.provider === "openai") {
      aiModel = openai(model.id);
    } else {
      return NextResponse.json(
        { error: "Provider not supported" },
        { status: 400 }
      );
    }

    // Stream the AI response with tools
    const result = streamText({
      model: aiModel,
      system: systemMessage,
      messages,
      tools: hasTools ? (enabledTools as ToolSet) : undefined,
      maxSteps: 5, // Allow multiple tool calls if needed
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
