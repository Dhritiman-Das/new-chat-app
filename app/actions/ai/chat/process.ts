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
import {
  hasEnoughCredits,
  processModelCreditUsage,
} from "@/lib/payment/credit-service";
import { withSubscriptionCheck } from "@/lib/auth/check-subscription-access";
import { SubscriptionStatus, ToolType } from "@/lib/generated/prisma";
import { redis } from "@/lib/db/kv";

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

// Redis-based conversation locking functions
async function acquireConversationLock(
  conversationId: string
): Promise<boolean> {
  try {
    // Try to set a lock with 60 second expiration (auto-cleanup)
    // NX means "only set if not exists" - atomic operation
    const result = await redis.set(
      `conversation_lock:${conversationId}`,
      "processing",
      {
        ex: 60, // 60 seconds TTL
        nx: true, // Only set if key doesn't exist
      }
    );

    return result === "OK";
  } catch (error) {
    console.error("Error acquiring conversation lock:", error);
    return false;
  }
}

async function releaseConversationLock(conversationId: string): Promise<void> {
  try {
    await redis.del(`conversation_lock:${conversationId}`);
  } catch (error) {
    console.error("Error releasing conversation lock:", error);
  }
}

async function waitForConversationLock(conversationId: string): Promise<void> {
  const maxAttempts = 30; // 30 seconds max wait
  let attempts = 0;

  while (attempts < maxAttempts) {
    const lockExists = await redis.exists(
      `conversation_lock:${conversationId}`
    );

    if (!lockExists) {
      return; // Lock is not held, we can proceed
    }

    // Wait 1 second before checking again
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }

  // If we get here, we've waited too long - force release the lock
  console.warn(`Conversation ${conversationId} lock timeout, forcing release`);
  await releaseConversationLock(conversationId);
}

/**
 * Process a chat request with or without streaming
 */
export async function processChatRequest(
  options: ChatProcessOptions
): Promise<ChatProcessResult> {
  const {
    messages,
    conversationId: initialConversationId,
    modelId: requestedModelId,
    botId,
    userId,
    organizationId,
    source = "playground",
    useStreaming = true,
    webhookPayload,
  } = options;

  // Get bot details early to determine organization ID
  const botResponse = await getBotDetails(botId, true);
  const bot = botResponse.data;

  if (!bot) {
    throw new Error(`Bot not found: ${botId}`);
  }

  // Use provided organizationId or fallback to the bot's value
  const effectiveOrgId = organizationId || bot.organizationId;
  const effectiveUserId = userId || bot.userId;

  // Determine which model to use - requested model or bot's default if available
  const defaultModelId = bot.defaultModelId;
  const modelId = requestedModelId || defaultModelId || "gpt-4o"; // Fallback to a default model if none specified

  // Wrap the entire chat processing with subscription check
  const result = await withSubscriptionCheck(
    effectiveOrgId,
    async () => {
      // Get the model
      const model = getModelById(modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      // Check if the organization has enough credits for this model
      const hasCredits = await hasEnoughCredits(effectiveOrgId, modelId);
      if (!hasCredits) {
        throw new Error(`Insufficient credits for using model: ${modelId}`);
      }

      let currentConversationId = initialConversationId;

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

      // Wait for any existing conversation processing to complete and acquire lock
      if (currentConversationId) {
        try {
          // First wait for any existing processing to complete
          await waitForConversationLock(currentConversationId);

          // Then try to acquire the lock for our processing
          const lockAcquired = await acquireConversationLock(
            currentConversationId
          );
          if (!lockAcquired) {
            throw new Error("Could not acquire conversation lock");
          }
        } catch (error) {
          console.error("Error with conversation lock:", error);
          // Continue processing even if lock fails, but this might cause race conditions
        }
      }

      // Add user message to the conversation
      try {
        const userMessage =
          messages.length > 0 ? messages[messages.length - 1] : messages[0];
        if (
          userMessage &&
          userMessage.role === "user" &&
          currentConversationId
        ) {
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
      const { toolRegistry } = await initializeTools();
      // Process enabled tools
      for (const botTool of bot.botTools) {
        // Skip tools that aren't active globally
        if (!botTool.tool.isActive) continue;

        // Get tool definition from the registry
        let toolDef = toolRegistry.get(botTool.tool.id);

        // If not found in registry and it's a custom tool, create it dynamically
        if (!toolDef && botTool.tool.type === "CUSTOM") {
          const { createCustomToolDefinition } = await import(
            "@/lib/tools/custom-tool"
          );

          toolDef = createCustomToolDefinition({
            id: botTool.tool.id,
            name: botTool.tool.name,
            description: botTool.tool.description || "",
            functions: botTool.tool.functions as Record<string, unknown>,
            functionsSchema: botTool.tool.functionsSchema as Record<
              string,
              unknown
            >,
            requiredConfigs: botTool.tool.requiredConfigs as Record<
              string,
              unknown
            >,
          });
        }

        if (!toolDef) continue;

        // Add each function from the tool
        for (const [functionName, func] of Object.entries(toolDef.functions)) {
          // For custom tools, use the function name from the config, otherwise use the standard format
          let toolKey: string;
          if (botTool.tool.type === ToolType.CUSTOM) {
            // Get the function name from the stored function config
            const functionConfig = (
              botTool.tool.functions as Record<string, unknown>
            )?.execute as Record<string, unknown>;
            const customFunctionName = functionConfig?.name as string;
            toolKey = customFunctionName || functionName;
          } else {
            toolKey = `${botTool.tool.id}_${functionName}`;
          }

          enabledTools[toolKey] = {
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
      const handleFinish = async (
        text: string,
        usage: UsageInfo,
        responseMessages: ResponseMessages
      ) => {
        // Process credit usage for this model request
        await processModelCreditUsage(effectiveOrgId, modelId, {
          botId,
          userId: effectiveUserId,
          conversationId: currentConversationId,
          tokenCount: usage?.totalTokens || 0,
          source,
        });

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
        if (currentConversationId) {
          await addMessage({
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

      // Create a promise to track the completion of this conversation processing
      let completionPromise: Promise<void> = Promise.resolve();

      // Choose between streaming and non-streaming based on option
      if (useStreaming) {
        // Create a promise that will be resolved when onFinish is called
        let resolveCompletion: () => void;
        completionPromise = new Promise<void>((resolve) => {
          resolveCompletion = resolve;
        });

        // Stream the AI response
        const response = streamText({
          model: aiModel,
          system: systemMessage,
          messages: messages as CoreMessage[],
          tools: hasTools ? (enabledTools as ToolSet) : undefined,
          maxSteps: 5, // Allow multiple tool calls if needed
          onFinish({ response, usage, text }) {
            // Handle the completion asynchronously
            handleFinish(
              text,
              usage,
              JSON.parse(JSON.stringify(response.messages))
            ).finally(() => {
              resolveCompletion();
            });
          },
        });

        // Clean up the lock after completion
        if (currentConversationId) {
          completionPromise.finally(() => {
            releaseConversationLock(currentConversationId!);
          });
        }

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

        // Handle the completion and wait for it
        completionPromise = handleFinish(
          response.text,
          response.usage,
          response.response.messages
        );

        // Clean up the lock after completion
        if (currentConversationId) {
          completionPromise.finally(() => {
            releaseConversationLock(currentConversationId!);
          });
        }

        // Wait for the message to be saved before returning
        await completionPromise;

        return {
          stream: null,
          text: response.text,
          conversationId: currentConversationId || "",
        };
      }
    },
    // Allow both active and trialing subscriptions to use this feature
    { allowStatuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] }
  );

  // Handle subscription check failure
  if ("error" in result && "redirectUrl" in result) {
    throw new Error(`Subscription required: ${result.error}`);
  }

  return result;
}
