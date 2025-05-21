import { CountryCode } from "dodopayments/resources/misc.mjs";

export interface Customer {
  name?: string;
  email?: string;
  customerId?: string;
}

export interface BillingAddress {
  street: string;
  city: string;
  state: string;
  country: CountryCode;
  zipcode: string | number;
}

export interface PlanPricing {
  monthly: number;
  yearly: number;
}

export interface PlanInfo {
  id: string;
  name: string;
  externalId: string;
  pricing: PlanPricing;
}

export enum BillingCycle {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export interface CreateSubscriptionOptions {
  planId: string;
  organizationId: string;
  customer: Customer;
  billingAddress: BillingAddress;
  billingCycle: BillingCycle;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubscriptionOptions {
  subscriptionId: string;
  planId?: string;
  billingCycle?: BillingCycle;
  metadata?: Record<string, unknown>;
}

export interface CancelSubscriptionOptions {
  subscriptionId: string;
  atPeriodEnd?: boolean;
}

export interface AddOnInfo {
  id: string;
  name: string;
  externalId: string;
  unitPrice: number;
}

export interface AddOnSubscriptionOptions {
  organizationId: string;
  subscriptionId: string;
  addOnId: string;
  quantity: number;
}

export interface CreatePaymentLinkOptions {
  amount: number;
  currency: string;
  customer: Customer;
  billingAddress: BillingAddress;
  productId: string;
  description?: string;
  metadata?: Record<string, unknown>;
  returnUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface WebhookEventData {
  [key: string]: unknown;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: WebhookEventData;
  createdAt: Date;
}

export interface PaymentProvider {
  // Subscription methods
  createSubscription(options: CreateSubscriptionOptions): Promise<{
    subscriptionId: string;
    paymentLinkUrl?: string;
    clientSecret?: string;
    status: SubscriptionStatus;
    customerId?: string;
  }>;

  updateSubscription(options: UpdateSubscriptionOptions): Promise<{
    subscriptionId: string;
    status: SubscriptionStatus;
  }>;

  changePlan(
    subscriptionId: string,
    planId: string
  ): Promise<{
    subscriptionId: string;
    status: SubscriptionStatus;
  }>;

  cancelSubscription(options: CancelSubscriptionOptions): Promise<{
    subscriptionId: string;
    status: SubscriptionStatus;
  }>;

  // Add-on methods
  addAddOnToSubscription(options: AddOnSubscriptionOptions): Promise<{
    addOnSubscriptionId: string;
    status: string;
  }>;

  updateAddOnQuantity(
    addOnSubscriptionId: string,
    quantity: number
  ): Promise<{
    addOnSubscriptionId: string;
    quantity: number;
  }>;

  removeAddOnFromSubscription(addOnSubscriptionId: string): Promise<boolean>;

  // One-time payments
  createPaymentLink(options: CreatePaymentLinkOptions): Promise<{
    paymentId: string;
    paymentLinkUrl: string;
  }>;

  // Webhook verification
  verifyWebhookSignature(
    payload: string,
    headers: Record<string, string>
  ): Promise<boolean>;

  parseWebhookEvent(payload: string): WebhookEvent;
}
