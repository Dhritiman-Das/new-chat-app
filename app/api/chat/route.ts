import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { streamText, ToolSet } from "ai";
import { toolRegistry, ToolExecutionService } from "@/lib/tools";
import { prisma } from "@/lib/db/prisma";
import { initializeTools } from "@/lib/tools";
import { getModelById } from "@/lib/models";
import { format } from "date-fns";
import {
  addMessage,
  completeConversation,
  retrieveKnowledgeContext,
} from "@/app/actions/conversation-tracking";
import { DocumentReference, KnowledgeContext } from "@/app/actions/types";
import {
  getBotDetails,
  getIframeConfigForBot,
} from "@/lib/queries/cached-queries";

// Initialize the tools and get tool services
initializeTools();
const toolExecutionService = new ToolExecutionService();

// Function to add CORS headers for iframe
function addCorsHeaders(
  headers: Headers,
  source?: string,
  botId?: string
): Headers {
  if (source === "iframe" && botId) {
    // Get deployment settings to check allowed domains
    getIframeConfigForBot(botId)
      .then((response) => {
        if (response.success && response.data) {
          const config = response.data as Record<string, unknown>;
          if (config?.allowedDomains) {
            // In a real scenario, you would set the header based on the referrer and allowed domains
            // For simplicity, we're allowing all domains for now
            headers.set("Access-Control-Allow-Origin", "*");
          }
        }
      })
      .catch(() => {
        // If any error, default to restrictive CORS
        headers.set("Access-Control-Allow-Origin", "*"); // Change this in production
      });
  } else {
    // For internal usage, set to the same origin
    headers.set("Access-Control-Allow-Origin", "*"); // Change this in production
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return headers;
}

export async function OPTIONS(req: NextRequest) {
  const headers = new Headers();
  const url = new URL(req.url);
  const source = url.searchParams.get("source");
  const botId = url.searchParams.get("botId");

  return new NextResponse(null, {
    status: 204,
    headers: addCorsHeaders(headers, source || undefined, botId || undefined),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId } = await req.json();
    const url = new URL(req.url);
    const modelId = url.searchParams.get("model") || "gpt-4o";
    const botId = url.searchParams.get("botId");
    const source = url.searchParams.get("source") || "playground";
    let currentConversationId = conversationId;

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
    const botResponse = await getBotDetails(botId);
    const bot = botResponse.data;

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Use real user and organization IDs in production
    const userId = bot.userId;
    const organizationId = bot.organizationId;

    // Create or get conversation
    if (!currentConversationId) {
      try {
        // Create a new conversation
        const conversation = await prisma.conversation.create({
          data: {
            botId,
            metadata: {
              source,
              userAgent: req.headers.get("user-agent") || "unknown",
              referrer: req.headers.get("referer") || "unknown",
            },
            source: source || "playground",
          },
        });

        currentConversationId = conversation.id;
      } catch (error) {
        console.error("Error creating conversation:", error);
        // Continue even if conversation tracking fails
      }
    }

    // Add user message to the conversation in all cases
    try {
      const userMessage = messages[messages.length - 1];
      if (userMessage && userMessage.role === "user") {
        await addMessage({
          conversationId: currentConversationId,
          role: "USER",
          content: userMessage.content,
          responseMessages: [],
          contextUsed: {},
          processingTime: 0,
          tokenCount: 0,
        });
      }
    } catch (error) {
      console.error("Error adding user message:", error);
      // Continue even if message tracking fails
    }

    // Retrieve context from knowledge base if there are any
    let contextualInfo = "";
    const usedDocuments: DocumentReference[] = [];

    if (bot.knowledgeBases && bot.knowledgeBases.length > 0) {
      // Get the last user message for context retrieval
      const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === "user");

      if (lastUserMessage && lastUserMessage.content) {
        try {
          const contextResult = await retrieveKnowledgeContext(
            botId,
            lastUserMessage.content,
            5
          );

          if (contextResult.success && contextResult.data) {
            usedDocuments.push(...contextResult.data.usedDocuments);

            if (contextResult.data.contextualInfo) {
              contextualInfo =
                "### Relevant information from knowledge base:\n\n" +
                contextResult.data.contextualInfo +
                "\n\n";
            }
          }
        } catch (error) {
          console.error(
            "Error retrieving context from vector database:",
            error
          );
          // Continue without context if there's an error
        }
      }
    }

    // Create enabled tools for the bot
    const enabledTools: Record<string, unknown> = {};

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
                conversationId: currentConversationId,
              }
            );
          },
        };
      }
    }

    // Generate system message
    let systemMessage = bot.systemPrompt || "You are a helpful AI assistant.";
    // Must run tool in every message according to the `enabledTools`
    const toolsWithExecutionConditions: string[] = [];
    if (enabledTools["lead-capture_detectTriggerKeyword"]) {
      toolsWithExecutionConditions.push(
        "Run the `lead-capture_detectTriggerKeyword` tool in every message. And if it returns `{detected: true}`, then run the `lead-capture_requestLeadInfo` tool. Once you have collected all the information, run the `lead-capture_saveLead` tool."
      );
    }

    const toolsWithExecutionConditionsPretty =
      toolsWithExecutionConditions.join("\n\n");
    // Add contextual information if available
    if (contextualInfo) {
      systemMessage = `${systemMessage}\n\n${contextualInfo}`;
    }

    const timeContext = `The current date and time is ${new Date().toLocaleString()}. Today's DD/MM/YYYY is ${format(
      new Date(),
      "dd/MM/yyyy"
    )}.`;

    // Add special instructions for iframe mode
    let behaviorContext = `The responses should be concise and to the point. Refrain from sending links. Should the responses be in a rich text format (like **example**)? => False.`;

    if (source === "iframe") {
      behaviorContext += `\n\nYou are being displayed in an iframe on a website. Keep responses concise, professional, and focused on providing value to the website visitor.`;
    }

    systemMessage += [
      toolsWithExecutionConditionsPretty,
      timeContext,
      behaviorContext,
    ].join("\n\n");

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
    const startProcessingTime = Date.now(); // Track when processing starts

    const response = streamText({
      model: aiModel,
      system: systemMessage,
      messages,
      tools: hasTools ? (enabledTools as ToolSet) : undefined,
      maxSteps: 5, // Allow multiple tool calls if needed,
      onFinish({ response, usage, text }) {
        // Create the simplified knowledge context
        const knowledgeContext: KnowledgeContext = {
          documents: usedDocuments,
          hasKnowledgeContext: usedDocuments.length > 0,
        };

        // Calculate processing time in milliseconds (capped at 30 seconds to stay within INT4)
        const processingTimeMs = Math.min(
          30000,
          Date.now() - startProcessingTime
        );

        // Save conversation and tool calls/results here
        addMessage({
          role: "ASSISTANT",
          content: text,
          conversationId: currentConversationId,
          responseMessages: JSON.parse(JSON.stringify(response.messages)),
          tokenCount: usage.totalTokens,
          contextUsed: knowledgeContext as unknown as Record<string, unknown>,
          processingTime: processingTimeMs,
        });
      },
    });

    // Record the completion in a background process
    if (currentConversationId) {
      setTimeout(async () => {
        try {
          // Mark conversation as completed
          await completeConversation(currentConversationId!);
        } catch (error) {
          console.error("Error updating conversation completion:", error);
        }
      }, 5000); // Wait 5 seconds to complete
    }

    // Return streaming response with conversation ID and CORS headers
    const streamResponse = response.toDataStreamResponse();

    const headers = new Headers(streamResponse.headers);
    headers.set("X-Conversation-ID", currentConversationId || "");

    // Add CORS headers if needed
    addCorsHeaders(headers, source, botId);

    return new NextResponse(streamResponse.body, {
      status: 200,
      statusText: streamResponse.statusText,
      headers,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    // Add CORS headers to error response too
    const headers = new Headers();
    const url = new URL(req.url);
    const source = url.searchParams.get("source");
    const botId = url.searchParams.get("botId");

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: addCorsHeaders(
          headers,
          source || undefined,
          botId || undefined
        ),
      }
    );
  }
}
