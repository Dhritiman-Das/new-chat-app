import { PaymentProvider } from "./types";
import { DodoPaymentsProvider } from "./dodo-provider";
import { env } from "@/src/env";

// This type allows us to extend with other payment providers later
export type PaymentProviderType = "dodo" | "stripe" | "paddle";

// Singleton instance for caching providers
const providers: Record<PaymentProviderType, PaymentProvider | null> = {
  dodo: null,
  stripe: null,
  paddle: null,
};

/**
 * Factory function to get the appropriate payment provider instance
 * This allows for easy switching between payment providers
 */
export function getPaymentProvider(
  type: PaymentProviderType = "dodo"
): PaymentProvider {
  // If we already have an instance, return it (caching)
  if (providers[type]) {
    return providers[type] as PaymentProvider;
  }

  // Create new provider instance based on type
  switch (type) {
    case "dodo":
      providers.dodo = new DodoPaymentsProvider();
      return providers.dodo as PaymentProvider;

    case "stripe":
      // In the future when implementing Stripe
      // providers.stripe = new StripePaymentProvider();
      // return providers.stripe as PaymentProvider;
      throw new Error("Stripe provider not implemented yet");

    case "paddle":
      // In the future when implementing Paddle
      // providers.paddle = new PaddlePaymentProvider();
      // return providers.paddle as PaymentProvider;
      throw new Error("Paddle provider not implemented yet");

    default:
      throw new Error(`Unknown payment provider type: ${type}`);
  }
}

/**
 * Helper function to get the current active payment provider
 * Reads from environment variables
 */
export function getActivePaymentProvider(): PaymentProvider {
  const providerType = env.PAYMENT_PROVIDER as PaymentProviderType;
  return getPaymentProvider(providerType);
}
