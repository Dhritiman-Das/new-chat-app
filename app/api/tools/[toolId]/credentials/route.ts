import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

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

    // Get credentials from database
    const credentials = await prisma.toolCredential.findFirst({
      where: {
        userId,
        toolId,
        provider,
      },
    });

    if (!credentials) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    // Don't return the actual credentials for security reasons
    // Just let the client know that credentials exist
    return NextResponse.json({ exists: true }, { status: 200 });
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
      // First try to find an existing credential
      const existingCredential = await prisma.toolCredential.findFirst({
        where: {
          userId,
          toolId,
          provider,
        },
      });

      let result;

      if (existingCredential) {
        // Update existing credential
        result = await prisma.toolCredential.update({
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
        result = await prisma.toolCredential.create({
          data: {
            userId,
            toolId,
            provider,
            credentials: JSON.stringify(credentials),
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
