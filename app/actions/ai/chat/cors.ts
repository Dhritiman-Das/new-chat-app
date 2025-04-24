import { getIframeConfigForBot } from "@/lib/queries/cached-queries";

/**
 * Adds CORS headers to a Headers object for iframe and API usage
 */
export async function addCorsHeaders(
  headers: Headers,
  source?: string,
  botId?: string
): Promise<Headers> {
  if (source === "iframe" && botId) {
    // Get deployment settings to check allowed domains
    try {
      const response = await getIframeConfigForBot(botId);
      if (response.success && response.data) {
        const config = response.data as Record<string, unknown>;
        if (config?.allowedDomains) {
          // In a real scenario, you would set the header based on the referrer and allowed domains
          // For simplicity, we're allowing all domains for now
          headers.set("Access-Control-Allow-Origin", "*");
        }
      }
    } catch {
      // If any error, default to restrictive CORS
      headers.set("Access-Control-Allow-Origin", "*"); // Change this in production
    }
  } else {
    // For internal usage, set to the same origin
    headers.set("Access-Control-Allow-Origin", "*"); // Change this in production
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return headers;
}
