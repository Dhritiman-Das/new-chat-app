"use server";

import { createClient } from "@/utils/supabase/server";
import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import type { ActionResponse } from "@/app/types/actions";
import { AppError, appErrors } from "@/app/types/errors";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Create a safe action client
const action = createSafeActionClient();

// Schema for sign in
const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Schema for sign up
const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Sign in action
export const signIn = action
  .schema(signInSchema)
  .action(
    async ({ parsedInput: { email, password } }): Promise<ActionResponse> => {
      try {
        const supabase = await createClient();

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return {
            success: false,
            error: {
              code: `auth/${error.name}`,
              message: error.message,
            },
          };
        }

        // Successful login automatically redirects to dashboard via middleware
        return { success: true };
      } catch (error) {
        console.error("Sign in error:", error);
        return {
          success: false,
          error:
            error instanceof AppError
              ? { code: error.code, message: error.message }
              : {
                  code: appErrors.UNEXPECTED_ERROR.code,
                  message: appErrors.UNEXPECTED_ERROR.message,
                },
        };
      }
    }
  );

// Sign up action
export const signUp = action
  .schema(signUpSchema)
  .action(
    async ({ parsedInput: { email, password } }): Promise<ActionResponse> => {
      try {
        const supabase = await createClient();
        const origin = (await headers()).get("origin");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
          },
        });

        if (error) {
          return {
            success: false,
            error: {
              code: `auth/${error.name}`,
              message: error.message,
            },
          };
        }

        return {
          success: true,
          data: {
            message:
              "Thanks for signing up! Please check your email for a verification link.",
          },
        };
      } catch (error) {
        console.error("Sign up error:", error);
        return {
          success: false,
          error:
            error instanceof AppError
              ? { code: error.code, message: error.message }
              : {
                  code: appErrors.UNEXPECTED_ERROR.code,
                  message: appErrors.UNEXPECTED_ERROR.message,
                },
        };
      }
    }
  );

// Sign out action
export const signOut = action.action(async (): Promise<ActionResponse> => {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    // Redirect to sign-in page after sign out
    redirect("/sign-in");

    // This won't be reached due to the redirect
    return { success: true };
  } catch (error) {
    console.error("Sign out error:", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? { code: error.code, message: error.message }
          : {
              code: appErrors.UNEXPECTED_ERROR.code,
              message: appErrors.UNEXPECTED_ERROR.message,
            },
    };
  }
});
