import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { $Enums } from "@/lib/generated/prisma";
import { createGoHighLevelClient } from "@/lib/auth/clients/gohighlevel/index";
import { TokenContext } from "@/lib/auth/types";
import { gohighlevelConfig } from "@/lib/auth/config/providers-config";
import { revalidateTag } from "next/cache";
import { BOT_INTEGRATIONS, BOT_DEPLOYMENTS } from "@/lib/constants/cache-tags";
import { env } from "@/src/env";

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
      let orgId = "";
      try {
        const metadata = JSON.parse(oauthState.metadata);
        botId = metadata.botId || "";
        orgId = metadata.orgId || "";
      } catch (e) {
        console.error("Error parsing state metadata:", e);
      }

      // Create a token context for getting location info
      const tempCredential = await prisma.credential.create({
        data: {
          userId,
          provider: "gohighlevel",
          name: "Temporary",
          // Make sure temporary credential has no botId to avoid conflicts
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
      const ghlClientPromise = createGoHighLevelClient(
        tokenContext,
        tokenData.locationId
      );

      // Await the client
      const ghlClient = await ghlClientPromise;

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

      // Check if credential already exists for this bot and provider
      let credential = await prisma.credential.findFirst({
        where: {
          botId,
          provider: "gohighlevel",
        },
      });

      if (credential) {
        // Update existing credential
        credential = await prisma.credential.update({
          where: { id: credential.id },
          data: {
            name: locationInfo.name || "Default",
            credentials: {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: tokenData.expires_at,
              scope: tokenData.scope,
              locationId: tokenData.locationId,
            },
          },
        });
      } else {
        // Create new credential
        try {
          // First check if the bot exists
          if (botId) {
            const botExists = await prisma.bot.findUnique({
              where: { id: botId },
            });

            if (!botExists) {
              console.error(
                `Bot with ID ${botId} does not exist in the database`
              );
              return NextResponse.redirect(
                new URL("/integrations/error?error=invalid_bot", request.url)
              );
            }
          }

          credential = await prisma.credential.create({
            data: {
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
        } catch (error) {
          console.error("Error creating credential:", error);
          return NextResponse.redirect(
            new URL(
              "/integrations/error?error=credential_creation_failed",
              request.url
            )
          );
        }
      }

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

        // Revalidate cache tags for integrations and deployments
        revalidateTag(BOT_INTEGRATIONS(botId));
        revalidateTag(BOT_DEPLOYMENTS(botId));
      }

      // Clean up the state
      await prisma.oAuthState.delete({
        where: { state },
      });

      // Construct the return URL for the Bonti App
      const bontiAppUrl =
        orgId && botId
          ? `${env.NEXT_PUBLIC_APP_URL}/dashboard/${orgId}/bots/${botId}/deployments/gohighlevel`
          : "/dashboard";

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
                background-color: #f9fafb;
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 0.75rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              }
              .success {
                color: #10B981;
                font-size: 4rem;
                margin-bottom: 1rem;
              }
              h1 {
                color: #111827;
                margin-bottom: 1rem;
                font-size: 1.5rem;
                font-weight: 600;
              }
              p {
                color: #6B7280;
                margin-bottom: 2rem;
                line-height: 1.5;
              }
              .button-container {
                display: flex;
                gap: 1rem;
                justify-content: center;
                flex-wrap: wrap;
              }
              button {
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 0.375rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.875rem;
                min-width: 140px;
              }
              .btn-primary {
                background-color: #2563EB;
                color: white;
              }
              .btn-primary:hover {
                background-color: #1D4ED8;
                transform: translateY(-1px);
              }
              .btn-secondary {
                background-color: #F3F4F6;
                color: #374151;
                border: 1px solid #D1D5DB;
              }
              .btn-secondary:hover {
                background-color: #E5E7EB;
                transform: translateY(-1px);
              }
              @media (max-width: 480px) {
                .button-container {
                  flex-direction: column;
                  align-items: center;
                }
                button {
                  width: 100%;
                  max-width: 200px;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success">✓</div>
              <h1>Successfully connected to GoHighLevel!</h1>
              <p>Your GoHighLevel integration is now active and ready to use. You can now close this window or return to your dashboard.</p>
              <div class="button-container">
                <button class="btn-primary" onclick="goToBontiApp()">Go to Bonti App</button>
                <button class="btn-secondary" onclick="closeWindow()">Close Window</button>
              </div>
            </div>
            <script>
              function closeWindow() {
                // Notify parent window that OAuth is completed
                if (window.opener) {
                  window.opener.postMessage('app_oauth_completed', '*');
                }
                window.close();
              }
              
              function goToBontiApp() {
                // Notify parent window that OAuth is completed and redirect
                if (window.opener) {
                  window.opener.postMessage('app_oauth_completed', '*');
                  window.opener.location.href = '${bontiAppUrl}';
                  window.close();
                } else {
                  // If no opener, redirect this window
                  window.location.href = '${bontiAppUrl}';
                }
              }
              
              // Auto notify parent on load
              document.addEventListener('DOMContentLoaded', function() {
                if (window.opener) {
                  window.opener.postMessage('app_oauth_completed', '*');
                }
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
