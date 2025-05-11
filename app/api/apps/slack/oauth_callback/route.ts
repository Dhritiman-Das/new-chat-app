import { NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { slackConfig } from "@/lib/bot-deployments/slack/config";
import prisma from "@/lib/db/prisma";
import { $Enums } from "@/lib/generated/prisma";
import { getSlackIntegrationForBot } from "@/app/(protected)/(sidebar)/dashboard/[orgId]/bots/[botId]/deployments/slack/utils";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Handle errors from Slack OAuth
    if (error) {
      const htmlResponse = `
        <html>
          <head>
            <title>Slack Connection Failed</title>
            <script>
              window.opener.postMessage('app_oauth_failed', '*');
              window.close();
            </script>
          </head>
          <body>
            <h1>Connection Failed</h1>
            <p>Error connecting to Slack: ${error}</p>
          </body>
        </html>
      `;
      return new NextResponse(htmlResponse, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    // Validate state and code
    if (!code || !state) {
      const htmlResponse = `
        <html>
          <head>
            <title>Slack Connection Failed</title>
            <script>
              window.opener.postMessage('app_oauth_failed', '*');
              window.close();
            </script>
          </head>
          <body>
            <h1>Connection Failed</h1>
            <p>Missing required parameters</p>
          </body>
        </html>
      `;
      return new NextResponse(htmlResponse, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    // Find the state
    const oauthState = await prisma.oAuthState.findUnique({
      where: { state },
    });

    if (!oauthState) {
      const htmlResponse = `
        <html>
          <head>
            <title>Slack Connection Failed</title>
            <script>
              window.opener.postMessage('app_oauth_failed', '*');
              window.close();
            </script>
          </head>
          <body>
            <h1>Connection Failed</h1>
            <p>Invalid or expired state</p>
          </body>
        </html>
      `;
      return new NextResponse(htmlResponse, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    // Exchange the code for a token
    const client = new WebClient();
    const response = await client.oauth.v2.access({
      client_id: slackConfig.clientId,
      client_secret: slackConfig.clientSecret,
      code,
      redirect_uri: slackConfig.redirectUri,
    });

    if (!response.ok) {
      const htmlResponse = `
        <html>
          <head>
            <title>Slack Connection Failed</title>
            <script>
              window.opener.postMessage('app_oauth_failed', '*');
              window.close();
            </script>
          </head>
          <body>
            <h1>Connection Failed</h1>
            <p>Failed to exchange code for token</p>
          </body>
        </html>
      `;
      return new NextResponse(htmlResponse, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    // Parse the metadata
    let metadata: {
      botId: string;
      orgId: string;
      provider: string;
      isAddingChannel?: boolean;
      integrationId?: string | null;
    };
    try {
      metadata = JSON.parse(oauthState.metadata);
    } catch {
      const htmlResponse = `
        <html>
          <head>
            <title>Slack Connection Failed</title>
            <script>
              window.opener.postMessage('app_oauth_failed', '*');
              window.close();
            </script>
          </head>
          <body>
            <h1>Connection Failed</h1>
            <p>Invalid metadata format</p>
          </body>
        </html>
      `;
      return new NextResponse(htmlResponse, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    // Get bot name for credential name
    const bot = await prisma.bot.findUnique({
      where: { id: metadata.botId },
      select: { name: true },
    });

    const credentialName = bot ? `Slack for ${bot.name}` : `Slack Integration`;

    // Check for existing credential for this bot
    const existingCredential = await prisma.credential.findFirst({
      where: {
        botId: metadata.botId,
        provider: "slack",
      },
    });

    // Store or update the credentials in the database
    let credential;

    if (existingCredential) {
      // Update existing credential
      credential = await prisma.credential.update({
        where: {
          id: existingCredential.id,
        },
        data: {
          name: credentialName,
          credentials: {
            access_token: response.access_token,
            team_id: response.team?.id,
            team_name: response.team?.name,
            scope: response.scope,
            expires_at: null, // Slack tokens don't expire by default
          },
        },
      });
    } else {
      // Create new credential
      credential = await prisma.credential.create({
        data: {
          userId: oauthState.userId,
          provider: "slack",
          name: credentialName,
          botId: metadata.botId,
          credentials: {
            access_token: response.access_token,
            team_id: response.team?.id,
            team_name: response.team?.name,
            scope: response.scope,
            expires_at: null, // Slack tokens don't expire by default
          },
        },
      });
    }

    // Handle the case where we're adding a new channel to an existing integration
    if (metadata.isAddingChannel && metadata.integrationId) {
      // Find the integration with its deployments
      const integration = await prisma.integration.findUnique({
        where: { id: metadata.integrationId },
        include: {
          deployments: {
            where: {
              type: "SLACK",
            },
          },
        },
      });

      if (integration && integration.deployments.length > 0) {
        const deployment = integration.deployments[0];
        // We need to use any here due to JSON type constraints
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config = deployment.config as unknown as Record<string, any>;
        const channels = config.channels || [];

        // Create the new channel object
        const newChannel = {
          channelId: response.incoming_webhook?.channel_id || "",
          channelName: response.incoming_webhook?.channel || "",
          configuration_url: response.incoming_webhook?.configuration_url,
          url: response.incoming_webhook?.url,
          active: true,
          settings: {
            mentionsOnly: false,
          },
        };

        // Add the new channel (avoid duplicates by channel ID)
        const updatedChannels = [
          ...channels.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ch: any) => ch.channelId !== newChannel.channelId
          ),
          newChannel,
        ];

        // Update the deployment with the new channel
        await prisma.deployment.update({
          where: { id: deployment.id },
          data: {
            config: {
              ...config,
              channels: updatedChannels,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          },
        });

        // Delete the OAuth state
        await prisma.oAuthState.delete({
          where: { state },
        });

        // Return success HTML
        const htmlResponse = `
          <html>
            <head>
              <title>Channel Added Successfully</title>
              <script>
                window.opener.postMessage('app_oauth_completed', '*');
                window.close();
              </script>
            </head>
            <body>
              <h1>Channel Added Successfully</h1>
              <p>You have successfully added a new channel to your Slack integration.</p>
              <p>You can close this window now.</p>
            </body>
          </html>
        `;

        return new NextResponse(htmlResponse, {
          headers: {
            "Content-Type": "text/html",
          },
        });
      }
    }

    // Check for existing Slack integration for this bot
    const existingIntegrationId = await getSlackIntegrationForBot(
      metadata.botId
    );

    if (existingIntegrationId) {
      // If there's already an integration, just update its credentials
      await prisma.integration.update({
        where: { id: existingIntegrationId },
        data: {
          credentialId: credential.id,
          metadata: {
            team_id: response.team?.id,
            team_name: response.team?.name,
          },
        },
      });

      const htmlResponse = `
        <html>
          <head>
            <title>Slack Connection Updated</title>
            <script>
              window.opener.postMessage('app_oauth_completed', '*');
              window.close();
            </script>
          </head>
          <body>
            <h1>Connection Updated</h1>
            <p>You have successfully updated your Slack connection.</p>
            <p>You can close this window now.</p>
          </body>
        </html>
      `;

      // Delete the OAuth state
      await prisma.oAuthState.delete({
        where: { state },
      });

      return new NextResponse(htmlResponse, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    // Create the Integration only if no existing integration
    const integration = await prisma.integration.create({
      data: {
        userId: oauthState.userId,
        botId: metadata.botId,
        provider: "slack",
        name: `Slack Integration (${response.team?.name || "Unknown"})`,
        type: $Enums.IntegrationType.MESSENGER,
        credentialId: credential.id,
        authCredentials: {}, // Empty as we use the credential record
        metadata: {
          team_id: response.team?.id,
          team_name: response.team?.name,
        },
        config: {
          maxMessagesToProcess: 10,
          messageStyle: "blocks",
          sendThreadedReplies: true,
          autoRespondToMentions: true,
          autoRespondToDirectMessages: true,
          respondToReactions: false,
          notificationSettings: {
            enabled: false,
          },
        },
      },
    });

    // Create the Deployment
    await prisma.deployment.create({
      data: {
        botId: metadata.botId,
        integrationId: integration.id,
        type: $Enums.DeploymentType.SLACK,
        config: {
          channels: [
            {
              channelId: response.incoming_webhook?.channel_id,
              channelName: response.incoming_webhook?.channel,
              configuration_url: response.incoming_webhook?.configuration_url,
              url: response.incoming_webhook?.url,
              active: true,
              settings: {
                mentionsOnly: false,
              },
            },
          ],
          globalSettings: {
            defaultResponseTime: "immediate",
          },
        },
      },
    });

    // Delete the OAuth state
    await prisma.oAuthState.delete({
      where: { state },
    });

    // Return an HTML page that sends a message to the opener and closes itself
    const htmlResponse = `
      <html>
        <head>
          <title>Slack Connection Successful</title>
          <script>
            window.opener.postMessage('app_oauth_completed', '*');
            window.close();
          </script>
        </head>
        <body>
          <h1>Connection Successful</h1>
          <p>You have successfully connected your bot to Slack.</p>
          <p>You can close this window now.</p>
        </body>
      </html>
    `;

    return new NextResponse(htmlResponse, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error in Slack OAuth callback:", error);
    const htmlResponse = `
      <html>
        <head>
          <title>Slack Connection Failed</title>
          <script>
            window.opener.postMessage('app_oauth_failed', '*');
            window.close();
          </script>
        </head>
        <body>
          <h1>Connection Failed</h1>
          <p>An unexpected error occurred</p>
        </body>
      </html>
    `;
    return new NextResponse(htmlResponse, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  }
}
