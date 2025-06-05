import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params;
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get("botId");

    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: "User not authenticated" } },
        { status: 401 }
      );
    }

    // Verify the tool exists and is a custom tool
    const tool = await prisma.tool.findUnique({
      where: {
        id: toolId,
        type: "CUSTOM",
      },
    });

    if (!tool) {
      return NextResponse.json(
        { success: false, error: { message: "Custom tool not found" } },
        { status: 404 }
      );
    }

    // If botId is provided, verify user has access to the bot
    if (botId) {
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId: session.user.id,
        },
      });

      if (!bot) {
        return NextResponse.json(
          {
            success: false,
            error: { message: "Bot not found or access denied" },
          },
          { status: 404 }
        );
      }
    }

    // Fetch tool executions
    const whereClause: {
      toolId: string;
      message?: {
        conversation: {
          botId: string;
        };
      };
    } = {
      toolId: toolId,
    };

    // If botId is provided, filter by bot
    if (botId) {
      whereClause.message = {
        conversation: {
          botId: botId,
        },
      };
    }

    const executions = await prisma.toolExecution.findMany({
      where: whereClause,
      include: {
        message: {
          include: {
            conversation: {
              select: {
                id: true,
                botId: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
      take: 100, // Limit to last 100 executions
    });

    // Format the response data
    const formattedExecutions = executions.map((execution) => ({
      id: execution.id,
      functionName: execution.functionName,
      params: execution.params as Record<string, unknown>,
      result: execution.result as Record<string, unknown> | null,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      executionTime: execution.executionTime,
      error: execution.error as Record<string, unknown> | null,
      conversationId: execution.conversationId,
    }));

    return NextResponse.json({
      success: true,
      data: formattedExecutions,
    });
  } catch (error) {
    console.error("Error fetching tool executions:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
