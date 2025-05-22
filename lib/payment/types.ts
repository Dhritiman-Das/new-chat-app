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

// Dodo subscription webhook data
export interface DodoSubscriptionData {
  subscription_id: string;
  product_id: string;
  customer?: {
    customer_id: string;
    email?: string;
    name?: string;
  };
  status: string;
  currency: string;
  quantity: number;
  recurring_pre_tax_amount: number;
  created_at: string;
  previous_billing_date?: string;
  next_billing_date?: string;
  cancelled_at?: string;
  trial_period_days?: number;
  billing?: {
    city: string;
    country: CountryCode;
    state: string;
    street: string;
    zipcode: string;
  };
  metadata?: Record<string, string>;
  addons?: Array<{
    addon_id: string;
    quantity: number;
  }>;
  payment_frequency_interval?: string;
  payment_frequency_count?: number;
  subscription_period_interval?: string;
  subscription_period_count?: number;
  on_demand?: boolean;
  tax_inclusive?: boolean;
  discount_id?: string;
}

// Dodo dispute data
export interface DodoDispute {
  dispute_id: string;
  payment_id: string;
  business_id: string;
  amount: string;
  currency: string;
  dispute_status: string;
  dispute_stage: string;
  remarks?: string;
  created_at: string;
}

// Dodo refund data
export interface DodoRefund {
  refund_id: string;
  payment_id: string;
  business_id: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
  created_at: string;
}

// Dodo payment webhook data
export interface DodoPaymentData {
  payment_id: string;
  subscription_id?: string;
  business_id: string;
  status: string;
  total_amount: number;
  currency: string;
  tax?: number;
  settlement_amount?: number;
  settlement_currency?: string;
  settlement_tax?: number;
  customer?: {
    customer_id: string;
    email?: string;
    name?: string;
  };
  billing?: {
    city: string;
    country: CountryCode;
    state: string;
    street: string;
    zipcode: string;
  };
  payment_method?: string;
  payment_method_type?: string;
  payment_link?: string;
  card_network?: string;
  card_type?: string;
  card_last_four?: string;
  card_issuing_country?: string;
  product_cart?: Array<{
    product_id: string;
    quantity: number;
  }>;
  refunds?: DodoRefund[];
  disputes?: DodoDispute[];
  error_message?: string;
  discount_id?: string;
  metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// For subscription events, the event.data will have the DodoSubscriptionData properties
// For payment events, the event.data will have the DodoPaymentData properties
export interface WebhookEventData
  extends Partial<DodoSubscriptionData>,
    Partial<DodoPaymentData> {
  // Allow additional unknown properties
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
