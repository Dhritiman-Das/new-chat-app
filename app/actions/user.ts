"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { ActionResponse, appErrors } from "@/app/actions/types";
import { prisma } from "@/lib/db/prisma";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/utils/auth";

// Create safe action client
const action = createSafeActionClient();

// Update profile schema
const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  avatarUrl: z.string().optional(),
});

// Delete account schema
const deleteAccountSchema = z.object({
  confirmDelete: z.literal(true),
});

// Update user profile
export const updateProfile = action
  .schema(updateProfileSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const user = await requireAuth();

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: parsedInput.firstName,
          lastName: parsedInput.lastName,
          avatarUrl: parsedInput.avatarUrl,
        },
      });

      // Revalidate user cache
      revalidateTag(`user_${updatedUser.id}`);

      return {
        success: true,
        data: { user: updatedUser },
      };
    } catch (error) {
      console.error("Error updating profile:", error);
      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Failed to update profile",
          code: "UPDATE_FAILED",
        },
      };
    }
  });

// Delete user account
export const deleteAccount = action
  .schema(deleteAccountSchema)
  .action(async (): Promise<ActionResponse> => {
    try {
      const user = await requireAuth();

      // Delete the user
      await prisma.user.delete({
        where: {
          id: user.id,
        },
      });

      // Redirect to sign out
      redirect("/auth/signout");
    } catch (error) {
      console.error("Error deleting account:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR,
      };
    }
  });

// Update just the avatar URL
const updateAvatarSchema = z.object({
  avatarUrl: z.string(),
});

export const updateAvatar = action
  .schema(updateAvatarSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const user = await requireAuth();

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          avatarUrl: parsedInput.avatarUrl,
        },
      });

      return {
        success: true,
        data: { user: updatedUser },
      };
    } catch (error) {
      console.error("Error updating avatar:", error);
      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Failed to update avatar",
          code: "UPDATE_FAILED",
        },
      };
    }
  });
