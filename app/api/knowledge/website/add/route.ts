import { NextRequest, NextResponse } from "next/server";
import { processAndStoreWebsite } from "@/lib/websource-service";
import { requireAuth } from "@/utils/auth";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth();

    // Parse the request body
    const body = await request.json();
    const { url, isDomain, crawlLimit, botId, orgId, knowledgeBaseId } = body;

    if (!url || botId === undefined || !orgId || !knowledgeBaseId) {
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

    // Process and store the website
    const options = isDomain ? { limit: crawlLimit || 50 } : undefined;

    const result = await processAndStoreWebsite(
      {
        url,
        isDomain: Boolean(isDomain),
        botId,
        orgId,
        knowledgeBaseId,
      },
      options
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        websiteId: result.websiteId,
        pagesProcessed: result.pagesProcessed,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROCESSING_ERROR",
            message: result.error || "Failed to process website",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API error in website source add:", error);
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
