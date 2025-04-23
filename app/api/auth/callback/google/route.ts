import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

// Google OAuth token response type
interface GoogleOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

/**
 * Google OAuth callback handler
 * This receives the authorization code from Google and exchanges it for tokens
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle errors from Google
  if (error) {
    console.error("Google auth error:", error);
    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/error?message=Authentication failed: ${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/error?message=Invalid authentication response`
    );
  }

  // Verify the state parameter matches what we stored to prevent CSRF attacks
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  if (!storedState || storedState !== state) {
    console.error("State mismatch: potential CSRF attack");
    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/error?message=Invalid authentication state`
    );
  }

  try {
    // Get the stored tool ID and bot ID
    const paramsJson = cookieStore.get("oauth_params")?.value;
    if (!paramsJson) {
      throw new Error("Missing OAuth parameters");
    }

    const { toolId, botId, orgId } = JSON.parse(paramsJson);

    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const userId = session.user.id;

    // Verify user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(
        "User not found in database. Please ensure your account is properly set up."
      );
    }

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token exchange error:", errorData);
      throw new Error(`Failed to exchange token: ${errorData.error}`);
    }

    const tokens: GoogleOAuthTokenResponse = await tokenResponse.json();

    // Calculate expiry time for reference (not stored in DB)
    const expiryDate = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Check if there's an existing credential
    const existingCredential = await prisma.credential.findFirst({
      where: {
        userId,
        provider: "google",
      },
    });

    let credentialId: string;

    // Store or update the credentials in the database
    if (existingCredential) {
      // Safely extract the existing refresh token if needed
      const existingCreds = existingCredential.credentials as Record<
        string,
        unknown
      >;
      const existingRefreshToken = existingCreds.refresh_token as
        | string
        | undefined;

      await prisma.credential.update({
        where: {
          id: existingCredential.id,
        },
        data: {
          credentials: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || existingRefreshToken,
            token_type: tokens.token_type,
            scope: tokens.scope,
            expiry_date: expiryDate,
          },
        },
      });

      credentialId = existingCredential.id;
    } else {
      try {
        const newCredential = await prisma.credential.create({
          data: {
            userId,
            provider: "google",
            credentials: {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_type: tokens.token_type,
              scope: tokens.scope,
              expiry_date: expiryDate,
            },
          },
        });

        credentialId = newCredential.id;
      } catch (createError) {
        console.error("Error creating credential:", createError);
        throw new Error(
          `Failed to store Google credentials: ${
            createError instanceof Error ? createError.message : "Unknown error"
          }`
        );
      }
    }

    // Update the BotTool record with the credential ID
    try {
      // First find if botTool exists
      const existingBotTool = await prisma.botTool.findUnique({
        where: {
          botId_toolId: {
            botId,
            toolId,
          },
        },
      });

      if (existingBotTool) {
        // Update existing record
        await prisma.botTool.update({
          where: {
            botId_toolId: {
              botId,
              toolId,
            },
          },
          data: {
            credentialId,
          },
        });
      } else {
        // Create new record
        await prisma.botTool.create({
          data: {
            botId,
            toolId,
            credentialId,
            isEnabled: true,
          },
        });
      }
    } catch (updateError) {
      console.error("Error updating BotTool with credential ID:", updateError);
      // We continue even if this fails - the credentials are still stored
    }

    // Clear the OAuth cookies
    cookieStore.set("oauth_state", "", { maxAge: 0 });
    cookieStore.set("oauth_params", "", { maxAge: 0 });

    // Set a cookie to indicate successful connection (for UX purposes)
    cookieStore.set("google_connection_success", "true", {
      maxAge: 30, // 30 seconds is enough for the page to reload and read it
      path: "/",
    });

    // Redirect back to the bot settings page
    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/dashboard/${orgId}/bots/${botId}/tools/google-calendar?connected=true&toolId=${toolId}`
    );
  } catch (error) {
    console.error("Error processing OAuth callback:", error);
    const cookieStore = await cookies();
    // Clean up cookies on error
    cookieStore.set("oauth_state", "", { maxAge: 0 });
    cookieStore.set("oauth_params", "", { maxAge: 0 });

    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/error?message=Authentication failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
