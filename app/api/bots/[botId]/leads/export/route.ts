import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

/**
 * Handler for exporting leads to CSV or JSON format
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  try {
    // Get botId from params
    const { botId } = params;

    // Get format from search params
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv";

    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Verify that the user has access to this bot
    const bot = await prisma.bot.findFirst({
      where: {
        id: botId,
        userId,
      },
    });

    if (!bot) {
      return NextResponse.json(
        { error: "Bot not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch all leads for this bot
    const leads = await prisma.lead.findMany({
      where: { botId },
      orderBy: { createdAt: "desc" },
    });

    // Transform leads to handle JSON properties
    const transformedLeads = leads.map((lead) => {
      // Extract properties from the JSONB field
      const properties = (lead.properties as Record<string, unknown>) || {};

      // Flatten the lead object with properties
      return {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: lead.source,
        status: lead.status,
        triggerKeyword: lead.triggerKeyword,
        createdAt: lead.createdAt.toISOString(),
        // Add all custom properties
        ...properties,
      };
    });

    // Generate export based on format
    if (format === "json") {
      // Return JSON data
      return NextResponse.json(transformedLeads);
    } else {
      // Create CSV content
      const headers = new Set<string>();

      // Collect all possible headers from all leads
      transformedLeads.forEach((lead) => {
        Object.keys(lead).forEach((key) => headers.add(key));
      });

      // Convert headers to array and sort
      const headerArray = Array.from(headers).sort();

      // Create CSV header row
      let csv = headerArray.join(",") + "\n";

      // Add data rows
      transformedLeads.forEach((lead) => {
        const row = headerArray.map((header) => {
          const value = lead[header as keyof typeof lead];
          // Handle different value types and escaping
          if (value === null || value === undefined) {
            return "";
          } else if (typeof value === "string") {
            // Escape quotes and wrap in quotes
            return `"${value.replace(/"/g, '""')}"`;
          } else {
            return String(value);
          }
        });
        csv += row.join(",") + "\n";
      });

      // Return CSV with appropriate headers
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="leads-${botId}-${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error("Error exporting leads:", error);
    return NextResponse.json(
      { error: "Failed to export leads" },
      { status: 500 }
    );
  }
}
