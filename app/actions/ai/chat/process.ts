import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { streamText, generateText, ToolSet, CoreMessage } from "ai";
import { ToolExecutionService, initializeTools } from "@/lib/tools";
import { prisma } from "@/lib/db/prisma";
import { getModelById } from "@/lib/models";
// import { format } from "date-fns";
import {
  addMessage,
  completeConversation,
  retrieveKnowledgeContext,
} from "@/app/actions/conversation-tracking";
import { DocumentReference, KnowledgeContext } from "@/app/actions/types";
import { getBotDetails } from "@/lib/queries/cached-queries";

// Initialize the tools and get tool services
const toolExecutionService = new ToolExecutionService();

export interface ChatProcessOptions {
  messages: CoreMessage[];
  conversationId?: string;
  modelId: string;
  botId: string;
  userId?: string; // Optional for unauthenticated requests
  organizationId?: string; // Optional for unauthenticated requests
  source?: string;
  useStreaming?: boolean; // Whether to use streamText or generateText
  webhookPayload?: Record<string, unknown>; // Webhook payload data for deployments
}

export interface ChatProcessResult {
  stream: ReadableStream<Uint8Array> | null;
  text: string | null;
  conversationId: string;
}

// Define usage type for clarity
interface UsageInfo {
  totalTokens: number;
  promptTokens?: number;
  completionTokens?: number;
}

// Define response messages type - using Record for flexibility to match any structure
type ResponseMessages = Record<string, unknown>[];

/**
 * Process a chat request with or without streaming
 */
export async function processChatRequest(
  options: ChatProcessOptions
): Promise<ChatProcessResult> {
  const {
    messages,
    conversationId: initialConversationId,
    modelId,
    botId,
    userId,
    organizationId,
    source = "playground",
    useStreaming = true,
    webhookPayload,
  } = options;

  let currentConversationId = initialConversationId;

  // Get the model
  const model = getModelById(modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  // Get bot details and enabled tools
  const botResponse = await getBotDetails(botId, true);
  const bot = botResponse.data;

  if (!bot) {
    throw new Error(`Bot not found: ${botId}`);
  }

  // Use provided userId/orgId or fallback to the bot's values
  const effectiveUserId = userId || bot.userId;
  const effectiveOrgId = organizationId || bot.organizationId;

  // Create or get conversation
  if (!currentConversationId) {
    try {
      // Create a new conversation
      const conversation = await prisma.conversation.create({
        data: {
          botId,
          metadata: {
            source,
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

  // Add user message to the conversation
  try {
    const userMessage =
      messages.length > 0 ? messages[messages.length - 1] : messages[0];
    if (userMessage && userMessage.role === "user" && currentConversationId) {
      await addMessage({
        conversationId: currentConversationId,
        role: "USER",
        content: userMessage.content.toString(),
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
          lastUserMessage.content.toString(),
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
        console.error("Error retrieving context from vector database:", error);
        // Continue without context if there's an error
      }
    }
  }

  // Create enabled tools for the bot
  const enabledTools: Record<string, unknown> = {};
  const { toolRegistry } = initializeTools();
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
        parameters: func.parameters,
        execute: async (params: Record<string, unknown>) => {
          // Execute the tool through the execution service
          return toolExecutionService.executeTool(
            botTool.tool.id,
            functionName,
            params,
            {
              userId: effectiveUserId,
              botId,
              organizationId: effectiveOrgId,
              conversationId: currentConversationId,
              webhookPayload: webhookPayload,
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

  const timeContext = `The current date and time is ${new Date().toISOString()}.`;

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
    throw new Error(`Provider not supported: ${model.provider}`);
  }

  // Track when processing starts
  const startProcessingTime = Date.now();

  // Create the handler for when generation finishes
  const handleFinish = (
    text: string,
    usage: UsageInfo,
    responseMessages: ResponseMessages
  ) => {
    // Create the simplified knowledge context
    const knowledgeContext: KnowledgeContext = {
      documents: usedDocuments,
      hasKnowledgeContext: usedDocuments.length > 0,
    };

    // Calculate processing time in milliseconds (capped at 30 seconds to stay within INT4)
    const processingTimeMs = Math.min(30000, Date.now() - startProcessingTime);

    // Save conversation and tool calls/results here
    if (currentConversationId) {
      addMessage({
        role: "ASSISTANT",
        content: text,
        conversationId: currentConversationId,
        responseMessages: responseMessages,
        tokenCount: usage?.totalTokens || 0,
        contextUsed: knowledgeContext as unknown as Record<string, unknown>,
        processingTime: processingTimeMs,
      });
    }

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
  };

  // Choose between streaming and non-streaming based on option
  if (useStreaming) {
    // Stream the AI response
    const response = streamText({
      model: aiModel,
      system: systemMessage,
      messages: messages as CoreMessage[],
      tools: hasTools ? (enabledTools as ToolSet) : undefined,
      maxSteps: 5, // Allow multiple tool calls if needed
      onFinish({ response, usage, text }) {
        handleFinish(
          text,
          usage,
          JSON.parse(JSON.stringify(response.messages))
        );
      },
    });

    return {
      stream: response.toDataStreamResponse().body,
      text: null,
      conversationId: currentConversationId || "",
    };
  } else {
    // Generate text without streaming
    const response = await generateText({
      model: aiModel,
      system: systemMessage,
      messages: messages as CoreMessage[],
      tools: hasTools ? (enabledTools as ToolSet) : undefined,
      maxSteps: 5, // Allow multiple tool calls if needed
    });

    // Handle the completion
    handleFinish(response.text, response.usage, response.response.messages);

    return {
      stream: null,
      text: response.text,
      conversationId: currentConversationId || "",
    };
  }
}
