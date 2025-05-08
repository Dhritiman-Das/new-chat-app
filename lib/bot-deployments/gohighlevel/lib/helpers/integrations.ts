import prisma from "@/lib/db/prisma";
import { $Enums } from "@/lib/generated/prisma";
import { gohighlevelConfig } from "../../config";

// Get active GoHighLevel integrations for a bot
export async function getActiveGoHighLevelIntegrations(botId: string) {
  const integrations = await prisma.integration.findMany({
    where: {
      botId,
      provider: "gohighlevel",
      connectionStatus: $Enums.ConnectionStatus.CONNECTED,
    },
    include: {
      credential: true,
      deployments: {
        where: {
          type: $Enums.DeploymentType.GOHIGHLEVEL,
        },
      },
    },
  });

  return integrations;
}

// Get available locations for a company/agency
export async function getAvailableLocations(token: string, companyId: string) {
  try {
    const response = await fetch(
      `${gohighlevelConfig.apiEndpoint}/oauth/installedLocations?companyId=${companyId}&appId=${gohighlevelConfig.clientId}&isInstalled=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: gohighlevelConfig.apiVersion,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get locations: ${await response.text()}`);
    }

    const data = await response.json();
    return data.locations || [];
  } catch (error) {
    console.error("Error fetching available locations:", error);
    return [];
  }
}
