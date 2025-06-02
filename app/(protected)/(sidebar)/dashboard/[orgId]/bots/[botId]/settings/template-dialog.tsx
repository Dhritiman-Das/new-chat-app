"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryState } from "nuqs";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  PlaceholderItem,
  PlaceholderSchema,
} from "../templates/create-template-dialog";

interface TemplateDialogProps {
  orgId: string;
  onApplyTemplate: (newSystemPrompt: string) => void;
}

interface FormValues {
  [key: string]: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  content: string;
  placeholderSchema: PlaceholderSchema;
  usageCount: number;
  categories: { id: string; name: string; slug: string }[];
}

export function TemplateDialog({
  orgId,
  onApplyTemplate,
}: TemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"browse" | "edit">("browse");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [search, setSearch] = useQueryState("search");
  const [tab, setTab] = useQueryState("tab", { defaultValue: "public" });
  const [category, setCategory] = useQueryState("category");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string }[]
  >([]);

  // Form for template placeholder values
  const form = useForm<FormValues>({
    defaultValues: {},
  });

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/templates/categories");
        const data = await response.json();

        if (data.success) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Load templates based on active tab
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      let url = "/api/templates";

      if (tab === "organization") {
        url += `/organization/${orgId}`;
      } else if (tab === "my") {
        url += "/user";
      } else {
        url += "/public";
      }

      // Add search and category filters if present
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category) params.append("category", category);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          setTemplates(data.data);
        } else {
          setTemplates([]);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchTemplates();
    }
  }, [tab, search, category, orgId, open]);

  // Reset everything when dialog closes
  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setStep("browse");
      setSelectedTemplate(null);
      form.reset();
    }
  };

  // Select a template and prepare form
  const selectTemplate = (template: Template) => {
    setSelectedTemplate(template);

    // Extract placeholders from template and set default values
    const placeholders = template.placeholderSchema?.placeholders || [];
    const defaultValues = placeholders.reduce<FormValues>(
      (acc, field: PlaceholderItem) => ({
        ...acc,
        [field.id]: field.defaultValue || "",
      }),
      {}
    );

    form.reset(defaultValues);
    setStep("edit");
  };

  // Handle form submission to apply template
  const onSubmit = async (
    values: FormValues,
    event?: React.BaseSyntheticEvent
  ) => {
    if (!selectedTemplate) return;

    // Prevent event propagation to parent form
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setIsSubmitting(true);

    try {
      // Format the template with the provided values
      let formattedPrompt = selectedTemplate.content;

      // Replace placeholders with values
      for (const [key, value] of Object.entries(values)) {
        formattedPrompt = formattedPrompt.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, "g"),
          value
        );
      }

      // Pass the formatted prompt to the parent component
      onApplyTemplate(formattedPrompt);

      toast("Template applied", {
        description: "System prompt updated",
      });

      // Close the dialog
      handleDialogChange(false);
    } catch (error) {
      console.error("Error formatting template:", error);
      toast("Failed to apply template", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview the template with filled placeholder values
  const previewTemplate = () => {
    if (!selectedTemplate) return "";

    let content = selectedTemplate.content;
    const values = form.getValues();

    // Replace placeholders
    Object.entries(values).forEach(([key, value]) => {
      content = content.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, "g"),
        value || `{{${key}}}`
      );
    });

    return content;
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value || null);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8">
          <Icons.LayoutTemplate className="mr-2 h-4 w-4" />
          Choose from Templates
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        {step === "browse" ? (
          <>
            <DialogHeader>
              <DialogTitle>Template Library</DialogTitle>
              <DialogDescription>
                Choose a template to customize your bot&apos;s system prompt
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 my-4">
              <Input
                placeholder="Search templates..."
                className="w-full"
                value={search || ""}
                onChange={handleSearch}
              />
              <Select
                value={category || "all"}
                onValueChange={(value) =>
                  setCategory(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={tab || "public"} onValueChange={setTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="public" className="w-[200px]">
                  Public Templates
                </TabsTrigger>
                <TabsTrigger value="organization" className="w-[200px]">
                  Organization Templates
                </TabsTrigger>
                <TabsTrigger value="my" className="w-[200px]">
                  My Templates
                </TabsTrigger>
              </TabsList>

              <TabsContent value="public" className="mt-0">
                {renderTemplatesList()}
              </TabsContent>

              <TabsContent value="organization" className="mt-0">
                {renderTemplatesList()}
              </TabsContent>

              <TabsContent value="my" className="mt-0">
                {renderTemplatesList()}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                Customize Template: {selectedTemplate?.name}
              </DialogTitle>
              <DialogDescription>
                Fill in the required information to customize this template for
                your bot
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <div className="space-y-4">
                {selectedTemplate?.placeholderSchema?.placeholders?.map(
                  (field: PlaceholderItem) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={field.id}
                      rules={{
                        required: field.required
                          ? `${field.name} is required`
                          : false,
                      }}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>
                            {field.name}
                            {field.required && " *"}
                          </FormLabel>
                          <FormDescription>{field.description}</FormDescription>
                          {field.type === "string" && (
                            <FormControl>
                              <Input {...formField} disabled={isSubmitting} />
                            </FormControl>
                          )}
                          {field.type === "text" && (
                            <FormControl>
                              <Textarea
                                {...formField}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                          )}
                          {field.type === "select" && field.options && (
                            <FormControl>
                              <Select
                                value={formField.value}
                                onValueChange={formField.onChange}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options.map(
                                    (option: {
                                      value: string;
                                      label: string;
                                    }) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )
                )}

                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2">Preview:</h3>
                  <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
                    {previewTemplate()}
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("browse")}
                  >
                    Back to Templates
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={form.handleSubmit(onSubmit)}
                  >
                    {isSubmitting ? (
                      <>
                        <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      "Apply Template"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  // Helper function to render templates list
  function renderTemplatesList() {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }

    if (templates.length === 0) {
      return (
        <div className="text-center py-8">
          <Icons.File className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
          <p className="text-muted-foreground">
            {tab === "public"
              ? "There are no public templates available yet."
              : tab === "organization"
              ? "Your organization has not created any templates yet."
              : "You haven't created any templates yet."}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <div className="flex flex-wrap gap-1 mt-1">
                {template.categories.map((category) => (
                  <Badge
                    key={category.id}
                    variant="secondary"
                    className="text-xs"
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {template.description}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Used {template.usageCount} times
              </div>
              <Button
                type="button"
                onClick={() => selectTemplate(template)}
                size="sm"
              >
                Use Template
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
}
