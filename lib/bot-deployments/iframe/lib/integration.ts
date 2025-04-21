import { prisma } from "@/lib/db/prisma";
import { InputJsonValue } from "@/lib/generated/prisma/runtime/library";

// Define a simplified interface for the config here to avoid circular dependency
interface IframeConfig {
  theme: Record<string, string>;
  messages: Record<string, string>;
  avatar: Record<string, unknown>;
  layout: Record<string, unknown>;
  branding: Record<string, unknown>;
  features: Record<string, boolean>;
}

export async function createOrUpdateIframeDeployment(
  botId: string,
  iframeConfig: Partial<IframeConfig>
) {
  try {
    // Check if there's an existing deployment
    let deployment = await prisma.deployment.findFirst({
      where: {
        botId: botId,
        type: "WEBSITE",
      },
    });

    // If no deployment exists, create one
    if (!deployment) {
      deployment = await prisma.deployment.create({
        data: {
          botId: botId,
          type: "WEBSITE",
          status: "ACTIVE",
          config: iframeConfig as InputJsonValue,
        },
      });
      return { success: true, data: deployment };
    }

    // Update the existing deployment
    deployment = await prisma.deployment.update({
      where: {
        id: deployment.id,
      },
      data: {
        config: iframeConfig as InputJsonValue,
        status: "ACTIVE",
      },
    });

    return { success: true, data: deployment };
  } catch (error) {
    console.error("Error creating or updating iframe deployment:", error);
    return { success: false, error };
  }
}

export async function getIframeDeployment(botId: string) {
  try {
    // Get the deployment
    const deployment = await prisma.deployment.findFirst({
      where: {
        botId: botId,
        type: "WEBSITE",
      },
    });

    if (!deployment) {
      return { success: false, error: "No iframe deployment found" };
    }

    return { success: true, data: deployment };
  } catch (error) {
    console.error("Error getting iframe deployment:", error);
    return { success: false, error };
  }
}
