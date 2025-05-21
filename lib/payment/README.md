# Billing System

This module provides a complete billing and subscription management system that integrates with Dodo Payments. It's designed to be modular so you can easily swap out Dodo for another payment provider in the future.

## Setup

1. Install the necessary dependencies:

```bash
# Install Dodo Payments SDK
npm install @dodopayments/node standardwebhooks
```

2. Add the following environment variables to your `.env` file:

```
# Dodo Payments - Payment Provider
DODO_API_KEY="your_dodo_api_key"
DODO_WEBHOOK_KEY="your_dodo_webhook_secret"

# Current active payment provider (dodo, stripe, paddle)
PAYMENT_PROVIDER="dodo"
```

3. Run Prisma migrations to create the necessary database tables:

```bash
npx prisma migrate dev --name add-billing-models
```

## Features

- Subscription management (create, update, cancel)
- Add-on management
- Usage tracking
- Credits system
- Webhooks for event handling
- Support for multiple payment providers

## Usage

### Creating a Subscription

```typescript
import { createSubscriptionForOrganization } from "@/lib/payment/billing-service";
import { BillingCycle } from "@/lib/payment/types";

// Create a subscription
const result = await createSubscriptionForOrganization(
  organizationId, // Organization ID
  "STANDARD", // Plan type (HOBBY, STANDARD, PRO)
  BillingCycle.MONTHLY, // Billing cycle
  {
    // Customer info
    name: "John Doe",
    email: "john@example.com",
  },
  {
    // Billing address
    street: "123 Main St",
    city: "San Francisco",
    state: "CA",
    country: "US",
    zipcode: "94105",
  },
  "https://yourdomain.com/billing/success" // Return URL after payment
);

// Redirect user to payment page
if (result.paymentLinkUrl) {
  window.location.href = result.paymentLinkUrl;
}
```

### Managing a Subscription

```typescript
import {
  updateOrganizationSubscription,
  cancelOrganizationSubscription,
} from "@/lib/payment/billing-service";
import { BillingCycle } from "@/lib/payment/types";

// Update a subscription
await updateOrganizationSubscription(organizationId, {
  planType: "PRO",
  billingCycle: BillingCycle.YEARLY,
});

// Cancel a subscription
await cancelOrganizationSubscription(
  organizationId,
  true // Cancel at period end
);
```

### Managing Add-ons

```typescript
import {
  addAddOnToOrganizationSubscription,
  updateAddOnQuantity,
  removeAddOnFromSubscription,
} from "@/lib/payment/billing-service";

// Add an add-on
await addAddOnToOrganizationSubscription(
  organizationId,
  "addon_id",
  2 // Quantity
);

// Update add-on quantity
await updateAddOnQuantity(
  organizationId,
  "addon_subscription_id",
  3 // New quantity
);

// Remove an add-on
await removeAddOnFromSubscription(organizationId, "addon_subscription_id");
```

### Managing Credits

```typescript
import { createCreditTransaction } from "@/lib/payment/billing-service";

// Add credits (positive amount)
await createCreditTransaction(
  organizationId,
  1000, // Amount
  "PURCHASE", // Transaction type
  "Purchased credits" // Description
);

// Use credits (negative amount)
await createCreditTransaction(
  organizationId,
  -5, // Amount
  "USAGE", // Transaction type
  "Used for model generation", // Description
  { modelName: "gpt-4o" } // Optional metadata
);
```

### Getting Usage and Limits

```typescript
import {
  getOrganizationSubscription,
  getOrganizationCreditBalance,
  getOrganizationUsage,
  getPlanLimits,
} from "@/lib/payment/billing-service";

// Get subscription info
const subscription = await getOrganizationSubscription(organizationId);

// Get credit balance
const { balance } = await getOrganizationCreditBalance(organizationId);

// Get usage
const usage = await getOrganizationUsage(organizationId);

// Get limits for a plan
const limits = await getPlanLimits("STANDARD");
```

## Webhooks

Webhooks from Dodo Payments are handled by the route handler at `app/api/webhooks/dodo/route.ts`. This handler processes events like subscription activations, renewals, and payment events.

To set up webhooks:

1. In your Dodo Payments dashboard, set up a webhook endpoint pointing to:

   ```
   https://yourdomain.com/api/webhooks/dodo
   ```

2. Copy the webhook secret and set it as `DODO_WEBHOOK_KEY` in your environment variables.

## Extending with Other Payment Providers

To add support for a different payment provider:

1. Create a new provider implementation in `lib/payment/your-provider.ts` that implements the `PaymentProvider` interface.

2. Add the provider to the factory in `lib/payment/factory.ts`.

3. Update the `getPaymentProvider` function to handle the new provider type.

4. Add a corresponding webhook handler if needed.

Example:

```typescript
// In lib/payment/stripe-provider.ts
export class StripeProvider implements PaymentProvider {
  // Implement all required methods
}

// In lib/payment/factory.ts
import { StripeProvider } from './stripe-provider';

// Update the factory function
export function getPaymentProvider(type: PaymentProviderType = 'dodo'): PaymentProvider {
  // ...
  case 'stripe':
    providers.stripe = new StripeProvider();
    return providers.stripe as PaymentProvider;
  // ...
}
```

Then you can switch providers by changing the `PAYMENT_PROVIDER` environment variable to `"stripe"`.

## Database Schema

The billing system uses the following models:

- `PlanFeature`: Defines features like agents, message_credits, analytics, etc.
- `PlanLimit`: Defines limits for each feature per plan type
- `AddOn`: Add-ons that can be purchased separately
- `AddOnSubscription`: Tracks subscribed add-ons
- `Subscription`: Tracks organization subscriptions
- `UsageRecord`: Tracks usage of metered features
- `Invoice`: Tracks invoices
- `CreditBalance`: Tracks credit balances
- `CreditTransaction`: Tracks credit purchases and usage
- `ModelCreditCost`: Defines credit costs for different models
