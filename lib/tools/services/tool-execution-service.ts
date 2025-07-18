import { toolRegistry } from "../registry";
import { ToolContext } from "../definitions/tool-interface";
import { prisma } from "@/lib/db/prisma";
import { toolCredentialsService } from "./credentials-service";
import { InputJsonValue } from "@/lib/generated/prisma/runtime/library";
import { createCustomToolDefinition } from "../custom-tool";
import { ExecutionStatus, ToolType } from "@/lib/generated/prisma";

export class ToolExecutionService {
  async executeTool(
    toolId: string,
    functionName: string,
    params: Record<string, unknown>,
    context: Omit<ToolContext, "credentialId" | "config" | "credentials"> & {
      messageId?: string;
    }
  ) {
    const startTime = new Date();
    let executionId: string | null = null;

    try {
      // Get the tool definition
      let tool = toolRegistry.get(toolId);

      // If tool not found in registry, check if it's a custom tool in the database
      if (!tool) {
        let customTool = null;

        // If we have a botId, check bot access for custom tools
        if (context.botId) {
          // Allow access to tools that are either public (createdByBotId: null)
          // or created by the same bot
          customTool = await prisma.tool.findFirst({
            where: {
              id: toolId,
              type: "CUSTOM",
              OR: [
                { createdByBotId: null }, // Public tools
                { createdByBotId: context.botId }, // Bot-specific tools
              ],
            },
          });
        } else {
          // If no botId, only allow access to public custom tools
          customTool = await prisma.tool.findFirst({
            where: {
              id: toolId,
              type: "CUSTOM",
              createdByBotId: null,
            },
          });
        }

        if (customTool) {
          tool = createCustomToolDefinition({
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
        }
      }

      if (!tool) {
        throw new Error(`Tool not found: ${toolId}`);
      }

      // Check if tool is active (from database)
      const toolRecord = await prisma.tool.findUnique({
        where: { id: toolId },
        select: { isActive: true },
      });

      if (toolRecord && !toolRecord.isActive) {
        throw new Error(`Tool is not active: ${toolId}`);
      }

      // Get the function
      const func = tool.functions[functionName];
      if (!func) {
        throw new Error(`Function not found: ${functionName}`);
      }

      // Get bot tool configuration if we have a botId
      const botTool = context.botId
        ? await prisma.botTool.findUnique({
            where: {
              botId_toolId: {
                botId: context.botId,
                toolId,
              },
            },
          })
        : null;

      // Check if tool is enabled for this bot
      if (botTool && !botTool.isEnabled) {
        return {
          success: false,
          skipped: true,
          error: {
            code: "TOOL_DISABLED",
            message: `Tool is disabled for this bot. ToolId: ${toolId}, BotId: ${context.botId}`,
          },
        };
      }

      // Get tool credential if needed
      const credentialId = botTool?.credentialId;
      let credentials = null;

      if (tool.integrationType && !credentialId) {
        // Tool requires authentication but no credentials provided
        throw new Error(`Tool requires authentication: ${toolId}`);
      }

      if (credentialId) {
        const credential = await toolCredentialsService.getCredential(
          credentialId
        );

        if (!credential) {
          throw new Error(`Credentials not found: ${credentialId}`);
        }

        credentials = credential.credentials;
      }

      // Get tool configuration
      const config =
        (botTool?.config as Record<string, unknown>) ||
        tool.defaultConfig ||
        {};

      // Strict validation for custom tools
      if (tool.type === ToolType.CUSTOM && config.strict === true) {
        try {
          // Validate parameters against the function's schema
          if (func.parameters) {
            const validationResult = func.parameters.safeParse(params);
            if (!validationResult.success) {
              const errorDetails = validationResult.error.issues.map(
                (issue) => ({
                  path: issue.path.join("."),
                  message: issue.message,
                  expected: issue.code,
                })
              );

              return {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Parameter validation failed in strict mode",
                  details: errorDetails,
                },
              };
            }
            // Use validated params for execution
            params = validationResult.data;
          }
        } catch (validationError) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Strict validation failed: ${
                (validationError as Error).message
              }`,
            },
          };
        }
      }

      // Check if this is an async custom tool
      const isAsyncTool =
        tool.type === ToolType.CUSTOM && config.async === true;

      // Track execution start for custom tools (if we have conversation context)
      if (tool.type === ToolType.CUSTOM && context.conversationId) {
        try {
          const execution = await prisma.toolExecution.create({
            data: {
              messageId: context.messageId || null,
              conversationId: context.conversationId,
              toolId,
              functionName: tool.name,
              params: params as InputJsonValue,
              status: ExecutionStatus.IN_PROGRESS,
              startTime,
            },
          });
          executionId = execution.id;
        } catch (error) {
          console.error("Failed to create tool execution record:", error);
          // Continue execution even if tracking fails
        }
      }

      // Log tool usage
      await this.logToolUsage(toolId, context.botId, functionName);

      // For async tools, handle execution differently
      if (isAsyncTool) {
        // Start async execution without waiting
        this.executeToolAsync(
          func,
          params,
          {
            ...context,
            credentialId: credentialId || undefined,
            config,
            credentials: credentials as Record<string, unknown>,
          },
          executionId,
          toolId,
          context.botId,
          functionName,
          startTime
        );

        // Return immediate response for async tools
        return {
          success: true,
          async: true,
          status: "processing",
          message: "Tool execution started asynchronously",
          executionId,
        };
      }

      // Execute the function synchronously for non-async tools
      const result = await func.execute(params, {
        ...context,
        credentialId: credentialId || undefined,
        config,
        credentials: credentials as Record<string, unknown>,
      });

      // Update execution record with success result for custom tools
      if (executionId && tool.type === ToolType.CUSTOM) {
        const endTime = new Date();
        const executionTime = endTime.getTime() - startTime.getTime();

        try {
          // Type-safe handling of the result
          const typedResult = result as {
            success?: boolean;
            error?: Record<string, unknown>;
          };

          await prisma.toolExecution.update({
            where: { id: executionId },
            data: {
              result: result as Record<string, unknown> as InputJsonValue,
              status: typedResult?.success
                ? ExecutionStatus.COMPLETED
                : ExecutionStatus.FAILED,
              endTime,
              executionTime,
              error: typedResult?.success
                ? undefined
                : (typedResult?.error as InputJsonValue),
            },
          });
        } catch (error) {
          console.error("Failed to update tool execution record:", error);
        }
      }

      return result;
    } catch (error) {
      console.error(`Error executing tool ${toolId}:${functionName}:`, error);

      // Update execution record with error for custom tools
      if (executionId) {
        const endTime = new Date();
        const executionTime = endTime.getTime() - startTime.getTime();

        try {
          await prisma.toolExecution.update({
            where: { id: executionId },
            data: {
              status: ExecutionStatus.FAILED,
              endTime,
              executionTime,
              error: {
                code: "EXECUTION_FAILED",
                message: (error as Error).message || "Tool execution failed",
                stack: (error as Error).stack,
              } as InputJsonValue,
            },
          });
        } catch (updateError) {
          console.error(
            "Failed to update tool execution record with error:",
            updateError
          );
        }
      }

      // Log the error
      await this.logToolError(
        toolId,
        context.botId,
        functionName,
        error as Error,
        params
      );

      // Return standardized error response
      return {
        success: false,
        error: {
          code: "EXECUTION_FAILED",
          message: (error as Error).message || "Tool execution failed",
        },
      };
    }
  }

  // New method to handle async tool execution
  private async executeToolAsync(
    func: {
      execute: (
        params: Record<string, unknown>,
        context: ToolContext
      ) => Promise<unknown>;
    },
    params: Record<string, unknown>,
    context: ToolContext,
    executionId: string | null,
    toolId: string,
    botId: string,
    functionName: string,
    startTime: Date
  ) {
    try {
      // Execute the function asynchronously
      const result = await func.execute(params, context);

      // Update execution record with success result
      if (executionId) {
        const endTime = new Date();
        const executionTime = endTime.getTime() - startTime.getTime();

        try {
          const typedResult = result as {
            success?: boolean;
            error?: Record<string, unknown>;
          };

          await prisma.toolExecution.update({
            where: { id: executionId },
            data: {
              result: result as Record<string, unknown> as InputJsonValue,
              status: typedResult?.success
                ? ExecutionStatus.COMPLETED
                : ExecutionStatus.FAILED,
              endTime,
              executionTime,
              error: typedResult?.success
                ? undefined
                : (typedResult?.error as InputJsonValue),
            },
          });
        } catch (error) {
          console.error("Failed to update async tool execution record:", error);
        }
      }

      // TODO: Consider adding webhook or real-time notification here
      // to notify the client when async execution completes
      console.log(
        `Async tool execution completed for ${toolId}:${functionName}`
      );
    } catch (error) {
      console.error(
        `Error in async tool execution ${toolId}:${functionName}:`,
        error
      );

      // Update execution record with error
      if (executionId) {
        const endTime = new Date();
        const executionTime = endTime.getTime() - startTime.getTime();

        try {
          await prisma.toolExecution.update({
            where: { id: executionId },
            data: {
              status: ExecutionStatus.FAILED,
              endTime,
              executionTime,
              error: {
                code: "ASYNC_EXECUTION_FAILED",
                message:
                  (error as Error).message || "Async tool execution failed",
                stack: (error as Error).stack,
              } as InputJsonValue,
            },
          });
        } catch (updateError) {
          console.error(
            "Failed to update async tool execution record with error:",
            updateError
          );
        }
      }

      // Log the error
      await this.logToolError(
        toolId,
        botId,
        functionName,
        error as Error,
        params
      );
    }
  }

  // Helper to log tool usage
  private async logToolUsage(
    toolId: string,
    botId: string,
    functionId: string
  ) {
    try {
      await prisma.toolUsageMetric.upsert({
        where: {
          toolId_botId_functionId: {
            toolId,
            botId,
            functionId,
          },
        },
        update: {
          count: { increment: 1 },
          lastUsed: new Date(),
        },
        create: {
          toolId,
          botId,
          functionId,
          count: 1,
          lastUsed: new Date(),
        },
      });
    } catch (error) {
      console.error("Failed to log tool usage:", error);
      // Non-critical error, so we don't throw
    }
  }

  // Helper to log tool errors
  private async logToolError(
    toolId: string,
    botId: string | undefined,
    functionName: string,
    error: Error,
    params: Record<string, unknown>
  ) {
    try {
      await prisma.toolExecutionError.create({
        data: {
          toolId,
          botId,
          functionName,
          errorMessage: error.message || "Unknown error",
          errorStack: error.stack,
          params: params as InputJsonValue,
          createdAt: new Date(),
        },
      });
    } catch (logError) {
      console.error("Failed to log tool error:", logError);
      // Non-critical error, so we don't throw
    }
  }
}
