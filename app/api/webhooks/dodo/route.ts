import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { PrismaClient, PlanType } from "@/lib/generated/prisma";
import { getPaymentProvider } from "@/lib/payment/factory";
import {
  createCreditTransaction,
  savePaymentCustomer,
} from "@/lib/payment/billing-service";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define proper types for webhook events
interface WebhookEventData {
  subscription?: {
    subscription_id: string;
    customer?: {
      customer_id: string;
    };
    metadata?: Record<string, string>;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end?: boolean;
    billing_cycle?: string;
    status: string;
  };
  payment?: {
    payment_id: string;
    customer?: {
      customer_id: string;
    };
    metadata?: Record<string, string>;
    amount: number;
    currency: string;
    receipt_url?: string;
    description?: string;
  };
}

interface WebhookEventType {
  type: string;
  data: WebhookEventData;
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const rawBody = await request.text();

    // Webhook headers from Dodo
    const webhookHeaders = {
      "webhook-id": headersList.get("webhook-id") || "",
      "webhook-signature": headersList.get("webhook-signature") || "",
      "webhook-timestamp": headersList.get("webhook-timestamp") || "",
    };

    // Get dodo payment provider for verification
    const paymentProvider = getPaymentProvider("dodo");

    // Verify webhook signature
    const isValid = await paymentProvider.verifyWebhookSignature(
      rawBody,
      webhookHeaders
    );

    if (!isValid) {
      console.error("Invalid webhook signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }

    // Parse and handle webhook event
    const event = paymentProvider.parseWebhookEvent(rawBody);
    console.log(`Processing webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      // Subscription events
      case "subscription.active":
        await handleSubscriptionActive(event);
        break;

      case "subscription.on_hold":
        await handleSubscriptionOnHold(event);
        break;

      case "subscription.failed":
        await handleSubscriptionFailed(event);
        break;

      case "subscription.renewed":
        await handleSubscriptionRenewed(event);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCanceled(event);
        break;

      // Payment events
      case "payment.succeeded":
        await handlePaymentSucceeded(event);
        break;

      case "payment.failed":
        await handlePaymentFailed(event);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return new NextResponse("Webhook received", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new NextResponse("Error processing webhook", { status: 500 });
  }
}

// Handler for subscription.active event
async function handleSubscriptionActive(event: WebhookEventType) {
  const subscriptionData = event.data.subscription;
  if (!subscriptionData) {
    console.error("No subscription data in event");
    return;
  }

  const metadata = subscriptionData.metadata || {};
  const organizationId = metadata.organizationId;

  if (!organizationId) {
    console.error("No organizationId in subscription metadata");
    return;
  }

  // Get plan type from metadata or map from product
  const planType = metadata.planType || "STANDARD"; // Default to STANDARD if not provided

  try {
    // Store customer ID if present
    if (subscriptionData.customer && subscriptionData.customer.customer_id) {
      await savePaymentCustomer(
        organizationId,
        subscriptionData.customer.customer_id,
        "dodo",
        { source: "subscription.active" }
      );
    }

    // Check if subscription already exists
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        externalId: subscriptionData.subscription_id,
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "active",
          currentPeriodStart: new Date(subscriptionData.current_period_start),
          currentPeriodEnd: new Date(subscriptionData.current_period_end),
          cancelAtPeriodEnd: subscriptionData.cancel_at_period_end || false,
        },
      });
    } else {
      // Create new subscription
      await prisma.subscription.create({
        data: {
          organizationId,
          externalId: subscriptionData.subscription_id,
          planType: planType as PlanType,
          status: "active",
          billingCycle:
            subscriptionData.billing_cycle === "yearly" ? "YEARLY" : "MONTHLY",
          currentPeriodStart: new Date(subscriptionData.current_period_start),
          currentPeriodEnd: new Date(subscriptionData.current_period_end),
          cancelAtPeriodEnd: subscriptionData.cancel_at_period_end || false,
          metadata: metadata,
        },
      });

      // Update organization plan
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          plan: planType as PlanType,
        },
      });

      // If the subscription has message credits, grant them
      const planLimits = await prisma.planLimit.findFirst({
        where: {
          planType: planType as PlanType,
          feature: {
            name: "message_credits",
          },
        },
        include: {
          feature: true,
        },
      });

      if (planLimits && !planLimits.isUnlimited) {
        await createCreditTransaction(
          organizationId,
          planLimits.value,
          "PLAN_GRANT",
          "Initial plan credit allocation",
          { subscriptionId: subscriptionData.subscription_id }
        );
      }
    }
  } catch (error) {
    console.error("Error handling subscription.active event:", error);
    throw error;
  }
}

// Handler for subscription.on_hold event
async function handleSubscriptionOnHold(event: WebhookEventType) {
  const subscriptionData = event.data.subscription;
  if (!subscriptionData) {
    return;
  }

  try {
    // Update subscription status
    await prisma.subscription.updateMany({
      where: {
        externalId: subscriptionData.subscription_id,
      },
      data: {
        status: "past_due",
      },
    });
  } catch (error) {
    console.error("Error handling subscription.on_hold event:", error);
    throw error;
  }
}

// Handler for subscription.failed event
async function handleSubscriptionFailed(event: WebhookEventType) {
  const subscriptionData = event.data.subscription;
  if (!subscriptionData) {
    return;
  }

  try {
    // Update subscription status
    await prisma.subscription.updateMany({
      where: {
        externalId: subscriptionData.subscription_id,
      },
      data: {
        status: "incomplete",
      },
    });
  } catch (error) {
    console.error("Error handling subscription.failed event:", error);
    throw error;
  }
}

// Handler for subscription.renewed event
async function handleSubscriptionRenewed(event: WebhookEventType) {
  const subscriptionData = event.data.subscription;
  if (!subscriptionData) {
    return;
  }

  const metadata = subscriptionData.metadata || {};
  const organizationId = metadata.organizationId;

  if (!organizationId) {
    console.error("No organizationId in subscription metadata");
    return;
  }

  try {
    // Store customer ID if present
    if (subscriptionData.customer && subscriptionData.customer.customer_id) {
      await savePaymentCustomer(
        organizationId,
        subscriptionData.customer.customer_id,
        "dodo",
        { source: "subscription.renewed" }
      );
    }

    // Update subscription dates
    await prisma.subscription.updateMany({
      where: {
        externalId: subscriptionData.subscription_id,
      },
      data: {
        currentPeriodStart: new Date(subscriptionData.current_period_start),
        currentPeriodEnd: new Date(subscriptionData.current_period_end),
        status: "active",
      },
    });

    // If the subscription has message credits, grant them for the new period
    const subscription = await prisma.subscription.findFirst({
      where: {
        externalId: subscriptionData.subscription_id,
      },
    });

    if (!subscription) {
      console.error("Subscription not found for renewal");
      return;
    }

    const planLimits = await prisma.planLimit.findFirst({
      where: {
        planType: subscription.planType,
        feature: {
          name: "message_credits",
        },
      },
      include: {
        feature: true,
      },
    });

    if (planLimits && !planLimits.isUnlimited) {
      await createCreditTransaction(
        organizationId,
        planLimits.value,
        "PLAN_GRANT",
        "Monthly plan credit renewal",
        { subscriptionId: subscriptionData.subscription_id }
      );
    }
  } catch (error) {
    console.error("Error handling subscription.renewed event:", error);
    throw error;
  }
}

// Handler for subscription.canceled event
async function handleSubscriptionCanceled(event: WebhookEventType) {
  const subscriptionData = event.data.subscription;
  if (!subscriptionData) {
    return;
  }

  try {
    // Update subscription status
    await prisma.subscription.updateMany({
      where: {
        externalId: subscriptionData.subscription_id,
      },
      data: {
        status: "canceled",
        cancelAtPeriodEnd: false, // It's already canceled
      },
    });
  } catch (error) {
    console.error("Error handling subscription.canceled event:", error);
    throw error;
  }
}

// Handler for payment.succeeded event
async function handlePaymentSucceeded(event: WebhookEventType) {
  const paymentData = event.data.payment;
  if (!paymentData) {
    return;
  }

  const metadata = paymentData.metadata || {};

  try {
    // Store customer ID if present
    if (
      metadata.organizationId &&
      paymentData.customer &&
      paymentData.customer.customer_id
    ) {
      await savePaymentCustomer(
        metadata.organizationId,
        paymentData.customer.customer_id,
        "dodo",
        { source: "payment.succeeded" }
      );
    }

    // Create invoice record
    await prisma.invoice.create({
      data: {
        organizationId: metadata.organizationId,
        subscriptionId: metadata.subscriptionId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: "paid",
        dueDate: new Date(),
        paidAt: new Date(),
        invoiceUrl: paymentData.receipt_url,
        invoiceNumber: `INV-${Date.now()}`,
        paymentIntent: paymentData.payment_id,
        externalId: paymentData.payment_id,
        description: paymentData.description || "Subscription payment",
        metadata: metadata,
      },
    });

    // If this is a one-time credit purchase, add credits
    if (metadata.creditPurchase && metadata.creditAmount) {
      await createCreditTransaction(
        metadata.organizationId,
        parseInt(metadata.creditAmount, 10),
        "PURCHASE",
        "Credit purchase",
        { paymentId: paymentData.payment_id }
      );
    }
  } catch (error) {
    console.error("Error handling payment.succeeded event:", error);
    throw error;
  }
}

// Handler for payment.failed event
async function handlePaymentFailed(event: WebhookEventType) {
  const paymentData = event.data.payment;
  if (!paymentData) {
    return;
  }

  const metadata = paymentData.metadata || {};

  try {
    // Create invoice record with failed status
    await prisma.invoice.create({
      data: {
        organizationId: metadata.organizationId,
        subscriptionId: metadata.subscriptionId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: "failed",
        dueDate: new Date(),
        invoiceNumber: `INV-${Date.now()}`,
        paymentIntent: paymentData.payment_id,
        externalId: paymentData.payment_id,
        description: paymentData.description || "Failed payment",
        metadata: metadata,
      },
    });
  } catch (error) {
    console.error("Error handling payment.failed event:", error);
    throw error;
  }
}
