import { z } from "zod";
import { CustomToolParameter } from "./schema";

/**
 * Generate a Zod schema from custom tool parameters
 */
export function generateZodSchemaFromParameters(
  parameters: CustomToolParameter[]
): Record<string, unknown> {
  const schemaProperties: Record<string, z.ZodType> = {};

  for (const param of parameters) {
    let paramSchema: z.ZodType;

    switch (param.type) {
      case "string":
        paramSchema = z.string();
        if (param.enumValues && param.enumValues.length > 0) {
          paramSchema = z.enum(param.enumValues as [string, ...string[]]);
        }
        break;
      case "number":
        paramSchema = z.number();
        break;
      case "boolean":
        paramSchema = z.boolean();
        break;
      case "object":
        paramSchema = z.record(z.unknown());
        break;
      case "array":
        let itemSchema: z.ZodType = z.unknown();
        if (param.itemsType) {
          switch (param.itemsType) {
            case "string":
              itemSchema = z.string();
              break;
            case "number":
              itemSchema = z.number();
              break;
            case "boolean":
              itemSchema = z.boolean();
              break;
            case "object":
              itemSchema = z.record(z.unknown());
              break;
          }
        }
        paramSchema = z.array(itemSchema);
        break;
      default:
        paramSchema = z.unknown();
    }

    // Add description if provided
    if (param.description) {
      paramSchema = paramSchema.describe(param.description);
    }

    // Make optional if not required
    if (!param.required) {
      paramSchema = paramSchema.optional();
    }

    schemaProperties[param.name] = paramSchema;
  }

  return {
    type: "object",
    properties: schemaProperties,
    required: parameters.filter((p) => p.required).map((p) => p.name),
  };
}

/**
 * Convert custom tool parameters to OpenAI function schema format
 */
export function convertParametersToOpenAISchema(
  parameters: CustomToolParameter[]
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of parameters) {
    const property: Record<string, unknown> = {
      type: param.type === "array" ? "array" : param.type,
    };

    if (param.description) {
      property.description = param.description;
    }

    if (
      param.type === "string" &&
      param.enumValues &&
      param.enumValues.length > 0
    ) {
      property.enum = param.enumValues;
    }

    if (param.type === "array" && param.itemsType) {
      property.items = {
        type: param.itemsType,
      };
    }

    properties[param.name] = property;

    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: "object",
    properties,
    required,
  };
}
