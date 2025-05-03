import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/db/prisma";
import { gohighlevelConfig } from "@/lib/bot-deployments/gohighlevel/config";
import { auth } from "@/lib/auth";

// Required scopes for our application
const requiredScopes = [
  "conversations.readonly",
  "conversations.write",
  "conversations/message.readonly",
  "conversations/message.write",
  "contacts.readonly",
  "locations.readonly",
];

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const url = new URL(request.url);

    // Check if state was provided in the request
    let state = url.searchParams.get("state");

    // If no state was provided, create a new one
    if (!state) {
      state = uuidv4();

      // Store the state in the database
      await prisma.oAuthState.create({
        data: {
          state,
          userId,
          metadata: JSON.stringify({
            provider: "gohighlevel",
            redirectUrl: "/integrations",
          }),
          expiresAt: new Date(Date.now() + 3600 * 1000), // Expires in 1 hour
        },
      });
    }

    // Set up the auth URL
    const authUrl = new URL(
      "https://marketplace.gohighlevel.com/oauth/chooselocation"
    );
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("redirect_uri", gohighlevelConfig.redirectUri);
    authUrl.searchParams.append("client_id", gohighlevelConfig.clientId);
    authUrl.searchParams.append("scope", requiredScopes.join(" "));
    authUrl.searchParams.append("state", state);

    // Return the URL
    return NextResponse.json({ url: authUrl.toString() });
  } catch (error) {
    console.error("Error generating GoHighLevel install URL:", error);
    return NextResponse.json(
      { error: "Failed to generate install URL" },
      { status: 500 }
    );
  }
}
