import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

interface Params {
  params: Promise<{ integrationId: string }>;
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { integrationId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, fetch the integration to verify ownership
    const integration = await prisma.integration.findUnique({
      where: {
        id: integrationId,
      },
      include: {
        deployments: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Delete associated deployments first
    if (integration.deployments.length > 0) {
      await prisma.deployment.deleteMany({
        where: {
          integrationId,
        },
      });
    }

    // Now delete the integration
    await prisma.integration.delete({
      where: {
        id: integrationId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Integration and related deployments removed successfully",
    });
  } catch (error) {
    console.error("Error deleting integration:", error);
    return NextResponse.json(
      { error: "Failed to delete integration" },
      { status: 500 }
    );
  }
}
