import { Webhook } from "standardwebhooks";
import { DodoPayments } from "dodopayments";
import {
  PaymentProvider,
  CreateSubscriptionOptions,
  UpdateSubscriptionOptions,
  CancelSubscriptionOptions,
  AddOnSubscriptionOptions,
  CreatePaymentLinkOptions,
  WebhookEvent,
  ActivateSubscriptionOptions,
} from "./types";
import { CountryCode } from "dodopayments/resources/misc.mjs";
import { PaymentCreateParams } from "dodopayments/resources/payments.mjs";
import { SubscriptionStatus } from "../generated/prisma";

// Define interface for customer creation
interface CreateCustomerOptions {
  name: string;
  email: string;
}

interface DodoWebhookPayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
}

export class DodoPaymentsProvider implements PaymentProvider {
  private client: DodoPayments;
  private webhook: Webhook;

  constructor() {
    // Initialize Dodo Payments client
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      throw new Error("DODO_API_KEY environment variable is not set");
    }

    this.client = new DodoPayments({
      bearerToken: apiKey,
      environment: "test_mode",
    });

    // Initialize webhook verification
    const webhookKey = process.env.DODO_WEBHOOK_KEY;
    if (!webhookKey) {
      throw new Error("DODO_WEBHOOK_KEY environment variable is not set");
    }

    this.webhook = new Webhook(webhookKey);
  }

  async createCustomer(options: CreateCustomerOptions): Promise<string> {
    try {
      const response = await this.client.customers.create({
        name: options.name,
        email: options.email,
      });

      return response.customer_id;
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  }

  async createSubscription(options: CreateSubscriptionOptions) {
    try {
      let customerId = options.customer.customerId;

      // If no customer ID is provided, create a new customer
      if (!customerId) {
        customerId = await this.createCustomer({
          name: options.customer.name || "Unknown",
          email: options.customer.email || "unknown@example.com",
        });
      }

      const response = await this.client.subscriptions.create({
        billing: {
          street: options.billingAddress.street,
          city: options.billingAddress.city,
          state: options.billingAddress.state,
          country: options.billingAddress.country as CountryCode,
          zipcode: options.billingAddress.zipcode.toString(),
        },
        customer: {
          customer_id: customerId,
        },
        product_id: options.planId,
        payment_link: true,
        return_url: options.returnUrl,
        quantity: 1,
        metadata: options.metadata
          ? Object.entries(options.metadata).reduce((acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            }, {} as Record<string, string>)
          : undefined,
      });

      return {
        subscriptionId: response.subscription_id,
        paymentLinkUrl: response.payment_link || undefined,
        clientSecret: response.client_secret || undefined,
        status: "active" as SubscriptionStatus, // Cast to SubscriptionStatus
        customerId: customerId, // Return the customer ID that was used
      };
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  }

  async updateSubscription(options: UpdateSubscriptionOptions) {
    try {
      const updates: Record<string, unknown> = {};

      // If changing plan, use the dedicated changePlan method
      if (options.planId) {
        return await this.changePlan(options.subscriptionId, options.planId);
      }

      // For other updates, use the general update method
      if (options.metadata) {
        updates.metadata = Object.entries(options.metadata).reduce(
          (acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          },
          {} as Record<string, string>
        );
      }

      const response = await this.client.subscriptions.update(
        options.subscriptionId,
        updates
      );

      return {
        subscriptionId: response.subscription_id,
        status: this.mapSubscriptionStatus(response.status),
      };
    } catch (error) {
      console.error("Error updating subscription:", error);
      throw error;
    }
  }

  async changePlan(subscriptionId: string, productId: string) {
    try {
      // Call the changePlan method from Dodo API
      await this.client.subscriptions.changePlan(subscriptionId, {
        product_id: productId,
        proration_billing_mode: "prorated_immediately",
        quantity: 1, // Default to 1 seat/license
      });

      // Fetch the updated subscription to get its current status
      const updatedSubscription = await this.client.subscriptions.retrieve(
        subscriptionId
      );

      return {
        subscriptionId: updatedSubscription.subscription_id,
        status: this.mapSubscriptionStatus(updatedSubscription.status),
      };
    } catch (error) {
      console.error("Error changing subscription plan:", error);
      throw error;
    }
  }

  async cancelSubscription(options: CancelSubscriptionOptions) {
    try {
      // Dodo doesn't have a direct cancel method, so we update the status to cancelled
      const response = await this.client.subscriptions.update(
        options.subscriptionId,
        {
          status: "cancelled",
        }
      );

      return {
        subscriptionId: response.subscription_id,
        status: "canceled" as SubscriptionStatus, // Cast to SubscriptionStatus
      };
    } catch (error) {
      console.error("Error canceling subscription:", error);
      throw error;
    }
  }

  async activateSubscription(options: ActivateSubscriptionOptions) {
    try {
      // First, retrieve the current subscription to get its details
      const subscription = await this.client.subscriptions.retrieve(
        options.subscriptionId
      );

      // We need to get the product ID and customer ID to create a new subscription
      const productId = subscription.product_id;
      const customerId = subscription.customer?.customer_id;

      if (!productId || !customerId) {
        throw new Error(
          "Cannot reactivate subscription: missing product or customer information"
        );
      }

      // Step 1: Cancel the current subscription if it's not already cancelled
      if (subscription.status !== "cancelled") {
        await this.client.subscriptions.update(options.subscriptionId, {
          status: "cancelled",
        });
        console.log(
          `Cancelled subscription ${options.subscriptionId} as part of reactivation process`
        );
      }

      // Step 2: Create a new subscription with the same details

      // Extract metadata from the old subscription
      const oldMetadata = subscription.metadata || {};

      // Create new metadata that links to the old subscription
      const newMetadata = {
        ...oldMetadata,
        previous_subscription_id: options.subscriptionId,
        reactivated: "true",
        reactivated_at: new Date().toISOString(),
      };

      // Create a new subscription
      const newSubscription = await this.client.subscriptions.create({
        product_id: productId,
        customer: {
          customer_id: customerId,
        },
        billing: subscription.billing,
        quantity: subscription.quantity || 1,
        metadata: newMetadata,
      });

      console.log(
        `Created new subscription ${newSubscription.subscription_id} to replace ${options.subscriptionId}`
      );

      // Return the new subscription details
      return {
        subscriptionId: newSubscription.subscription_id,
        status: "active" as SubscriptionStatus,
        newSubscription: true, // Flag to indicate this is a new subscription
      };
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      throw error;
    }
  }

  async addAddOnToSubscription(options: AddOnSubscriptionOptions) {
    try {
      // This would call the Dodo add-on API when available
      // For now using a placeholder implementation
      console.log("Adding add-on to subscription:", options);

      // Mock response
      return {
        addOnSubscriptionId: `addon_sub_${Date.now()}`,
        status: "active",
      };
    } catch (error) {
      console.error("Error adding add-on to subscription:", error);
      throw error;
    }
  }

  async updateAddOnQuantity(addOnSubscriptionId: string, quantity: number) {
    try {
      // This would call the Dodo add-on quantity update API when available
      // For now using a placeholder implementation
      console.log("Updating add-on quantity:", addOnSubscriptionId, quantity);

      // Mock response
      return {
        addOnSubscriptionId,
        quantity,
      };
    } catch (error) {
      console.error("Error updating add-on quantity:", error);
      throw error;
    }
  }

  async removeAddOnFromSubscription(addOnSubscriptionId: string) {
    try {
      // This would call the Dodo remove add-on API when available
      // For now using a placeholder implementation
      console.log("Removing add-on from subscription:", addOnSubscriptionId);

      // Mock response
      return true;
    } catch (error) {
      console.error("Error removing add-on from subscription:", error);
      throw error;
    }
  }

  async createPaymentLink(options: CreatePaymentLinkOptions) {
    try {
      // Construct payment parameters according to DodoPayments API
      const params: PaymentCreateParams = {
        payment_link: true,
        // Customer information
        customer: {
          customer_id:
            options.customer.customerId ||
            (await this.createCustomer({
              name: options.customer.name || "Unknown",
              email: options.customer.email || "unknown@example.com",
            })),
        },

        // Billing information
        billing: {
          street: options.billingAddress.street,
          city: options.billingAddress.city,
          state: options.billingAddress.state,
          country: options.billingAddress.country,
          zipcode: String(options.billingAddress.zipcode),
        },

        // Product information
        product_cart: [
          {
            product_id: options.productId,
            quantity: options.metadata?.quantity
              ? Number(options.metadata.quantity)
              : 1, // Use quantity from metadata or default to 1
          },
        ],
      };

      // Add optional parameters if provided
      if (options.returnUrl) params.return_url = options.returnUrl;

      // Convert metadata to string values if provided
      if (options.metadata) {
        params.metadata = Object.entries(options.metadata).reduce(
          (acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          },
          {} as Record<string, string>
        );
      }

      const response = await this.client.payments.create(params);

      return {
        paymentId: response.payment_id,
        paymentLinkUrl: response.payment_link || "",
      };
    } catch (error) {
      console.error("Error creating payment link:", error);
      throw error;
    }
  }

  async verifyWebhookSignature(
    payload: string,
    headers: Record<string, string>
  ) {
    try {
      const webhookHeaders = {
        "webhook-id": headers["webhook-id"] || "",
        "webhook-signature": headers["webhook-signature"] || "",
        "webhook-timestamp": headers["webhook-timestamp"] || "",
      };

      await this.webhook.verify(payload, webhookHeaders);
      return true;
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return false;
    }
  }

  parseWebhookEvent(payload: string): WebhookEvent {
    try {
      const parsedPayload = JSON.parse(payload) as DodoWebhookPayload;

      return {
        id: parsedPayload.id,
        type: parsedPayload.type,
        data: parsedPayload.data,
        createdAt: new Date(parsedPayload.created_at),
      };
    } catch (error) {
      console.error("Error parsing webhook payload:", error);
      throw new Error("Invalid webhook payload");
    }
  }

  // Helper method to map Dodo Payments subscription status to our status type
  private mapSubscriptionStatus(dodoStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      pending: SubscriptionStatus.PENDING,
      active: SubscriptionStatus.ACTIVE,
      on_hold: SubscriptionStatus.PAST_DUE,
      paused: SubscriptionStatus.PAUSED,
      cancelled: SubscriptionStatus.CANCELED,
      failed: SubscriptionStatus.UNPAID,
      expired: SubscriptionStatus.EXPIRED,
    };

    return statusMap[dodoStatus] || SubscriptionStatus.ACTIVE;
  }
}
