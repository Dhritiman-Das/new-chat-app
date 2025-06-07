import { z } from "zod";
import axios, { AxiosRequestConfig } from "axios";
import { ToolDefinition, ToolFunction } from "../definitions/tool-interface";
// Utils import removed - not needed for simplified implementation
import React from "react";
import { Icons } from "@/components/icons";

// Custom tool configuration schema
const customToolConfigSchema = z.object({
  async: z.boolean().default(false),
  strict: z.boolean().default(false),
  serverUrl: z.string().url(),
  secretToken: z.string(),
  timeout: z.number().min(1).max(300).default(30),
  httpHeaders: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
      })
    )
    .default([]),
});

// Execute function for custom tools
const executeCustomTool: ToolFunction = {
  description: "Execute custom tool via HTTP request",
  parameters: z.object({}).passthrough(), // Allow any parameters
  execute: async (params, context) => {
    try {
      if (!context.config) {
        throw new Error("Custom tool configuration is missing");
      }

      const config = customToolConfigSchema.parse(context.config);

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.secretToken}`,
        "User-Agent": "ChatBot-CustomTool/1.0",
      };

      // Add custom headers
      for (const header of config.httpHeaders) {
        headers[header.name] = header.value;
      }

      // Prepare request payload
      const payload = {
        parameters: params,
        context: {
          botId: context.botId,
          userId: context.userId,
          organizationId: context.organizationId,
          conversationId: context.conversationId,
          webhookPayload: context.webhookPayload,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };

      // Prepare axios config
      const axiosConfig: AxiosRequestConfig = {
        method: "POST",
        url: config.serverUrl,
        headers,
        data: payload,
        timeout: config.timeout * 1000, // Convert to milliseconds
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      };

      // Make the HTTP request
      const response = await axios(axiosConfig);

      // Handle different response status codes
      if (response.status >= 400) {
        return {
          success: false,
          error: {
            code: "HTTP_ERROR",
            message: `HTTP ${response.status}: ${response.statusText}`,
            details: response.data,
          },
        };
      }

      // Return the response from the custom tool
      return {
        success: true,
        data: response.data,
        metadata: {
          httpStatus: response.status,
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      console.error("Custom tool execution error:", error);

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: {
            code: "NETWORK_ERROR",
            message: error.message,
            details: {
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
            },
          },
        };
      }

      return {
        success: false,
        error: {
          code: "EXECUTION_ERROR",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      };
    }
  },
};

// Create a custom tool definition from database data
export function createCustomToolDefinition(toolData: {
  id: string;
  name: string;
  description: string;
  functions?: Record<string, unknown>;
  functionsSchema?: Record<string, unknown>;
  requiredConfigs?: Record<string, unknown>;
}): ToolDefinition {
  // Get the function config from the database
  const functionConfig =
    (toolData.functions as Record<string, unknown>)?.execute || {};

  // Convert the stored schema to a Zod schema
  let parametersSchema = z.object({});

  if (functionConfig && typeof functionConfig === "object") {
    const funcConfig = functionConfig as Record<string, unknown>;

    // Check if we have the schema property (JSON schema format)
    if (funcConfig.schema && typeof funcConfig.schema === "object") {
      const schema = funcConfig.schema as Record<string, unknown>;

      if (schema.properties && typeof schema.properties === "object") {
        const properties = schema.properties as Record<string, unknown>;
        const required = (schema.required as string[]) || [];

        const schemaProperties: Record<string, z.ZodType> = {};

        for (const [propName, propDef] of Object.entries(properties)) {
          if (typeof propDef === "object" && propDef !== null) {
            const prop = propDef as Record<string, unknown>;
            let propSchema: z.ZodType;

            switch (prop.type) {
              case "string":
                propSchema = z.string();
                break;
              case "number":
                propSchema = z.number();
                break;
              case "boolean":
                propSchema = z.boolean();
                break;
              case "object":
                propSchema = z.record(z.unknown());
                break;
              case "array":
                propSchema = z.array(z.unknown());
                break;
              default:
                propSchema = z.unknown();
            }

            // Add description if available
            if (prop.description && typeof prop.description === "string") {
              propSchema = propSchema.describe(prop.description);
            }

            // Make optional if not required
            if (!required.includes(propName)) {
              propSchema = propSchema.optional();
            }

            schemaProperties[propName] = propSchema;
          }
        }

        parametersSchema = z.object(schemaProperties);
      }
    }
    // Fallback to parameters array format if schema property doesn't exist
    else if (funcConfig.parameters && Array.isArray(funcConfig.parameters)) {
      const parameters = funcConfig.parameters as Array<
        Record<string, unknown>
      >;
      const schemaProperties: Record<string, z.ZodType> = {};

      for (const param of parameters) {
        if (param.name && typeof param.name === "string") {
          let propSchema: z.ZodType;

          switch (param.type) {
            case "string":
              propSchema = z.string();
              break;
            case "number":
              propSchema = z.number();
              break;
            case "boolean":
              propSchema = z.boolean();
              break;
            case "object":
              propSchema = z.record(z.unknown());
              break;
            case "array":
              propSchema = z.array(z.unknown());
              break;
            default:
              propSchema = z.unknown();
          }

          // Add description if available
          if (param.description && typeof param.description === "string") {
            propSchema = propSchema.describe(param.description);
          }

          // Make optional if not required
          if (!param.required) {
            propSchema = propSchema.optional();
          }

          schemaProperties[param.name] = propSchema;
        }
      }

      parametersSchema = z.object(schemaProperties);
    }
  }

  return {
    id: toolData.id,
    name: toolData.name,
    description: toolData.description || `Custom tool: ${toolData.name}`,
    type: "CUSTOM",
    version: "1.0.0",
    icon: <Icons.Settings className="w-[32px] h-[32px]" />,
    configSchema: customToolConfigSchema,
    functions: {
      execute: {
        ...executeCustomTool,
        description:
          ((functionConfig as Record<string, unknown>)
            ?.description as string) || `Execute ${toolData.name}`,
        parameters: parametersSchema,
      },
    },
    getCredentialSchema: () => z.object({}), // Custom tools don't use credentials
    defaultConfig: toolData.requiredConfigs || {},
  };
}

// Export for use in the registry
export const customToolTemplate: ToolDefinition = {
  id: "custom-tool-template",
  name: "Custom Tool Template",
  description: "Template for custom HTTP-based tools",
  type: "CUSTOM",
  version: "1.0.0",
  icon: <Icons.Settings className="w-[32px] h-[32px]" />,
  configSchema: customToolConfigSchema,
  functions: {
    execute: executeCustomTool,
  },
  getCredentialSchema: () => z.object({}),
  defaultConfig: {
    async: false,
    strict: false,
    timeout: 30,
    httpHeaders: [],
  },
};
