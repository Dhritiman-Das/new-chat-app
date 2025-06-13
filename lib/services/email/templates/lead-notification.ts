import { EmailRecipient } from "../email-service";

export interface LeadNotificationData {
  leadId: string;
  leadName: string | null;
  leadEmail: string | null;
  leadPhone: string | null;
  leadCompany: string | null;
  triggerKeyword: string | null;
  source: string | null;
  capturedAt: string;
  botName: string;
  organizationName: string;
  conversationId?: string | null;
  customProperties?: Record<string, unknown>;
}

export interface LeadNotificationTemplate {
  to: EmailRecipient[];
  subject: string;
  html: string;
  text: string;
  tags: string[];
}

export function generateLeadNotificationEmail(
  data: LeadNotificationData
): LeadNotificationTemplate {
  const subject = `🎯 New Lead Captured: ${
    data.leadName || data.leadEmail || "Unknown Lead"
  } - ${data.organizationName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Lead Notification</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 2px solid #e2e8f0;
        }
        .header h1 {
            color: #1e293b;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header .emoji {
            font-size: 48px;
            margin-bottom: 16px;
            display: block;
        }
        .lead-info {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }
        .lead-info h2 {
            color: #475569;
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
        }
        .info-label {
            font-weight: 600;
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .info-value {
            color: #1e293b;
            font-size: 14px;
            word-break: break-word;
        }
        .info-value.empty {
            color: #94a3b8;
            font-style: italic;
        }
        .metadata {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
        }
        .metadata h3 {
            color: #475569;
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
        }
        .custom-properties {
            background: #fefce8;
            border: 1px solid #fde047;
            border-radius: 6px;
            padding: 16px;
            margin-top: 16px;
        }
        .custom-properties h4 {
            color: #713f12;
            margin: 0 0 12px 0;
            font-size: 14px;
            font-weight: 600;
        }
        .property-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .property-key {
            font-weight: 500;
            color: #92400e;
        }
        .property-value {
            color: #451a03;
        }
        .actions {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
        }
        .cta-button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 0 8px;
        }
        .cta-button:hover {
            background: #2563eb;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
        }
        @media (max-width: 600px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="emoji">🎯</span>
            <h1>New Lead Captured!</h1>
            <p style="color: #64748b; margin: 8px 0 0 0;">A new lead has been captured by your bot "${
              data.botName
            }"</p>
        </div>

        <div class="lead-info">
            <h2>Lead Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Name</div>
                    <div class="info-value ${!data.leadName ? "empty" : ""}">${
    data.leadName || "Not provided"
  }</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Email</div>
                    <div class="info-value ${!data.leadEmail ? "empty" : ""}">${
    data.leadEmail || "Not provided"
  }</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Phone</div>
                    <div class="info-value ${!data.leadPhone ? "empty" : ""}">${
    data.leadPhone || "Not provided"
  }</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Company</div>
                    <div class="info-value ${
                      !data.leadCompany ? "empty" : ""
                    }">${data.leadCompany || "Not provided"}</div>
                </div>
            </div>
        </div>

        <div class="metadata">
            <h3>Capture Details</h3>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Trigger Keyword</div>
                    <div class="info-value ${
                      !data.triggerKeyword ? "empty" : ""
                    }">${data.triggerKeyword || "None"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Source</div>
                    <div class="info-value">${data.source || "Chat"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Captured At</div>
                    <div class="info-value">${new Date(
                      data.capturedAt
                    ).toLocaleString()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Bot</div>
                    <div class="info-value">${data.botName}</div>
                </div>
            </div>

            ${
              data.customProperties &&
              Object.keys(data.customProperties).length > 0
                ? `
                <div class="custom-properties">
                    <h4>📋 Additional Information</h4>
                    ${Object.entries(data.customProperties)
                      .map(
                        ([key, value]) => `
                        <div class="property-item">
                            <span class="property-key">${key}:</span>
                            <span class="property-value">${
                              value || "N/A"
                            }</span>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `
                : ""
            }
        </div>

        <div class="actions">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL
            }/dashboard/leads" class="cta-button">
                View All Leads
            </a>
            ${
              data.leadEmail
                ? `
                <a href="mailto:${data.leadEmail}" class="cta-button" style="background: #059669;">
                    Contact Lead
                </a>
            `
                : ""
            }
        </div>

        <div class="footer">
            <p>This notification was sent because lead notifications are enabled for the "${
              data.botName
            }" bot.</p>
            <p>You can manage your notification preferences in your bot settings.</p>
        </div>
    </div>
</body>
</html>`;

  const text = `
🎯 NEW LEAD CAPTURED

A new lead has been captured by your bot "${data.botName}" in ${
    data.organizationName
  }.

LEAD INFORMATION:
• Name: ${data.leadName || "Not provided"}
• Email: ${data.leadEmail || "Not provided"}
• Phone: ${data.leadPhone || "Not provided"}
• Company: ${data.leadCompany || "Not provided"}

CAPTURE DETAILS:
• Trigger Keyword: ${data.triggerKeyword || "None"}
• Source: ${data.source || "Chat"}
• Captured At: ${new Date(data.capturedAt).toLocaleString()}
• Bot: ${data.botName}

${
  data.customProperties && Object.keys(data.customProperties).length > 0
    ? `
ADDITIONAL INFORMATION:
${Object.entries(data.customProperties)
  .map(([key, value]) => `• ${key}: ${value || "N/A"}`)
  .join("\n")}
`
    : ""
}

---
This notification was sent because lead notifications are enabled for the "${
    data.botName
  }" bot.
You can manage your notification preferences in your bot settings.

View all leads: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/leads
${data.leadEmail ? `Contact lead: mailto:${data.leadEmail}` : ""}
`;

  return {
    to: [], // Will be populated by the caller
    subject,
    html,
    text,
    tags: [
      "lead-notification",
      "lead-capture",
      data.botName.toLowerCase().replace(/\s+/g, "-"),
    ],
  };
}
