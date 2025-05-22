"use server";

import { prisma } from "@/lib/db/prisma";
import { cache } from "react";
import { requireAuth } from "@/utils/auth";

/**
 * Get organization by slug
 */
export const getOrganization = cache(async (slug: string) => {
  try {
    const user = await requireAuth();

    // Get the organization by slug
    const organization = await prisma.organization.findUnique({
      where: { slug },
      include: {
        users: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
    });

    if (!organization || organization.users.length === 0) {
      return null;
    }

    return {
      ...organization,
      role: organization.users[0].role,
    };
  } catch (error) {
    console.error("Error getting organization:", error);
    return null;
  }
});
