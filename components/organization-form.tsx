"use client";

import { useState } from "react";
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
}

export default function OrganizationForm({
  organization,
  isOnboarding = false,
}: OrganizationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!organization;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization?.name || "",
      slug: organization?.slug || "",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      let result;

      if (isEditMode && organization) {
        // Update existing organization
        result = (await updateOrganization({
          id: organization.id,
          name: data.name,
          slug: data.slug,
        })) as ActionResponse;
      } else {
        // Create new organization
        result = (await createOrganization({
          name: data.name,
          slug: data.slug,
        })) as ActionResponse;
      }

      if (result && result.success) {
        // Redirect to appropriate page
        if (isOnboarding) {
          router.push("/dashboard");
        } else {
          router.push("/organizations");
        }
        router.refresh();
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
    } finally {
      setIsLoading(false);
    }
  }

  const generateSlug = () => {
    const name = form.getValues("name");
    if (!name) return;

    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, "") // Remove invalid characters
      .replace(/-+/g, "-") // Replace multiple hyphens with a single one
      .replace(/^-|-$/g, ""); // Remove leading and trailing hyphens

    form.setValue("slug", slug, { shouldValidate: true });
  };

  return (
    <Card className="w-full">
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
                    <Input
                      placeholder="Acme Corp"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Only auto-generate slug when creating a new organization
                        // and the user hasn't manually edited the slug yet
                        if (!isEditMode && !form.getValues("slug")) {
                          setTimeout(generateSlug, 200);
                        }
                      }}
                    />
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
                    {!isEditMode && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateSlug}
                      >
                        Generate
                      </Button>
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
          <CardFooter className="flex justify-between">
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
              disabled={isLoading}
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
