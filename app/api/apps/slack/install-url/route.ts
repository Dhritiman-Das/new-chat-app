import { auth } from "@/lib/auth";
import { slackConfig } from "@/lib/bot-deployments/slack/config";
import prisma from "@/lib/db/prisma";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// Generate a secure state parameter for OAuth flow
const generateStateParam = (metadata: Record<string, string>) => {
  const state = randomBytes(16).toString("hex");
  return { state, metadata: JSON.stringify(metadata) };
};

// Store the state in the database for verification later
const storeState = async (userId: string, state: string, metadata: string) => {
  // Store the state with TTL (e.g., 10 minutes)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  await prisma.oAuthState.create({
    data: {
      state,
      userId,
      metadata,
      expiresAt,
    },
  });

  return { state, metadata, expiresAt };
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "User not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const requestUrl = new URL(request.url);
    const providedState = requestUrl.searchParams.get("state");

    // If a state is provided, validate it
    if (providedState) {
      const stateRecord = await prisma.oAuthState.findUnique({
        where: { state: providedState },
      });

      if (stateRecord && stateRecord.userId === session.user.id) {
        // Use the existing state
        const scopes = [
          "chat:write",
          "channels:read",
          "incoming-webhook",
          "users:read",
          "assistant:write",
        ].join(",");

        const url = `https://slack.com/oauth/v2/authorize?client_id=${
          slackConfig.clientId
        }&scope=${scopes}&redirect_uri=${encodeURIComponent(
          slackConfig.redirectUri
        )}&state=${providedState}`;

        return NextResponse.json({ url });
      }
    }

    // If no valid state was provided, create a new one
    // Get user info and organization for metadata
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organizations: {
          include: {
            organization: true,
          },
          take: 1,
        },
      },
    });

    if (!user || !user.organizations[0]) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "User or organization not found" },
        },
        { status: 404 }
      );
    }

    const organizationId = user.organizations[0].organizationId;

    // Create state parameter with metadata
    const { state, metadata } = generateStateParam({
      userId: session.user.id,
      organizationId,
    });

    // Store state for verification
    await storeState(session.user.id, state, metadata);

    // Generate Slack OAuth URL
    const scopes = [
      "chat:write",
      "channels:read",
      "incoming-webhook",
      "users:read",
      "assistant:write",
    ].join(",");

    const url = `https://slack.com/oauth/v2/authorize?client_id=${
      slackConfig.clientId
    }&scope=${scopes}&redirect_uri=${encodeURIComponent(
      slackConfig.redirectUri
    )}&state=${state}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error generating Slack install URL:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Failed to generate installation URL" },
      },
      { status: 500 }
    );
  }
}
