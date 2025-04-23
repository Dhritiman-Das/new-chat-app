import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { createOrUpdateSlackDeployment } from "@/app/(protected)/(sidebar)/dashboard/[orgId]/bots/[botId]/deployments/slack/utils";

interface Params {
  params: Promise<{ integrationId: string }>;
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { integrationId } = await params;
    const { config, deployment } = await req.json();

    // First, fetch the integration to verify ownership and get the botId
    const integration = await prisma.integration.findUnique({
      where: {
        id: integrationId,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Update the integration config
    const updatedIntegration = await prisma.integration.update({
      where: {
        id: integrationId,
      },
      data: {
        config,
      },
    });

    // Update or create the deployment with channels
    if (deployment.channels) {
      await createOrUpdateSlackDeployment(
        integration.botId,
        integrationId,
        deployment.channels,
        deployment.globalSettings
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedIntegration,
    });
  } catch (error) {
    console.error("Error updating Slack settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
