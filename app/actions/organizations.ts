"use server";

import { getUserOrganizations } from "@/lib/queries/cached-queries";
import { ActionResponse, appErrors } from "./types";
import {
  BillingCycle,
  PlanType,
  SubscriptionStatus,
} from "@/lib/generated/prisma";
import { requireAuth } from "@/utils/auth";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { checkOrganizationSlugAvailability } from "@/lib/queries/cached-queries";
import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

// Create safe action client
const action = createSafeActionClient();

// Types for organization actions
type CreateOrganizationInput = {
  name: string;
  slug: string;
  plan?: string;
  logoUrl?: string;
};

type UpdateOrganizationInput = {
  id: string;
  name?: string;
  slug?: string;
  plan?: string;
  logoUrl?: string;
};

// Schema for slug validation
const slugSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug must contain only lowercase letters, numbers, and hyphens",
    }),
  organizationId: z.string().optional(),
});

// Action to get user organizations
export async function getOrganizationsAction(): Promise<ActionResponse> {
  try {
    const { data: organizations } = await getUserOrganizations();

    return {
      success: true,
      data: organizations,
    };
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to create a new organization
export async function createOrganization(
  data: CreateOrganizationInput
): Promise<ActionResponse> {
  try {
    // Validate input
    if (!data.name || data.name.trim().length < 2) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message: "Organization name must be at least 2 characters",
        },
      };
    }

    if (!data.slug || !/^[a-z0-9-]+$/.test(data.slug)) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message:
            "Slug must contain only lowercase letters, numbers, and hyphens",
        },
      };
    }

    // Get the authenticated user
    const user = await requireAuth();

    // Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: {
        slug: data.slug,
      },
    });

    console.log({
      existingOrg,
      slug: data.slug,
      plan: data.plan,
      logoUrl: data.logoUrl,
      name: data.name,
      user,
    });

    if (existingOrg) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message: "This slug is already taken. Please choose another one.",
        },
      };
    }

    // Create organization and add user as owner
    const organization = await prisma.$transaction(async (tx) => {
      // Create the organization
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug: data.slug,
          plan: (data.plan as PlanType) || PlanType.HOBBY,
          logoUrl: data.logoUrl,
        },
      });

      // Add the user as an owner
      await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "OWNER",
        },
      });

      // Create a subscription record with trial status
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          planType: PlanType.HOBBY,
          status: SubscriptionStatus.TRIALING, // Use a specific status for trial
          billingCycle: BillingCycle.MONTHLY,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndDate,
        },
      });

      return org;
    });

    // Revalidate cache
    revalidateTag(`user_organizations_${user.id}`);

    return {
      success: true,
      data: organization,
    };
  } catch (error) {
    console.error("Error creating organization:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to update an organization
export async function updateOrganization(
  data: UpdateOrganizationInput
): Promise<ActionResponse> {
  try {
    if (!data.id) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message: "Organization ID is required",
        },
      };
    }

    // Validate slug if provided
    if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message:
            "Slug must contain only lowercase letters, numbers, and hyphens",
        },
      };
    }

    // Get the authenticated user
    const user = await requireAuth();

    // Check if user has permission to update this organization
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
        organizationId: data.id,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });

    if (!userOrg) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED,
      };
    }

    // Check if slug is already taken by another organization
    if (data.slug) {
      const existingOrg = await prisma.organization.findFirst({
        where: {
          slug: data.slug,
          id: {
            not: data.id,
          },
        },
      });

      if (existingOrg) {
        return {
          success: false,
          error: {
            ...appErrors.INVALID_INPUT,
            message: "This slug is already taken. Please choose another one.",
          },
        };
      }
    }

    // Update the organization
    const organization = await prisma.organization.update({
      where: {
        id: data.id,
      },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.plan && { plan: data.plan as PlanType }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      },
    });

    // Revalidate cache
    revalidateTag(`user_organizations_${user.id}`);

    return {
      success: true,
      data: organization,
    };
  } catch (error) {
    console.error("Error updating organization:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to check slug availability
export const checkSlugAvailability = action
  .schema(slugSchema)
  .action(
    async ({
      parsedInput,
    }): Promise<ActionResponse<{ available: boolean; slug: string }>> => {
      try {
        const { slug, organizationId } = parsedInput;

        // Check if slug is available
        const { data } = await checkOrganizationSlugAvailability(
          slug,
          organizationId
        );

        return {
          success: true,
          data,
        };
      } catch (error) {
        console.error("Error checking slug availability:", error);
        return {
          success: false,
          error: appErrors.UNEXPECTED_ERROR,
        };
      }
    }
  );
