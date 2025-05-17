"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Icons } from "@/components/icons";
import { Switch } from "@/components/ui/switch";
import { createTemplate } from "@/app/actions/templates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface PlaceholderItem {
  id: string;
  name: string;
  description: string;
  type: string;
  required: boolean;
  defaultValue: string;
  options?: { value: string; label: string }[];
}

export interface PlaceholderSchema {
  placeholders: PlaceholderItem[];
  version: string;
}

interface FormValues {
  name: string;
  description: string;
  content: string;
  isPublic: boolean;
  categories: string[];
  placeholderSchema: PlaceholderSchema;
}

export default function CreateTemplateDialog({
  orgId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  botId,
}: {
  orgId: string;
  botId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedPlaceholderId, setSelectedPlaceholderId] = useState<
    string | null
  >(null);
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<string[]>(
    []
  );

  // Sample categories for demo
  const availableCategories = [
    { id: "customer-support", label: "Customer Support" },
    { id: "sales", label: "Sales" },
    { id: "marketing", label: "Marketing" },
    { id: "hr", label: "HR" },
    { id: "product", label: "Product" },
    { id: "technical", label: "Technical" },
  ];

  const form = useForm<FormValues>({
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

  const resetAndClose = () => {
    form.reset();
    setStep(1);
    setOpen(false);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      // Call the createTemplate action with proper parameters
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

        // Reset form and close dialog
        resetAndClose();
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Icons.Add className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </DialogTrigger>
      <DialogContent
        className={"lg:max-w-screen-lg overflow-y-scroll max-h-screen"}
      >
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Create a reusable template with placeholders for your bot prompts.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(() => setStep(2))}
              className="space-y-4"
            >
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
                                  const updatedCategories =
                                    field.value?.includes(category.id)
                                      ? field.value.filter(
                                          (c) => c !== category.id
                                        )
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
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Public Template
                      </FormLabel>
                      <FormDescription>
                        Make this template available to all users of the
                        platform
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resetAndClose()}
                >
                  Cancel
                </Button>
                <Button type="submit">Continue</Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Template Content</TabsTrigger>
                  <TabsTrigger value="placeholders">
                    Placeholders ({detectedPlaceholders.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="content">
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
                          />
                        </FormControl>
                        <FormDescription>
                          Write your template with placeholders like {"{{"}{" "}
                          company_name {"}}"}. Users will be prompted to fill
                          these values when using the template.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-md bg-muted p-4 mt-4">
                    <h4 className="text-sm font-medium mb-2">
                      Placeholders Help
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Use double curly braces to create placeholders:{" "}
                      {"{{placeholder_name}}"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Example: You are a helpful assistant for{" "}
                      {"{{company_name}}"} specializing in {"{{industry}}"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-3">
                      Detected placeholders:{" "}
                      {detectedPlaceholders.join(", ") || "None"}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="placeholders">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 border rounded-md h-[400px] overflow-y-auto">
                      <div className="p-4 border-b">
                        <h3 className="font-medium">Placeholders</h3>
                      </div>
                      <div className="p-2">
                        {detectedPlaceholders.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">
                            No placeholders detected. Add placeholders to your
                            template using {"{{placeholder_name}}"} syntax.
                          </p>
                        ) : (
                          detectedPlaceholders.map((id) => (
                            <div
                              key={id}
                              className={`p-2 rounded-md cursor-pointer hover:bg-muted ${
                                selectedPlaceholderId === id ? "bg-muted" : ""
                              }`}
                              onClick={() => handlePlaceholderSelect(id)}
                            >
                              <p className="text-sm font-medium">{id}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      {selectedPlaceholder ? (
                        <Card>
                          <CardHeader>
                            <CardTitle>
                              Configure Placeholder: {selectedPlaceholder.id}
                            </CardTitle>
                            <CardDescription>
                              Define how this placeholder will be presented to
                              users
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
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
                                  placeholder="Display name for this field"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Human-readable name shown to users
                                </p>
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
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select field type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="string">
                                      Short Text
                                    </SelectItem>
                                    <SelectItem value="text">
                                      Long Text
                                    </SelectItem>
                                    <SelectItem value="select">
                                      Dropdown
                                    </SelectItem>
                                    <SelectItem value="number">
                                      Number
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  Type of input field to show
                                </p>
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
                                placeholder="Instructions for filling this field"
                              />
                              <p className="text-xs text-muted-foreground">
                                Help text shown to users when filling this field
                              </p>
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
                                />
                              </div>
                              <div className="flex items-center space-x-2 pt-8">
                                <Switch
                                  id="required"
                                  checked={selectedPlaceholder.required}
                                  onCheckedChange={(checked) =>
                                    updatePlaceholderField(
                                      selectedPlaceholder.id,
                                      "required",
                                      checked
                                    )
                                  }
                                />
                                <FormLabel
                                  htmlFor="required"
                                  className="cursor-pointer"
                                >
                                  Required field
                                </FormLabel>
                              </div>
                            </div>

                            {selectedPlaceholder.type === "select" && (
                              <div className="space-y-2">
                                <FormLabel>Options (one per line)</FormLabel>
                                <Textarea
                                  placeholder="value:label (one per line)&#10;professional:Professional&#10;friendly:Friendly"
                                  value={(selectedPlaceholder.options || [])
                                    .map((o) => `${o.value}:${o.label}`)
                                    .join("\n")}
                                  onChange={(e) => {
                                    const lines = e.target.value.split("\n");
                                    const options = lines
                                      .filter((line) => line.includes(":"))
                                      .map((line) => {
                                        const [value, label] = line.split(":");
                                        return {
                                          value: value.trim(),
                                          label: label.trim(),
                                        };
                                      });
                                    updatePlaceholderField(
                                      selectedPlaceholder.id,
                                      "options",
                                      options
                                    );
                                  }}
                                  className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Enter options in format: value:label (one per
                                  line)
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="flex h-full items-center justify-center border rounded-md p-8">
                          <div className="text-center">
                            <Icons.FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-medium">
                              Select a placeholder
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Click on a placeholder from the list to configure
                              its properties
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Template"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
