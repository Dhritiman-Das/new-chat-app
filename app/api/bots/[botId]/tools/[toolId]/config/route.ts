import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

interface Params {
  params: Promise<{ botId: string; toolId: string }>;
}

/**
 * GET handler to retrieve the configuration for a specific bot tool
 */
export async function GET(request: Request, { params }: Params) {
  try {
    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: "User not authenticated" } },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { botId, toolId } = await params;

    // Verify that the user has access to this bot
    const bot = await prisma.bot.findFirst({
      where: {
        id: botId,
        userId,
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

    // Find the existing bot tool
    const botTool = await prisma.botTool.findFirst({
      where: {
        botId,
        toolId,
      },
    });

    if (!botTool) {
      return NextResponse.json({ success: true, config: null });
    }

    return NextResponse.json({
      success: true,
      config: botTool.config || null,
    });
  } catch (error) {
    console.error("Error retrieving bot tool config:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Failed to retrieve configuration",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: "User not authenticated" } },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { botId, toolId } = await params;

    // Verify that the user has access to this bot
    const bot = await prisma.bot.findFirst({
      where: {
        id: botId,
        userId,
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

    // Get the request body for the configuration update
    const config = await request.json();

    // Find the existing bot tool
    const botTool = await prisma.botTool.findFirst({
      where: {
        botId,
        toolId,
      },
    });

    if (botTool) {
      // Update the existing bot tool
      await prisma.botTool.update({
        where: {
          id: botTool.id,
        },
        data: {
          config,
        },
      });
    } else {
      // Create a new bot tool
      await prisma.botTool.create({
        data: {
          botId,
          toolId,
          config,
          isEnabled: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating bot tool config:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Failed to update configuration",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
