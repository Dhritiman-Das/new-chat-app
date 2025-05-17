import { NextRequest, NextResponse } from "next/server";
import { deleteWebsiteSource } from "@/lib/websource-service";
import { requireAuth } from "@/utils/auth";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth();

    // Parse the request body
    const body = await request.json();
    const { websiteId, botId, orgId, knowledgeBaseId } = body;

    if (!websiteId || !botId || !orgId || !knowledgeBaseId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: "Missing required fields",
          },
        },
        { status: 400 }
      );
    }

    // Delete the website source
    const result = await deleteWebsiteSource(websiteId, botId, knowledgeBaseId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          success: true,
          message: "Website source deleted successfully",
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DELETION_ERROR",
            message: result.error || "Failed to delete website source",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API error in website source delete:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
