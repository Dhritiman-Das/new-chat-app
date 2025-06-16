"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { ActionResponse, appErrors } from "@/app/actions/types";
import { prisma } from "@/lib/db/prisma";
import { revalidateTag } from "next/cache";
import { requireAuth } from "@/utils/auth";
import { createServiceRoleClient } from "@/utils/supabase/server";
import * as CACHE_TAGS from "@/lib/constants/cache-tags";

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

// Change password schema
const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .optional(),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Set password schema (for OAuth users)
const setPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
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
      revalidateTag(CACHE_TAGS.USER(updatedUser.id));

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

// Change password action
export const changePassword = action
  .schema(changePasswordSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const user = await requireAuth();
      const supabase = await createServiceRoleClient();

      // For users who already have a password, verify current password first
      if (parsedInput.currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: parsedInput.currentPassword,
        });

        if (signInError) {
          return {
            success: false,
            error: {
              message: "Current password is incorrect",
              code: "INVALID_PASSWORD",
            },
          };
        }
      }

      // Update the password
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: parsedInput.newPassword,
      });

      if (error) {
        return {
          success: false,
          error: {
            message: "Failed to update password. Please try again.",
            code: "PASSWORD_UPDATE_FAILED",
          },
        };
      }

      return {
        success: true,
        data: { message: "Password updated successfully" },
      };
    } catch (error) {
      console.error("Error changing password:", error);
      return {
        success: false,
        error: {
          message: "An unexpected error occurred",
          code: "UNEXPECTED_ERROR",
        },
      };
    }
  });

// Set password action (for OAuth users who don't have a password)
export const setPassword = action
  .schema(setPasswordSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const user = await requireAuth();
      const supabase = await createServiceRoleClient();

      // Set the password for OAuth users
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: parsedInput.newPassword,
      });

      if (error) {
        return {
          success: false,
          error: {
            message: "Failed to set password. Please try again.",
            code: "PASSWORD_SET_FAILED",
          },
        };
      }

      return {
        success: true,
        data: { message: "Password set successfully" },
      };
    } catch (error) {
      console.error("Error setting password:", error);
      return {
        success: false,
        error: {
          message: "An unexpected error occurred",
          code: "UNEXPECTED_ERROR",
        },
      };
    }
  });

// Check if user has password (returns if user signed up with email/password vs OAuth)
export async function checkUserAuthProvider(): Promise<
  ActionResponse<{ hasPassword: boolean; providers: string[] }>
> {
  try {
    const user = await requireAuth();
    const supabase = await createServiceRoleClient();

    // Get user details from Supabase auth
    const { data: authUser, error } = await supabase.auth.admin.getUserById(
      user.id
    );

    if (error || !authUser) {
      return {
        success: false,
        error: {
          message: "Failed to get user information",
          code: "USER_NOT_FOUND",
        },
      };
    }

    // Check if user has identities (OAuth providers)
    const identities = authUser.user?.identities || [];
    const providers = identities.map((identity) => identity.provider);

    // If user only has OAuth identities and no email identity, they likely don't have a password
    const hasEmailIdentity = identities.some(
      (identity) => identity.provider === "email"
    );
    // OAuth users typically only have non-email providers
    const hasPassword = hasEmailIdentity;

    return {
      success: true,
      data: {
        hasPassword: Boolean(hasPassword),
        providers,
      },
    };
  } catch (error) {
    console.error("Error checking auth provider:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Delete user account
export const deleteAccount = action
  .schema(deleteAccountSchema)
  .action(async (): Promise<ActionResponse<{ redirectUrl: string }>> => {
    try {
      const user = await requireAuth();

      // Delete the user from the database
      await prisma.user.delete({
        where: {
          id: user.id,
        },
      });

      // Create a Supabase client with service role key for admin operations
      const supabase = await createServiceRoleClient();

      // Delete the user from Supabase auth system
      const { error } = await supabase.auth.admin.deleteUser(user.id);

      if (error) {
        throw new Error(`Failed to delete auth user: ${error.message}`);
      }

      // Return success with redirect URL instead of calling redirect()
      return {
        success: true,
        data: { redirectUrl: "/sign-in" },
      };
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

      // Revalidate user cache
      revalidateTag(CACHE_TAGS.USER(updatedUser.id));

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
