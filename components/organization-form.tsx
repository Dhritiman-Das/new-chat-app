"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { ActionResponse } from "@/app/actions/types";
import {
  createOrganization,
  updateOrganization,
} from "@/app/actions/organizations";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/icons";

const slugRegex = /^[a-z0-9-]+$/;

const formSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(63, "Slug must be less than 64 characters")
    .regex(
      slugRegex,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  plan?: string;
}

interface OrganizationFormProps {
  organization?: Organization;
  isOnboarding?: boolean;
  redirectPath?: string;
}

export default function OrganizationForm({
  organization,
  isOnboarding = false,
  redirectPath,
}: OrganizationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "available" | "unavailable" | "unchanged" | null
  >(null);
  const isEditMode = !!organization;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousSlugRef = useRef<string>(organization?.slug || "");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization?.name || "",
      slug: organization?.slug || "",
    },
  });

  const generateSlug = (name: string) => {
    if (!name) return "";

    return name
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, "") // Remove invalid characters
      .replace(/-+/g, "-") // Replace multiple hyphens with a single one
      .replace(/^-|-$/g, ""); // Remove leading and trailing hyphens
  };

  // Check if slug is available
  const checkSlug = useCallback(
    async (slug: string) => {
      if (!slug || slug.length < 2 || !slugRegex.test(slug)) return;

      // Skip the check if the slug hasn't changed from the previous value
      if (slug === previousSlugRef.current) return;

      // Update the previous slug reference
      previousSlugRef.current = slug;

      // If we're in edit mode and the slug hasn't changed, mark it as unchanged
      if (isEditMode && organization?.slug === slug) {
        setSlugStatus("unchanged");
        return;
      }

      setIsCheckingSlug(true);
      try {
        // Build URL with query parameters
        const url = new URL(
          "/api/organization/slug-check",
          window.location.origin
        );
        url.searchParams.append("slug", slug);
        if (organization?.id) {
          url.searchParams.append("excludeOrgId", organization.id);
        }

        // Fetch from the API
        const response = await fetch(url.toString());
        const data = await response.json();

        if (response.ok) {
          setSlugStatus(data.available ? "available" : "unavailable");

          if (!data.available) {
            form.setError("slug", {
              message: "This slug is already taken. Please choose another one.",
            });
          } else {
            form.clearErrors("slug");
          }
        }
      } catch (error) {
        console.error("Error checking slug:", error);
      } finally {
        setIsCheckingSlug(false);
      }
    },
    [isEditMode, organization, form]
  );

  // Watch the name field to update slug automatically
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Always update slug when name changes (both in create and edit mode)
      if (name === "name" && value.name) {
        const newSlug = generateSlug(value.name);

        // Only update slug if it's different from the current value
        if (newSlug !== form.getValues("slug")) {
          form.setValue("slug", newSlug, { shouldValidate: true });
        }
      }

      // Check slug availability when slug changes (with debounce)
      if (name === "slug" && value.slug) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          // Only check if the slug has actually changed
          const currentSlug = value.slug || "";
          if (currentSlug !== previousSlugRef.current) {
            checkSlug(currentSlug);
          }
        }, 1000); // 1 second debounce
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [form, isEditMode, checkSlug]);

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      let result: ActionResponse;

      if (isEditMode && organization) {
        // Update existing organization
        result = await updateOrganization({
          id: organization.id,
          name: data.name,
          slug: data.slug,
        });
      } else {
        // Create new organization
        result = await createOrganization({
          name: data.name,
          slug: data.slug,
        });
      }

      if (result?.success) {
        // Redirect to appropriate page without resetting loading state
        if (isOnboarding) {
          if (redirectPath) {
            router.push(redirectPath);
          } else {
            router.push("/dashboard");
          }
        } else {
          router.push("/organizations");
        }
        router.refresh();
        // Don't set loading to false here, maintain loading state during navigation
        return;
      } else {
        console.error("Error with organization:", result?.error);

        // Handle specific error cases
        if (result?.error?.message?.includes("slug is already taken")) {
          form.setError("slug", {
            message: "This slug is already taken. Please choose another one.",
          });
        } else {
          form.setError("root", {
            message:
              result?.error?.message ||
              (isEditMode
                ? "An error occurred while updating the organization"
                : "An error occurred while creating the organization"),
          });
        }
      }
    } catch (error) {
      console.error("Failed to submit organization:", error);
      form.setError("root", {
        message: "An unexpected error occurred",
      });
    }

    // Only reset loading state if there was an error
    setIsLoading(false);
  }

  return (
    <Card className="">
      <CardHeader>
        <CardTitle>
          {isEditMode ? "Update Organization" : "Create Your Organization"}
        </CardTitle>
        <CardDescription>
          {isEditMode
            ? "Update your organization details"
            : "Set up your organization to collaborate with your team"}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" {...field} />
                  </FormControl>
                  <FormDescription>
                    The name of your organization
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Slug</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input placeholder="acme-corp" {...field} />
                    </FormControl>
                    {isCheckingSlug && (
                      <Icons.Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!isCheckingSlug && slugStatus === "available" && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200"
                      >
                        Available
                      </Badge>
                    )}
                    {!isCheckingSlug && slugStatus === "unavailable" && (
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200"
                      >
                        Unavailable
                      </Badge>
                    )}
                  </div>
                  <FormDescription>
                    Used in URLs and API references. Only lowercase letters,
                    numbers, and hyphens.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <div className="text-destructive text-sm mt-2">
                {form.formState.errors.root.message}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between pt-6">
            {!isOnboarding && (
              <Button variant="outline" asChild>
                <Link
                  href={
                    isEditMode
                      ? `/organizations/${organization?.id}`
                      : "/organizations"
                  }
                >
                  Cancel
                </Link>
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                isLoading || slugStatus === "unavailable" || isCheckingSlug
              }
              className={isOnboarding ? "w-full" : ""}
            >
              {isLoading
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update Organization"
                : "Create Organization"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
