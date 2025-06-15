import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;

    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: "User not authenticated" } },
        { status: 401 }
      );
    }

    // Fetch the tool execution
    const execution = await prisma.toolExecution.findUnique({
      where: { id: executionId },
      include: {
        conversation: {
          include: {
            bot: {
              select: {
                id: true,
                userId: true,
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!execution) {
      return NextResponse.json(
        { success: false, error: { message: "Tool execution not found" } },
        { status: 404 }
      );
    }

    // Verify user has access to this execution (through bot ownership)
    if (execution.conversation?.bot?.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { message: "Access denied" } },
        { status: 403 }
      );
    }

    // Format the response data
    const executionData = {
      id: execution.id,
      toolId: execution.toolId,
      functionName: execution.functionName,
      params: execution.params as Record<string, unknown>,
      result: execution.result as Record<string, unknown> | null,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      executionTime: execution.executionTime,
      error: execution.error as Record<string, unknown> | null,
      conversationId: execution.conversationId,
      messageId: execution.messageId,
    };

    return NextResponse.json({
      success: true,
      data: executionData,
    });
  } catch (error) {
    console.error("Error fetching tool execution:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
