import { NextResponse } from "next/server";
import { getSession } from "@/utils/auth";
import prisma from "@/lib/db/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: templateId } = await params;

    // Increment usage count for the template
    await prisma.template.update({
      where: { id: templateId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Usage count incremented",
    });
  } catch (error) {
    console.error("Error incrementing template usage:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
