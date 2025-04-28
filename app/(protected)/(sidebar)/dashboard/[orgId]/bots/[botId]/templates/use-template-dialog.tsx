"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Icons } from "@/components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

// Sample interface for template
interface Template {
  id: string;
  name: string;
  description: string;
  categories: { name: string }[];
  usageCount: number;
  // For demo purposes; in real app would fetch this data from template
  placeholderSchema?: {
    placeholders: {
      id: string;
      name: string;
      description: string;
      type: "string" | "text" | "select";
      required: boolean;
      defaultValue: string;
      options?: { value: string; label: string }[];
    }[];
  };
}

interface UseTemplateDialogProps {
  template: Template;
  orgId: string;
  botId: string;
}

interface FormValues {
  [key: string]: string;
}

export function UseTemplateDialog({
  template,
  orgId,
  botId,
}: UseTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter();

  // Mock placeholder schema for demo
  const placeholderSchema = template.placeholderSchema || {
    placeholders: [
      {
        id: "company_name",
        name: "Company Name",
        description: "The name of the company the bot represents",
        type: "string" as const,
        required: true,
        defaultValue: "",
      },
      {
        id: "product_description",
        name: "Product Description",
        description: "Brief description of the main product or service",
        type: "text" as const,
        required: true,
        defaultValue: "",
      },
      {
        id: "tone",
        name: "Conversation Tone",
        description: "The tone the bot should use in conversations",
        type: "select" as const,
        options: [
          { value: "professional", label: "Professional" },
          { value: "friendly", label: "Friendly" },
          { value: "casual", label: "Casual" },
          { value: "formal", label: "Formal" },
        ],
        required: true,
        defaultValue: "professional",
      },
    ],
  };

  // Create form with default values from placeholder schema
  const defaultValues = placeholderSchema.placeholders.reduce<FormValues>(
    (acc, field) => ({ ...acc, [field.id]: field.defaultValue }),
    {}
  );

  const form = useForm<FormValues>({ defaultValues });

  const onSubmit = async (formValues: FormValues) => {
    setIsSubmitting(true);

    try {
      // This would be an API call in a real app
      // For demo, simulate success and redirect to settings
      setTimeout(() => {
        // Success message
        toast("Template applied", {
          description:
            "The template has been applied to your bot's system prompt",
        });

        // Log the values that would be sent to the API
        console.log("Applying template with values:", formValues);

        // Close the dialog
        setOpen(false);

        // Redirect to settings page
        router.push(`/dashboard/${orgId}/bots/${botId}/settings`);
      }, 1000);
    } catch (error) {
      console.error(error);
      toast("Failed to apply template", {
        description: "An error occurred while applying the template",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Use Template</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Use Template: {template.name}</DialogTitle>
            <DialogDescription>
              Fill in the required information to customize this template for
              your bot.
            </DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            <>
              <div className="py-4">
                <p className="text-sm">
                  This template requires the following information to be
                  customized for your bot. Fill in all required fields to
                  continue.
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(() => setStep(2))}
                  className="space-y-4"
                >
                  {placeholderSchema.placeholders.map((field) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={field.id}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>
                            {field.name}
                            {field.required && " *"}
                          </FormLabel>
                          <FormDescription>{field.description}</FormDescription>
                          <FormControl>
                            {field.type === "string" && (
                              <Input {...formField} disabled={isSubmitting} />
                            )}
                            {field.type === "text" && (
                              <Textarea
                                {...formField}
                                disabled={isSubmitting}
                              />
                            )}
                            {field.type === "select" && field.options && (
                              <Select
                                value={formField.value}
                                onValueChange={formField.onChange}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      Preview
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          ) : (
            <>
              <div className="py-4">
                <p className="mb-2 text-sm font-medium">
                  Preview of your customized prompt:
                </p>
                <div className="rounded-md bg-muted p-4 text-sm">
                  <p>
                    You are a helpful AI assistant for{" "}
                    {form.getValues().company_name}.
                  </p>
                  <p className="mt-2">
                    When answering questions about our products, describe them
                    as: {form.getValues().product_description}
                  </p>
                  <p className="mt-2">
                    Maintain a {form.getValues().tone} tone when interacting
                    with our customers.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  onClick={() => onSubmit(form.getValues())}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply to Bot"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
