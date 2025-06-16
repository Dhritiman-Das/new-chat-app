import { NextRequest, NextResponse } from "next/server";
import { cleanupAbandonedSubscriptions } from "@/lib/payment/billing-service";

export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized (simple approach using a secret)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log("Starting abandoned subscription cleanup job...");

    const result = await cleanupAbandonedSubscriptions();

    console.log("Abandoned subscription cleanup completed:", result);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.cleanedUp} out of ${result.total} abandoned subscriptions`,
      cleanedUp: result.cleanedUp,
      total: result.total,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in cleanup cron job:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Allow POST requests as well for flexibility
  return GET(request);
}
