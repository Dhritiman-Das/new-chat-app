import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const excludeOrgId = searchParams.get("excludeOrgId") || undefined;

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    // Check if slug is available
    const existingOrg = await prisma.organization.findFirst({
      where: {
        slug,
        ...(excludeOrgId ? { id: { not: excludeOrgId } } : {}),
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      available: !existingOrg,
      slug,
    });
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 }
    );
  }
}
