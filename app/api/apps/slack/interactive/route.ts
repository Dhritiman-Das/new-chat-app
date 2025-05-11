import { createSlackClientFromAuth } from "@/lib/bot-deployments/slack";
import prisma from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Slack sends form-encoded payloads for interactive components
    const formData = await request.formData();
    const payload = formData.get("payload");

    if (!payload || typeof payload !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const data = JSON.parse(payload);

    // Handle different types of interactions
    const { type, team, actions, channel } = data;

    // Find integration for this team
    const integration = await prisma.integration.findFirst({
      where: {
        provider: "slack",
        metadata: {
          path: ["team_id"],
          equals: team.id,
        },
      },
      include: {
        credential: true,
        bot: true,
      },
    });

    if (!integration || !integration.credential) {
      console.error("No integration found for Slack team", team.id);
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Create client
    const slackClient = await createSlackClientFromAuth(
      integration.bot.userId,
      integration.credentialId || undefined,
      integration.botId
    );

    // Handle different interaction types
    if (type === "block_actions") {
      // Get the first action
      const action = actions[0];

      if (action) {
        // This is an example of how to handle a button click
        if (action.type === "button") {
          const actionId = action.action_id;
          const value = action.value;

          // Handle different button actions
          if (actionId === "example_button") {
            // Process the button click
            await slackClient.sendMessage(
              channel.id,
              `You clicked a button with value: ${value}`
            );
          }
        }
      }
    } else if (type === "view_submission") {
      // Handle modal submissions
      const { view } = data;
      const viewId = view.id;
      const values = view.state.values;

      // Process the submitted values
      console.log("Modal submission:", viewId, values);

      // Example of how to acknowledge the submission
      return NextResponse.json({ response_action: "clear" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Slack interaction:", error);
    return NextResponse.json(
      { error: "Failed to process Slack interaction" },
      { status: 500 }
    );
  }
}
