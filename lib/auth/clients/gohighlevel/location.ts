import { AxiosInstance } from "axios";
import { ProviderError } from "../../errors";
import { Location } from "@/lib/tools/gohighlevel-calendar/types";
export class LocationClient {
  private client: () => Promise<AxiosInstance>;
  private locationId?: string;

  constructor(clientGetter: () => Promise<AxiosInstance>, locationId?: string) {
    this.client = clientGetter;
    this.locationId = locationId;
  }

  /**
   * Get location by ID
   */
  async getLocation(locationId: string): Promise<Location> {
    try {
      const client = await this.client();

      // Try to fetch the location
      const response = await client.get(`/locations/${locationId}`);

      if (response.data && response.data.location) {
        // Map the location to our interface
        return {
          id: response.data.location.id || response.data.location._id,
          name: response.data.location.name,
          description:
            response.data.location.description || "GoHighLevel location",
        };
      }

      // Return default location if API doesn't return expected data
      return {
        id: locationId,
        name: "Default Location",
        isMain: true,
        description: "GoHighLevel location",
      };
    } catch (error) {
      // If the API call fails, we might have a location-specific token
      // In this case, just return the current location from the context
      if (this.locationId) {
        return {
          id: this.locationId,
          name: "Default Location",
          isMain: true,
          description: "GoHighLevel location",
        };
      }

      console.error("Error fetching GoHighLevel location:", error);
      throw new ProviderError(
        `Failed to fetch GoHighLevel location: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "LOCATION_FETCH_ERROR"
      );
    }
  }
}
