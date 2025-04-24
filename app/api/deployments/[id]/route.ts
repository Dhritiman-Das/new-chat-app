import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

interface Param {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Param) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing deployment ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Get the deployment to verify user has access
    const deployment = await prisma.deployment.findUnique({
      where: { id },
      include: {
        bot: {
          select: {
            userId: true,
            organizationId: true,
          },
        },
      },
    });

    if (!deployment) {
      return NextResponse.json(
        { success: false, message: "Deployment not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this deployment
    const canAccess = deployment.bot?.userId === session.user.id;

    if (!canAccess) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update the deployment with the new configuration
    const updatedDeployment = await prisma.deployment.update({
      where: { id },
      data: {
        config: body.config,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedDeployment,
    });
  } catch (error) {
    console.error("Error updating deployment:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update deployment",
      },
      { status: 500 }
    );
  }
}
