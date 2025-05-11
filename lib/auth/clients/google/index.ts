/**
 * Google API client implementations
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { TokenContext } from "../../types";
import { getProvider } from "../../provider-registry";

/**
 * Main Google client that provides access to various Google services
 */
export class GoogleClient {
  private auth: OAuth2Client;

  constructor(auth: OAuth2Client) {
    this.auth = auth;
  }

  /**
   * Get the Calendar API client
   */
  get calendar() {
    return google.calendar({ version: "v3", auth: this.auth });
  }

  /**
   * Get the Gmail API client (when implemented)
   */
  get gmail() {
    return google.gmail({ version: "v1", auth: this.auth });
  }

  /**
   * Get the Drive API client (when implemented)
   */
  get drive() {
    return google.drive({ version: "v3", auth: this.auth });
  }

  /**
   * Get the underlying auth client
   */
  get authClient(): OAuth2Client {
    return this.auth;
  }
}

/**
 * Create a base Google API client
 * This returns a GoogleClient instance with access to all Google APIs
 */
export async function createGoogleClient(
  context: TokenContext
): Promise<GoogleClient> {
  try {
    const provider = getProvider("google");
    const token = await provider.getToken(context);

    // Use the token to create an OAuth2 client
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    return new GoogleClient(auth);
  } catch (error) {
    console.error("Error creating Google client:", error);
    throw error;
  }
}
