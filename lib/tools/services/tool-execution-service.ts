import { toolRegistry } from "../registry";
import { ToolContext } from "../definitions/tool-interface";
import { prisma } from "@/lib/db/prisma";
import { toolCredentialsService } from "./credentials-service";
import { InputJsonValue } from "@/lib/generated/prisma/runtime/library";

export class ToolExecutionService {
  async executeTool(
    toolId: string,
    functionName: string,
    params: Record<string, unknown>,
    context: Omit<ToolContext, "credentialId" | "config" | "credentials">
  ) {
    try {
      // Get the tool definition
      const tool = toolRegistry.get(toolId);
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

      // Log tool usage
      await this.logToolUsage(toolId, context.botId, functionName);

      // Execute the function with the context
      const result = await func.execute(params, {
        ...context,
        credentialId: credentialId || undefined,
        config:
          (botTool?.config as Record<string, unknown>) ||
          tool.defaultConfig ||
          {},
        credentials: credentials as Record<string, unknown>,
      });

      return result;
    } catch (error) {
      console.error(`Error executing tool ${toolId}:${functionName}:`, error);

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
