import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { $Enums } from "@/lib/generated/prisma";
import { createGoHighLevelClient } from "@/lib/auth/clients/gohighlevel";
import { TokenContext } from "@/lib/auth/types";
import { gohighlevelConfig } from "@/lib/auth/config/providers-config";

async function exchangeCodeForToken(code: string) {
  // Create form data with required parameters
  const formData = new URLSearchParams();
  formData.append("client_id", gohighlevelConfig.clientId);
  formData.append("client_secret", gohighlevelConfig.clientSecret);
  formData.append("grant_type", "authorization_code");
  formData.append("code", code);
  formData.append("redirect_uri", gohighlevelConfig.redirectUri);
  formData.append("user_type", "Location"); // Request a Location token

  const tokenResponse = await fetch(
    `${gohighlevelConfig.apiEndpoint}/oauth/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    }
  );

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Failed to exchange code for token:", error);
    throw new Error("Failed to exchange code for token");
  }

  const tokenData = await tokenResponse.json();
  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + tokenData.expires_in * 1000,
    scope: tokenData.scope,
    locationId: tokenData.locationId,
    companyId: tokenData.companyId,
    userId: tokenData.userId,
    planId: tokenData.planId,
    userType: tokenData.userType,
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(
        new URL("/integrations/error?error=missing_code", request.url)
      );
    }

    // Validate state if provided
    if (state) {
      const oauthState = await prisma.oAuthState.findUnique({
        where: { state },
      });

      if (!oauthState) {
        return NextResponse.redirect(
          new URL("/integrations/error?error=invalid_state", request.url)
        );
      }

      // Exchange the code for an access token
      const tokenData = await exchangeCodeForToken(code);

      // Get user from state
      const userId = oauthState.userId;

      // Try to parse the metadata from the oauthState
      let botId = "";
      try {
        const metadata = JSON.parse(oauthState.metadata);
        botId = metadata.botId || "";
      } catch (e) {
        console.error("Error parsing state metadata:", e);
      }

      // Create a token context for getting location info
      const tempCredential = await prisma.credential.create({
        data: {
          userId,
          provider: "gohighlevel",
          name: "Temporary",
          credentials: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_at,
            scope: tokenData.scope,
            locationId: tokenData.locationId,
          },
        },
      });

      const tokenContext: TokenContext = {
        userId,
        provider: "gohighlevel",
        credentialId: tempCredential.id,
      };

      // Get location/account info using the auth module client
      const ghlClient = createGoHighLevelClient(
        tokenContext,
        tokenData.locationId
      );

      // Initialize the client
      await ghlClient.initialize();

      let locationInfo;

      try {
        if (tokenData.locationId) {
          locationInfo = await ghlClient.location.getLocation(
            tokenData.locationId
          );
        } else {
          locationInfo = { name: "GoHighLevel Account", id: "" };
        }
      } catch (error) {
        console.error("Error fetching location info:", error);
        locationInfo = { name: "GoHighLevel Account", id: "" };
      }

      // Delete the temporary credential
      await prisma.credential.delete({
        where: { id: tempCredential.id },
      });

      // Create or update credentials
      const credential = await prisma.credential.upsert({
        where: {
          userId_provider_name: {
            userId,
            provider: "gohighlevel",
            name: locationInfo.name || "Default",
          },
        },
        update: {
          credentials: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_at,
            scope: tokenData.scope,
            locationId: tokenData.locationId,
          },
        },
        create: {
          userId,
          provider: "gohighlevel",
          name: locationInfo.name || "Default",
          botId,
          credentials: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_at,
            scope: tokenData.scope,
            locationId: tokenData.locationId,
          },
        },
      });

      // Only continue if a bot ID was provided
      if (botId) {
        // Find existing integration for this bot and provider
        const existingIntegration = await prisma.integration.findFirst({
          where: {
            botId,
            provider: "gohighlevel",
          },
        });

        // Create or update integration with location metadata
        let integration;
        if (existingIntegration) {
          // Update existing integration
          integration = await prisma.integration.update({
            where: {
              id: existingIntegration.id,
            },
            data: {
              metadata: {
                locationId: tokenData.locationId,
                locationName: locationInfo.name || "GoHighLevel Location",
                companyId: tokenData.companyId,
              },
              credentialId: credential.id,
              connectionStatus: $Enums.ConnectionStatus.CONNECTED,
            },
          });
        } else {
          // Create new integration
          integration = await prisma.integration.create({
            data: {
              userId,
              botId,
              name: `GoHighLevel - ${locationInfo.name || "Default"}`,
              provider: "gohighlevel",
              type: $Enums.IntegrationType.CRM,
              authCredentials: {}, // Empty object for auth credentials since we're using the credential model
              metadata: {
                locationId: tokenData.locationId,
                locationName: locationInfo.name || "GoHighLevel Location",
                companyId: tokenData.companyId,
              },
              credentialId: credential.id,
              connectionStatus: $Enums.ConnectionStatus.CONNECTED,
              config: {
                messageStyle: "text",
                maxMessagesToProcess: 10,
              },
            },
          });
        }

        // Create default deployment for this integration if it doesn't exist
        const existingDeployment = await prisma.deployment.findFirst({
          where: {
            botId,
            integrationId: integration.id,
            type: $Enums.DeploymentType.GOHIGHLEVEL,
          },
        });

        if (!existingDeployment) {
          await prisma.deployment.create({
            data: {
              botId,
              integrationId: integration.id,
              type: $Enums.DeploymentType.GOHIGHLEVEL,
              status: $Enums.DeploymentStatus.ACTIVE,
              config: {
                locationId: tokenData.locationId,
                channels: [
                  {
                    type: "SMS",
                    active: true,
                  },
                  {
                    type: "Email",
                    active: true,
                  },
                  {
                    type: "WhatsApp",
                    active: false,
                  },
                  {
                    type: "IG",
                    active: false,
                  },
                  {
                    type: "FB",
                    active: false,
                  },
                  {
                    type: "Live_Chat",
                    active: false,
                  },
                  {
                    type: "CALL",
                    active: false,
                  },
                ],
                globalSettings: {
                  checkKillSwitch: true,
                  defaultResponseTime: "immediate",
                },
                optedOutConversations: [],
              },
            },
          });
        }
      }

      // Clean up the state
      await prisma.oAuthState.delete({
        where: { state },
      });

      // Return success HTML with script to notify parent window
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>GoHighLevel Connected</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                text-align: center;
                padding: 2rem;
                max-width: 500px;
                margin: 0 auto;
              }
              .success {
                color: #10B981;
                font-size: 4rem;
                margin-bottom: 1rem;
              }
              h1 {
                color: #111827;
                margin-bottom: 1rem;
              }
              p {
                color: #6B7280;
                margin-bottom: 2rem;
              }
              button {
                background-color: #2563EB;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 0.375rem;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
              }
              button:hover {
                background-color: #1D4ED8;
              }
            </style>
          </head>
          <body>
            <div class="success">✓</div>
            <h1>Successfully connected to GoHighLevel</h1>
            <p>You can close this window and return to the application.</p>
            <button onclick="closeWindow()">Close Window</button>
            <script>
              function closeWindow() {
                window.opener && window.opener.postMessage('ghl_oauth_completed', '*');
                window.close();
              }
              
              // Auto notify parent
              document.addEventListener('DOMContentLoaded', function() {
                window.opener && window.opener.postMessage('ghl_oauth_completed', '*');
              });
            </script>
          </body>
        </html>
        `,
        {
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
    } else {
      // No state provided, handle basic OAuth flow
      const tokenData = await exchangeCodeForToken(code);

      return NextResponse.json({
        success: true,
        message: "Successfully authenticated with GoHighLevel",
        locationId: tokenData.locationId,
        companyId: tokenData.companyId,
      });
    }
  } catch (error) {
    console.error("Error processing GoHighLevel OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/integrations/error?error=oauth_failed", request.url)
    );
  }
}
