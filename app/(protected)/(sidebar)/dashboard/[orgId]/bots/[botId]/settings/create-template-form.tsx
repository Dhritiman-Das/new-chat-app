"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  PlaceholderItem,
  PlaceholderSchema,
} from "../templates/create-template-dialog";
import { createTemplate } from "@/app/actions/templates";

interface CreateTemplateFormValues {
  name: string;
  description: string;
  content: string;
  isPublic: boolean;
  categories: string[];
  placeholderSchema: PlaceholderSchema;
}

interface CreateTemplateFormProps {
  orgId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  onSubmittingChange?: (isSubmitting: boolean) => void;
}

// Sample categories for template creation
const availableCategories = [
  { id: "customer-support", label: "Customer Support" },
  { id: "sales", label: "Sales" },
  { id: "marketing", label: "Marketing" },
  { id: "hr", label: "HR" },
  { id: "product", label: "Product" },
  { id: "technical", label: "Technical" },
];

export function CreateTemplateForm({
  orgId,
  onSuccess,
  onCancel,
  isSubmitting: externalIsSubmitting,
  onSubmittingChange,
}: CreateTemplateFormProps) {
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<string[]>(
    []
  );
  const [selectedPlaceholderId, setSelectedPlaceholderId] = useState<
    string | null
  >(null);

  // Use external isSubmitting if provided, otherwise use internal state
  const isSubmitting = externalIsSubmitting ?? internalIsSubmitting;

  // Notify parent of submitting state changes
  const setIsSubmitting = (value: boolean) => {
    if (onSubmittingChange) {
      onSubmittingChange(value);
    } else {
      setInternalIsSubmitting(value);
    }
  };

  // Form for creating templates
  const form = useForm<CreateTemplateFormValues>({
    defaultValues: {
      name: "",
      description: "",
      content: "",
      isPublic: false,
      categories: [],
      placeholderSchema: {
        placeholders: [],
        version: "1.0",
      },
    },
  });

  // Extract placeholders from content
  useEffect(() => {
    const content = form.watch("content");
    if (!content) return;

    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const matches = [...content.matchAll(placeholderRegex)];
    const placeholders = matches.map((match) => match[1].trim());

    // Filter out duplicates
    const uniquePlaceholders = [...new Set(placeholders)];

    // Update detected placeholders
    setDetectedPlaceholders(uniquePlaceholders);

    // Update placeholder schema with new placeholders that don't exist yet
    const currentSchema = form.getValues("placeholderSchema");
    const existingIds = currentSchema.placeholders.map((p) => p.id);

    const newPlaceholders = uniquePlaceholders
      .filter((id) => !existingIds.includes(id))
      .map((id) => ({
        id,
        name: id
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        description: "",
        type: "string",
        required: true,
        defaultValue: "",
      }));

    if (newPlaceholders.length > 0) {
      form.setValue("placeholderSchema", {
        ...currentSchema,
        placeholders: [...currentSchema.placeholders, ...newPlaceholders],
      });
    }

    // Remove placeholders that no longer exist in the content
    const updatedPlaceholders = currentSchema.placeholders.filter((p) =>
      uniquePlaceholders.includes(p.id)
    );

    if (updatedPlaceholders.length !== currentSchema.placeholders.length) {
      form.setValue("placeholderSchema", {
        ...currentSchema,
        placeholders: updatedPlaceholders,
      });
    }
  }, [form.watch("content")]);

  // Handle create template submission
  const onSubmit = async (values: CreateTemplateFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await createTemplate({
        name: values.name,
        description: values.description,
        content: values.content,
        isPublic: values.isPublic,
        organizationId: orgId,
        categories: values.categories,
        placeholderSchema: values.placeholderSchema,
      });

      if (response && response.data?.success) {
        toast("Template created", {
          description: "Your template has been created successfully",
        });

        // Reset form
        form.reset();
        setDetectedPlaceholders([]);
        setSelectedPlaceholderId(null);

        // Call success callback
        onSuccess?.();
      } else {
        toast("Failed to create template", {
          description:
            response?.data?.error?.message || "An unexpected error occurred",
        });
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast("Failed to create template", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Placeholder management
  const handlePlaceholderSelect = (id: string) => {
    setSelectedPlaceholderId(id);
  };

  const updatePlaceholderField = (
    id: string,
    field: keyof PlaceholderItem,
    value: string | boolean | { value: string; label: string }[]
  ) => {
    const schema = form.getValues("placeholderSchema");
    const updatedPlaceholders = schema.placeholders.map((p) =>
      p.id === id ? { ...p, [field]: value } : p
    );

    form.setValue("placeholderSchema", {
      ...schema,
      placeholders: updatedPlaceholders,
    });
  };

  const selectedPlaceholder = form
    .watch("placeholderSchema")
    .placeholders.find((p) => p.id === selectedPlaceholderId);

  // Reset form when component unmounts or is cancelled
  const handleCancel = () => {
    form.reset();
    setDetectedPlaceholders([]);
    setSelectedPlaceholderId(null);
    onCancel?.();
  };

  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          rules={{ required: "Name is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="E.g., Customer Support Bot"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                A descriptive name for this template
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what this template is for..."
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                A brief description of what this template does
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categories"
          render={() => (
            <FormItem>
              <FormLabel>Categories</FormLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableCategories.map((category) => (
                  <FormField
                    key={category.id}
                    control={form.control}
                    name="categories"
                    render={({ field }) => {
                      return (
                        <Badge
                          variant={
                            field.value?.includes(category.id)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => {
                            if (isSubmitting) return;
                            const updatedCategories = field.value?.includes(
                              category.id
                            )
                              ? field.value.filter((c) => c !== category.id)
                              : [...field.value, category.id];
                            field.onChange(updatedCategories);
                          }}
                        >
                          {category.label}
                        </Badge>
                      );
                    }}
                  />
                ))}
              </div>
              <FormDescription>
                Select categories to help organize and filter templates
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          rules={{ required: "Template content is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter your template with {{placeholders}}..."
                  className="min-h-[200px] font-mono"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                Write your template with placeholders like {"{{"} company_name{" "}
                {"}}"}. Users will be prompted to fill these values when using
                the template.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Public Template</FormLabel>
                <FormDescription>Make available to all users</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {detectedPlaceholders.length > 0 && (
          <div className="rounded-md border p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left side - Placeholders list */}
              <div className="col-span-1">
                <h4 className="text-sm font-medium mb-4">Placeholders</h4>
                <div className="space-y-1">
                  {detectedPlaceholders.map((placeholder) => (
                    <div
                      key={placeholder}
                      className={`px-3 py-2 rounded-md cursor-pointer transition-colors ${
                        selectedPlaceholderId === placeholder
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                      onClick={() => {
                        if (!isSubmitting) {
                          handlePlaceholderSelect(placeholder);
                        }
                      }}
                    >
                      <span className="text-sm font-medium">{placeholder}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right side - Configuration panel */}
              <div className="col-span-2">
                {selectedPlaceholder ? (
                  <div>
                    <h5 className="text-sm font-medium mb-4">
                      Configure Placeholder: {selectedPlaceholder.id}
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      Define how this placeholder will be presented to users
                    </p>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FormLabel>Display Name</FormLabel>
                          <Input
                            value={selectedPlaceholder.name}
                            onChange={(e) =>
                              updatePlaceholderField(
                                selectedPlaceholder.id,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="Human-readable name shown to users"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <FormLabel>Field Type</FormLabel>
                          <Select
                            value={selectedPlaceholder.type}
                            onValueChange={(value) =>
                              updatePlaceholderField(
                                selectedPlaceholder.id,
                                "type",
                                value
                              )
                            }
                            disabled={isSubmitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Type of input field to show" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">Short Text</SelectItem>
                              <SelectItem value="text">Long Text</SelectItem>
                              <SelectItem value="select">Dropdown</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <FormLabel>Description</FormLabel>
                        <Textarea
                          value={selectedPlaceholder.description}
                          onChange={(e) =>
                            updatePlaceholderField(
                              selectedPlaceholder.id,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Help text shown to users when filling this field"
                          disabled={isSubmitting}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FormLabel>Default Value</FormLabel>
                          <Input
                            value={selectedPlaceholder.defaultValue}
                            onChange={(e) =>
                              updatePlaceholderField(
                                selectedPlaceholder.id,
                                "defaultValue",
                                e.target.value
                              )
                            }
                            placeholder="Default value (optional)"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            checked={selectedPlaceholder.required}
                            onCheckedChange={(checked) =>
                              updatePlaceholderField(
                                selectedPlaceholder.id,
                                "required",
                                checked
                              )
                            }
                            disabled={isSubmitting}
                          />
                          <FormLabel>Required field</FormLabel>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Select a placeholder to configure its properties
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
          >
            {isSubmitting ? (
              <>
                <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Template"
            )}
          </Button>
        </div>
      </div>
    </Form>
  );
}
