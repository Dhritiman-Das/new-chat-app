"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building } from "@/components/icons";
import Link from "next/link";
import { createBot } from "@/app/actions/bots";
import { ActionResponse } from "@/app/actions/types";
import { TemplateDialog } from "@/app/(protected)/(sidebar)/dashboard/[orgId]/bots/[botId]/settings/template-dialog";

const formSchema = z.object({
  name: z.string().min(2, "Bot name must be at least 2 characters"),
  description: z.string().optional(),
  systemPrompt: z
    .string()
    .min(10, "System prompt must be at least 10 characters"),
  organizationId: z.string().uuid("Please select an organization"),
});

type FormValues = z.infer<typeof formSchema>;

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: string;
  role: string;
}

interface NewBotFormProps {
  organizations: Organization[];
  orgId?: string;
}

export default function NewBotForm({ organizations, orgId }: NewBotFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgIdFromQuery = searchParams.get("org");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    orgId || orgIdFromQuery || ""
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      systemPrompt: "You are a helpful AI assistant.",
      organizationId: orgId || orgIdFromQuery || "",
    },
  });

  // Update selectedOrgId when form value changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "organizationId" && value.organizationId) {
        setSelectedOrgId(value.organizationId as string);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Function to handle system prompt update from template
  const handleApplyTemplate = (newSystemPrompt: string) => {
    form.setValue("systemPrompt", newSystemPrompt);
  };

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      const result = (await createBot(data)) as unknown as ActionResponse<{
        id: string;
      }>;
      if (result && result.success) {
        router.push(
          `/dashboard/${data.organizationId}/bots/${result.data!.id}/overview`
        );
      } else {
        console.error("Error creating bot:", result?.error);
        form.setError("root", {
          message:
            result?.error?.message ||
            "An error occurred while creating the bot",
        });
      }
    } catch (error) {
      console.error("Failed to create bot:", error);
      form.setError("root", {
        message: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot Details</CardTitle>
        <CardDescription>
          Provide basic information about your new bot.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="organizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span>{org.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select which organization this bot belongs to.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Bot" {...field} />
                  </FormControl>
                  <FormDescription>
                    A short, descriptive name for your bot.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A helpful assistant that can answer questions about..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe what your bot does and its capabilities.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>System Prompt</FormLabel>
                    {selectedOrgId && (
                      <TemplateDialog
                        orgId={selectedOrgId}
                        onApplyTemplate={handleApplyTemplate}
                      />
                    )}
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="You are a helpful AI assistant..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Instructions for your bot that define its behavior and
                    capabilities.
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
            <Button variant="outline" asChild>
              <Link href={orgId ? `/dashboard/${orgId}/bots` : "/bots"}>
                Cancel
              </Link>
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Bot"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
