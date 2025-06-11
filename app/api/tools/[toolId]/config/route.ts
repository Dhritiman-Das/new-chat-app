import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { ToolType } from "@/lib/generated/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params;

    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: "User not authenticated" } },
        { status: 401 }
      );
    }

    // Fetch the custom tool and verify access
    const tool = await prisma.tool.findFirst({
      where: {
        id: toolId,
        type: ToolType.CUSTOM,
      },
      include: {
        botTools: {
          include: {
            bot: true,
          },
        },
      },
    });

    if (!tool) {
      return NextResponse.json(
        { success: false, error: { message: "Custom tool not found" } },
        { status: 404 }
      );
    }

    // Verify that the user has access to at least one bot using this tool
    const hasAccess = tool.botTools.some(
      (botTool) => botTool.bot.userId === session.user?.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { message: "Access denied" } },
        { status: 403 }
      );
    }

    // Extract configuration from the tool's requiredConfigs
    const config = tool.requiredConfigs as Record<string, unknown>;
    const functions = tool.functions as Record<string, unknown>;
    const executeConfig = functions?.execute as Record<string, unknown>;
    const parameters = executeConfig?.parameters as Array<
      Record<string, unknown>
    >;

    // Format the response
    const toolData = {
      id: tool.id,
      name: tool.name,
      description: tool.description || "",
      async: (config?.async as boolean) || false,
      strict: (config?.strict as boolean) || false,
      parameters: parameters || [],
      serverUrl: (config?.serverUrl as string) || "",
      secretToken: "••••••••••••••••••••", // Masked for security
      timeout: (config?.timeout as number) || 30,
      httpHeaders:
        (config?.httpHeaders as Array<{ name: string; value: string }>) || [],
      createdAt: tool.createdAt,
      updatedAt: tool.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: toolData,
    });
  } catch (error) {
    console.error("Error fetching tool config:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params;
    const body = await request.json();

    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: "User not authenticated" } },
        { status: 401 }
      );
    }

    // Fetch the existing tool to ensure it exists and user has access
    const existingTool = await prisma.tool.findUnique({
      where: {
        id: toolId,
        type: "CUSTOM",
      },
    });

    if (!existingTool) {
      return NextResponse.json(
        { success: false, error: { message: "Custom tool not found" } },
        { status: 404 }
      );
    }

    // Extract configuration from body
    const {
      name,
      description,
      async: isAsync,
      strict,
      parameters,
      serverUrl,
      secretToken,
      timeout,
      httpHeaders,
    } = body;

    // Create the updated functions object
    const functions = {
      execute: {
        name,
        description,
        async: isAsync,
        strict,
        parameters,
        schema: {
          type: "object" as const,
          properties: {} as Record<string, Record<string, unknown>>,
          required: [] as string[],
        },
      },
    };

    // Convert parameters to schema format
    if (parameters && Array.isArray(parameters)) {
      const schemaProperties: Record<string, Record<string, unknown>> = {};
      const requiredFields: string[] = [];

      for (const param of parameters) {
        if (param.name) {
          const property: Record<string, unknown> = {
            type: param.type,
            description: param.description || "",
          };

          if (param.enumValues && param.enumValues.length > 0) {
            property.enum = param.enumValues;
          }

          if (param.type === "array" && param.itemsType) {
            property.items = { type: param.itemsType };
          }

          schemaProperties[param.name] = property;

          if (param.required) {
            requiredFields.push(param.name);
          }
        }
      }

      functions.execute.schema = {
        type: "object",
        properties: schemaProperties,
        required: requiredFields,
      };
    }

    // Create the updated required configs
    const requiredConfigs = {
      serverUrl,
      secretToken,
      timeout: timeout || 30,
      httpHeaders: httpHeaders || [],
    };

    // Update the tool in the database
    const updatedTool = await prisma.tool.update({
      where: { id: toolId },
      data: {
        name,
        description,
        functions: JSON.parse(JSON.stringify(functions)),
        functionsSchema: JSON.parse(JSON.stringify(functions.execute.schema)),
        requiredConfigs: JSON.parse(JSON.stringify(requiredConfigs)),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedTool.id,
        message: "Custom tool updated successfully",
      },
    });
  } catch (error) {
    console.error("Error updating tool configuration:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
