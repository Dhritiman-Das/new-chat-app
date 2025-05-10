import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/db/prisma";
import { getAuthUrl } from "@/lib/auth/config/providers-config";
import { auth } from "@/lib/auth";

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

    // Get the authorization URL from the auth module
    const authUrl = getAuthUrl("gohighlevel", state);

    // Return the URL
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("Error generating GoHighLevel install URL:", error);
    return NextResponse.json(
      { error: "Failed to generate install URL" },
      { status: 500 }
    );
  }
}
