"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import {
  changePassword,
  setPassword,
  checkUserAuthProvider,
} from "@/app/actions/user";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schema for changing existing password
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Schema for setting password (OAuth users)
const setPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
type SetPasswordForm = z.infer<typeof setPasswordSchema>;

export function PasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Form for changing password
  const changePasswordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Form for setting password
  const setPasswordForm = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Check user auth provider on component mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const result = await checkUserAuthProvider();
        if (result?.success && result.data) {
          setHasPassword(result.data.hasPassword);
          setProviders(result.data.providers);
        }
      } catch (error) {
        console.error("Error checking auth provider:", error);
        toast.error("Failed to load password settings");
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  async function onChangePassword(values: ChangePasswordForm) {
    setIsLoading(true);
    try {
      const result = await changePassword(values);

      if (result && result.data && result.data.success) {
        toast.success("Password updated successfully");
        changePasswordForm.reset();
      } else {
        toast.error(
          result?.data?.error?.message || "Failed to update password"
        );
      }
    } catch (error) {
      toast.error("Something went wrong");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function onSetPassword(values: SetPasswordForm) {
    setIsLoading(true);
    try {
      const result = await setPassword(values);

      if (result && result.data && result.data.success) {
        toast.success("Password set successfully");
        setPasswordForm.reset();
        setHasPassword(true); // Update state to reflect new password
      } else {
        toast.error(result?.data?.error?.message || "Failed to set password");
      }
    } catch (error) {
      toast.error("Something went wrong");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center py-4">
        <Icons.Spinner className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // OAuth user without password
  if (hasPassword === false) {
    return (
      <div className="space-y-4">
        <Alert>
          <Icons.Info className="h-4 w-4" />
          <AlertDescription>
            You signed in using{" "}
            {providers.filter((p) => p !== "email").join(", ")}. Set a password
            to enable email and password sign-in as an alternative.
          </AlertDescription>
        </Alert>

        <Form {...setPasswordForm}>
          <form
            onSubmit={setPasswordForm.handleSubmit(onSetPassword)}
            className="space-y-4"
          >
            <FormField
              control={setPasswordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your new password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Password must be at least 8 characters long
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={setPasswordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your new password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Set Password
            </Button>
          </form>
        </Form>
      </div>
    );
  }

  // User with existing password
  return (
    <div className="space-y-4">
      <Form {...changePasswordForm}>
        <form
          onSubmit={changePasswordForm.handleSubmit(onChangePassword)}
          className="space-y-4"
        >
          <FormField
            control={changePasswordForm.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter your current password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={changePasswordForm.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter your new password"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Password must be at least 8 characters long
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={changePasswordForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Confirm your new password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading && (
              <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update Password
          </Button>
        </form>
      </Form>
    </div>
  );
}
