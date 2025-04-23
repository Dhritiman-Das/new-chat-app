import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { getCalendarsForCredential } from "@/lib/tools/google-calendar/services/credentials-service";

type Params = {
  params: Promise<{
    toolId: string;
  }>;
};

/**
 * GET handler to check if credentials exist for a specific tool and provider
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    const useNewCredentials = searchParams.get("useNewCredentials") === "true";
    const { toolId } = await params;

    if (!provider || !toolId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // If using new credentials, check BotTool to get credentialId
    if (useNewCredentials) {
      const botTool = await prisma.botTool.findFirst({
        where: {
          botId: toolId,
          tool: {
            integrationType: provider,
          },
        },
        include: {
          credential: true,
        },
      });

      if (!botTool?.credential) {
        // Check for direct credential
        const credential = await prisma.credential.findFirst({
          where: {
            userId,
            provider,
          },
        });

        if (!credential) {
          return NextResponse.json(
            { exists: false, success: true },
            { status: 200 }
          );
        }

        // Get any existing bot tool config
        const config = botTool?.config as
          | Record<string, string | number | boolean | null | undefined>
          | undefined;
        const defaultCalendarId = config?.defaultCalendarId as
          | string
          | undefined;

        return NextResponse.json({
          success: true,
          exists: true,
          data: {
            credentialId: credential.id,
            defaultCalendarId,
          },
        });
      }

      // Get defaultCalendarId from config if it exists
      const config = botTool?.config as
        | Record<string, string | number | boolean | null | undefined>
        | undefined;
      const defaultCalendarId = config?.defaultCalendarId as string | undefined;

      return NextResponse.json({
        success: true,
        exists: true,
        data: {
          credentialId: botTool.credential.id,
          defaultCalendarId,
        },
      });
    }

    // Using old method (for backward compatibility)
    const credentials = await prisma.credential.findFirst({
      where: {
        userId,
        provider,
      },
    });

    if (!credentials) {
      return NextResponse.json(
        { exists: false, success: true },
        { status: 200 }
      );
    }

    // For Google Calendar, fetch available calendars
    if (provider === "google") {
      try {
        // Get bot tool to fetch any existing config
        const botTool = await prisma.botTool.findFirst({
          where: {
            credentialId: credentials.id,
          },
        });

        // Get defaultCalendarId from config if it exists
        const config = botTool?.config as
          | Record<string, string | number | boolean | null | undefined>
          | undefined;
        const defaultCalendarId = config?.defaultCalendarId as
          | string
          | undefined;

        // Fetch the user's Google calendars
        const calendars = await getCalendarsForCredential(credentials.id);

        return NextResponse.json({
          success: true,
          exists: true,
          data: {
            calendars,
            defaultCalendarId,
          },
        });
      } catch (error) {
        console.error("Error fetching Google calendars:", error);
        // Still return credential exists but with error
        return NextResponse.json({
          success: true,
          exists: true,
          error: "Failed to fetch calendars",
        });
      }
    }

    // Don't return the actual credentials for security reasons
    // Just let the client know that credentials exist
    return NextResponse.json({ exists: true, success: true }, { status: 200 });
  } catch (error) {
    console.error("Error fetching credentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}

/**
 * POST handler to create or update credentials for a specific tool and provider
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { provider, credentials } = await request.json();
    const { toolId } = await params;

    if (!provider || !toolId || !credentials) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Create or update credentials in database
    try {
      // Try to find an existing credential using the new model
      const existingCredential = await prisma.credential.findFirst({
        where: {
          userId,
          provider,
        },
      });

      let result;

      if (existingCredential) {
        // Update existing credential
        result = await prisma.credential.update({
          where: {
            id: existingCredential.id,
          },
          data: {
            credentials: JSON.stringify(credentials),
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new credential
        result = await prisma.credential.create({
          data: {
            userId,
            provider,
            credentials: JSON.stringify(credentials),
          },
        });
      }

      // Update or create botTool relationship
      const existingBotTool = await prisma.botTool.findFirst({
        where: {
          botId: toolId,
          tool: {
            integrationType: provider,
          },
        },
      });

      if (existingBotTool) {
        await prisma.botTool.update({
          where: {
            id: existingBotTool.id,
          },
          data: {
            credentialId: result.id,
          },
        });
      }

      return NextResponse.json(
        {
          success: true,
          data: { id: result.id },
        },
        { status: 200 }
      );
    } catch (dbError) {
      console.error("Database error while saving credentials:", dbError);

      // Check for specific database errors
      if (
        dbError instanceof Error &&
        dbError.message.includes("Unique constraint")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Credential already exists for this user, tool, and provider",
          },
          { status: 409 } // Conflict
        );
      }

      throw dbError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error("Error saving credentials:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save credentials",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
