import { NextRequest, NextResponse } from "next/server";
import { processAndStoreWebsite } from "@/lib/websource-service";
import { requireAuth } from "@/utils/auth";
import {
  withWebsiteLinkCheck,
  trackWebsiteLinkUsage,
  WebsiteLinkErrorResponse,
} from "@/lib/payment/website-limit-service";

// Website processing result type
interface WebsiteProcessingResult {
  success: boolean;
  websiteId?: string;
  error?: string;
  pagesProcessed?: number;
}

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

    // Calculate the number of links that will be used
    // For single page scraping, this is 1. For domain crawling, use the crawl limit
    const linksToUse = isDomain ? crawlLimit || 50 : 1;

    // Process with website link limit check
    const result = await withWebsiteLinkCheck<WebsiteProcessingResult>(
      orgId,
      linksToUse,
      async () => {
        // Process and store the website
        const options = isDomain ? { limit: crawlLimit || 50 } : undefined;

        const processingResult = await processAndStoreWebsite(
          {
            url,
            isDomain: Boolean(isDomain),
            botId,
            orgId,
            knowledgeBaseId,
          },
          options
        );

        // If processing was successful, track the usage
        if (processingResult.success) {
          // Use the actual number of pages processed for more accurate tracking
          const actualPagesProcessed =
            processingResult.pagesProcessed || linksToUse;

          await trackWebsiteLinkUsage(orgId, actualPagesProcessed, {
            botId,
            knowledgeBaseId,
            url,
            isDomain: Boolean(isDomain),
            requestedAt: new Date().toISOString(),
          });
        }

        return processingResult;
      }
    );

    // Handle limit check errors
    if ("code" in result && !result.success) {
      const errorResponse = result as WebsiteLinkErrorResponse;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: errorResponse.code,
            message: errorResponse.error,
          },
        },
        { status: 403 }
      );
    }

    // Handle successful processing
    const processingResult = result as WebsiteProcessingResult;
    if (processingResult.success) {
      return NextResponse.json({
        success: true,
        websiteId: processingResult.websiteId,
        pagesProcessed: processingResult.pagesProcessed,
      });
    } else {
      // Handle other processing errors
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROCESSING_ERROR",
            message: processingResult.error || "Failed to process website",
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
