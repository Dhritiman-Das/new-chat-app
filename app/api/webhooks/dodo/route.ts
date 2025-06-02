import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  PrismaClient,
  PlanType,
  SubscriptionStatus,
} from "@/lib/generated/prisma";
import { getPaymentProvider } from "@/lib/payment/factory";
import {
  createCreditTransaction,
  savePaymentCustomer,
} from "@/lib/payment/billing-service";
import { redis } from "@/lib/db/kv";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define proper types for webhook events
import {
  WebhookEventData,
  DodoSubscriptionData,
  DodoPaymentData,
} from "@/lib/payment/types";
import { mapProductIdToPlanType } from "@/lib/payment/billing-service";

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

    // Deduplication logic using Redis
    const webhookId = webhookHeaders["webhook-id"];
    if (webhookId) {
      const dodoEventKey = `dodo:webhook:${webhookId}`;
      const isDuplicate = await redis.get(dodoEventKey);
      if (isDuplicate) {
        console.log("Duplicate Dodo webhook event, skipping:", webhookId);
        return new NextResponse("Webhook already processed", { status: 200 });
      }
      // Mark this webhook as processed for 5 minutes
      await redis.set(dodoEventKey, "1", { ex: 300 });
    }

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

      case "subscription.plan_changed":
        await handleSubscriptionPlanChanged(event);
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
  // For subscription events, cast the data to DodoSubscriptionData
  const subscriptionData = event.data as DodoSubscriptionData;
  if (!subscriptionData || !subscriptionData.subscription_id) {
    console.error("No valid subscription data in event");
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
      // Retrieve the pending plan type if it exists in metadata
      const subscriptionMetadata =
        (existingSubscription.metadata as Record<string, unknown>) || {};
      const pendingPlanType =
        (subscriptionMetadata.pendingPlanType as string) || planType;

      // Update existing subscription
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          // If there was a pending plan type, apply it now
          planType: pendingPlanType as PlanType,
          currentPeriodStart: subscriptionData.previous_billing_date
            ? new Date(subscriptionData.previous_billing_date)
            : new Date(),
          currentPeriodEnd: subscriptionData.next_billing_date
            ? new Date(subscriptionData.next_billing_date)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days if not provided
          cancelAtPeriodEnd: !!subscriptionData.cancelled_at,
          metadata: {
            ...subscriptionMetadata,
            pendingPlanType: null, // Clear the pending plan type
            paymentInitiated: null, // Clear the payment initiated flag
            paymentConfirmed: true,
            paymentConfirmedAt: new Date().toISOString(),
          },
        },
      });

      // Update organization plan type only now that payment is confirmed
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          plan: pendingPlanType as PlanType,
        },
      });
    } else {
      // Create new subscription
      await prisma.subscription.create({
        data: {
          organizationId,
          externalId: subscriptionData.subscription_id,
          planType: planType as PlanType,
          status: SubscriptionStatus.ACTIVE,
          billingCycle:
            subscriptionData.payment_frequency_interval === "Year"
              ? "YEARLY"
              : "MONTHLY",
          currentPeriodStart: subscriptionData.previous_billing_date
            ? new Date(subscriptionData.previous_billing_date)
            : new Date(),
          currentPeriodEnd: subscriptionData.next_billing_date
            ? new Date(subscriptionData.next_billing_date)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days if not provided
          cancelAtPeriodEnd: !!subscriptionData.cancelled_at,
          metadata: {
            ...metadata,
            paymentConfirmed: true,
            paymentConfirmedAt: new Date().toISOString(),
          },
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
  const subscriptionData = event.data as DodoSubscriptionData;
  if (!subscriptionData || !subscriptionData.subscription_id) {
    console.error("No valid subscription data in event");
    return;
  }

  try {
    // Update subscription status
    await prisma.subscription.updateMany({
      where: {
        externalId: subscriptionData.subscription_id,
      },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });
  } catch (error) {
    console.error("Error handling subscription.on_hold event:", error);
    throw error;
  }
}

// Handler for subscription.failed event
async function handleSubscriptionFailed(event: WebhookEventType) {
  const subscriptionData = event.data as DodoSubscriptionData;
  if (!subscriptionData || !subscriptionData.subscription_id) {
    console.error("No valid subscription data in event");
    return;
  }

  try {
    // Update subscription status
    await prisma.subscription.updateMany({
      where: {
        externalId: subscriptionData.subscription_id,
      },
      data: {
        status: SubscriptionStatus.UNPAID,
      },
    });
  } catch (error) {
    console.error("Error handling subscription.failed event:", error);
    throw error;
  }
}

// Handler for subscription.renewed event
async function handleSubscriptionRenewed(event: WebhookEventType) {
  const subscriptionData = event.data as DodoSubscriptionData;
  if (!subscriptionData || !subscriptionData.subscription_id) {
    console.error("No valid subscription data in event");
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
        currentPeriodStart: subscriptionData.previous_billing_date
          ? new Date(subscriptionData.previous_billing_date)
          : new Date(),
        currentPeriodEnd: subscriptionData.next_billing_date
          ? new Date(subscriptionData.next_billing_date)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days if not provided
        status: SubscriptionStatus.ACTIVE,
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
  const subscriptionData = event.data as DodoSubscriptionData;
  if (!subscriptionData || !subscriptionData.subscription_id) {
    console.error("No valid subscription data in event");
    return;
  }

  try {
    // Update subscription status
    await prisma.subscription.updateMany({
      where: {
        externalId: subscriptionData.subscription_id,
      },
      data: {
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: false, // It's already canceled
      },
    });
  } catch (error) {
    console.error("Error handling subscription.canceled event:", error);
    throw error;
  }
}

// Handler for subscription.plan_changed event
async function handleSubscriptionPlanChanged(event: WebhookEventType) {
  const subscriptionData = event.data as DodoSubscriptionData;
  if (!subscriptionData || !subscriptionData.subscription_id) {
    console.error("No valid subscription data in event");
    return;
  }

  const metadata = subscriptionData.metadata || {};
  const organizationId = metadata.organizationId;

  if (!organizationId) {
    console.error("No organizationId in subscription metadata");
    return;
  }

  // Instead of getting plan type from metadata, map it from the new product_id
  // The product_id field contains the updated product after plan change
  const productId = subscriptionData.product_id;

  if (!productId) {
    console.error("No product_id in subscription data");
    return;
  }

  try {
    // First, map the product_id to a plan type
    // This function should be similar to the reverse of getProductId in billing-service.ts
    const newPlanType = await mapProductIdToPlanType(productId);

    // Get the existing subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        externalId: subscriptionData.subscription_id,
      },
    });

    if (!existingSubscription) {
      console.error(
        `Subscription not found for plan change: ${subscriptionData.subscription_id}`
      );
      return;
    }

    // Update the subscription with new plan type and dates
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        planType: newPlanType as PlanType,
        currentPeriodStart: subscriptionData.previous_billing_date
          ? new Date(subscriptionData.previous_billing_date)
          : new Date(),
        currentPeriodEnd: subscriptionData.next_billing_date
          ? new Date(subscriptionData.next_billing_date)
          : existingSubscription.currentPeriodEnd,
        billingCycle:
          subscriptionData.payment_frequency_interval === "Year"
            ? "YEARLY"
            : "MONTHLY",
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // Update organization's plan
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan: newPlanType as PlanType,
      },
    });

    // If the new plan has message credits, grant them
    const planLimits = await prisma.planLimit.findFirst({
      where: {
        planType: newPlanType as PlanType,
        feature: {
          name: "message_credits",
        },
      },
      include: {
        feature: true,
      },
    });

    if (planLimits && !planLimits.isUnlimited) {
      // Calculate prorated credits based on days remaining in billing cycle
      const now = new Date();
      const endDate = subscriptionData.next_billing_date
        ? new Date(subscriptionData.next_billing_date)
        : existingSubscription.currentPeriodEnd;

      const totalDaysInPeriod = Math.floor(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const daysInMonth = 30; // Simplified calculation
      const prorationFactor = Math.max(0, totalDaysInPeriod / daysInMonth);
      const proratedCredits = Math.floor(planLimits.value * prorationFactor);

      if (proratedCredits > 0) {
        await createCreditTransaction(
          organizationId,
          proratedCredits,
          "PLAN_GRANT",
          "Plan change credit allocation (prorated)",
          {
            subscriptionId: subscriptionData.subscription_id,
            previousPlanType: existingSubscription.planType,
            newPlanType,
          }
        );
      }
    }
  } catch (error) {
    console.error("Error handling subscription.plan_changed event:", error);
    throw error;
  }
}

// Handler for payment.succeeded event
async function handlePaymentSucceeded(event: WebhookEventType) {
  const paymentData = event.data as DodoPaymentData;
  if (!paymentData || !paymentData.payment_id) {
    console.error("No valid payment data in event");
    return;
  }

  const metadata = paymentData.metadata || {};

  try {
    // If this is a subscription payment, update subscription details
    if (paymentData.subscription_id) {
      // Find subscription by external ID
      const subscription = await prisma.subscription.findFirst({
        where: {
          externalId: paymentData.subscription_id,
        },
      });

      if (subscription) {
        const subscriptionMetadata =
          (subscription.metadata as Record<string, unknown>) || {};
        const pendingPlanType = subscriptionMetadata.pendingPlanType as string;
        const organizationId = subscription.organizationId;

        // Update subscription status to active and apply any pending plan changes
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            // If there was a pending plan type, apply it now
            ...(pendingPlanType
              ? { planType: pendingPlanType as PlanType }
              : {}),
            metadata: {
              ...subscriptionMetadata,
              pendingPlanType: null, // Clear the pending plan type
              paymentInitiated: null, // Clear the payment initiated flag
              paymentConfirmed: true,
              paymentConfirmedAt: new Date().toISOString(),
              lastPaymentId: paymentData.payment_id,
            },
          },
        });

        // If there was a pending plan type, update the organization plan as well
        if (pendingPlanType) {
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              plan: pendingPlanType as PlanType,
            },
          });

          // Check if credits need to be granted for the new plan
          const planLimits = await prisma.planLimit.findFirst({
            where: {
              planType: pendingPlanType as PlanType,
              feature: {
                name: "message_credits",
              },
            },
            include: {
              feature: true,
            },
          });

          if (planLimits && !planLimits.isUnlimited) {
            // Grant credits for the new plan (only on plan change)
            await createCreditTransaction(
              organizationId,
              planLimits.value,
              "PLAN_GRANT",
              "Plan upgrade credit allocation",
              {
                subscriptionId: paymentData.subscription_id,
                paymentId: paymentData.payment_id,
              }
            );
          }
        }
      }
    }

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
        subscriptionId: paymentData.subscription_id,
        amount: paymentData.total_amount,
        currency: paymentData.currency,
        status: paymentData.status,
        dueDate: new Date(),
        paidAt: new Date(),
        invoiceUrl: paymentData.payment_link,
        invoiceNumber: `INV-${Date.now()}`,
        paymentIntent: paymentData.payment_id,
        externalId: paymentData.payment_id,
        description: metadata.description || "Subscription payment",
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
        {
          paymentId: paymentData.payment_id,
          creditAmount: metadata.creditAmount,
          planType: metadata.planType,
        }
      );
    }
  } catch (error) {
    console.error("Error handling payment.succeeded event:", error);
    throw error;
  }
}

// Handler for payment.failed event
async function handlePaymentFailed(event: WebhookEventType) {
  const paymentData = event.data as DodoPaymentData;
  if (!paymentData || !paymentData.payment_id) {
    console.error("No valid payment data in event");
    return;
  }

  const metadata = paymentData.metadata || {};

  try {
    // Check if we have a valid subscription ID
    const subscriptionId =
      metadata.subscriptionId || paymentData.subscription_id;
    let validSubscriptionId = null;

    if (subscriptionId) {
      // Verify that the subscription exists
      const subscription = await prisma.subscription.findFirst({
        where: {
          externalId: subscriptionId,
        },
      });

      if (subscription) {
        validSubscriptionId = subscription.id;
      } else {
        console.log(
          `Warning: Referenced subscription ${subscriptionId} not found in database`
        );
      }
    }

    // Create invoice record with failed status
    await prisma.invoice.create({
      data: {
        organizationId: metadata.organizationId,
        subscriptionId: validSubscriptionId, // Only use subscription ID if valid
        amount: paymentData.total_amount,
        currency: paymentData.currency,
        status: "failed",
        dueDate: new Date(),
        invoiceNumber: `INV-${Date.now()}`,
        paymentIntent: paymentData.payment_id,
        externalId: paymentData.payment_id,
        description:
          metadata.description ||
          `Failed payment: ${paymentData.error_message || "Unknown error"}`,
        metadata: metadata,
      },
    });
  } catch (error) {
    console.error("Error handling payment.failed event:", error);
    throw error;
  }
}
