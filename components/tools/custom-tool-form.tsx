"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/icons";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { createCustomTool, updateCustomTool } from "@/app/actions/custom-tools";

interface Parameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  required: boolean;
  enumValues?: string[];
  itemsType?: "string" | "number" | "boolean" | "object";
}

interface HttpHeader {
  name: string;
  value: string;
}

interface FormData {
  name: string;
  description: string;
  async: boolean;
  strict: boolean;
  parameters: Parameter[];
  serverUrl: string;
  secretToken: string;
  timeout: number;
  httpHeaders: HttpHeader[];
}

interface CustomToolFormProps {
  botId: string;
  orgId: string;
  initialData?: Partial<FormData & { toolId: string }>;
  mode?: "create" | "edit";
}

const PARAMETER_TYPES = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "object", label: "Object" },
  { value: "array", label: "Array" },
] as const;

const ARRAY_ITEM_TYPES = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "object", label: "Object" },
] as const;

// Validation schema
const formSchema = z.object({
  name: z
    .string()
    .min(1, "Tool name is required")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Tool name should only contain alphanumeric characters, underscores, and hyphens"
    ),
  description: z.string().min(1, "Description is required"),
  async: z.boolean(),
  strict: z.boolean(),
  parameters: z.array(
    z.object({
      name: z.string().min(1, "Parameter name is required"),
      type: z.enum(["string", "number", "boolean", "object", "array"]),
      description: z.string().optional(),
      required: z.boolean(),
      enumValues: z.array(z.string()).optional(),
      itemsType: z.enum(["string", "number", "boolean", "object"]).optional(),
    })
  ),
  serverUrl: z.string().url("Please enter a valid URL"),
  secretToken: z.string().min(1, "Secret token is required"),
  timeout: z
    .number()
    .min(1, "Timeout must be at least 1 second")
    .max(300, "Timeout cannot exceed 300 seconds"),
  httpHeaders: z.array(
    z.object({
      name: z.string().min(1, "Header name is required"),
      value: z.string().min(1, "Header value is required"),
    })
  ),
});

export default function CustomToolForm({
  botId,
  orgId,
  initialData,
  mode = "create",
}: CustomToolFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisualEditor, setIsVisualEditor] = useState(true);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      async: initialData?.async ?? false,
      strict: initialData?.strict ?? false,
      parameters: initialData?.parameters || [],
      serverUrl: initialData?.serverUrl || "",
      secretToken: initialData?.secretToken || "",
      timeout: initialData?.timeout || 30,
      httpHeaders: initialData?.httpHeaders || [],
    },
  });

  const {
    fields: parameterFields,
    append: appendParameter,
    remove: removeParameter,
    update: updateParameter,
  } = useFieldArray({
    control: form.control,
    name: "parameters",
  });

  const {
    fields: headerFields,
    append: appendHeader,
    remove: removeHeader,
  } = useFieldArray({
    control: form.control,
    name: "httpHeaders",
  });

  const addParameter = () => {
    appendParameter({
      name: "",
      type: "string",
      description: "",
      required: false,
      enumValues: [],
      itemsType: undefined,
    });
  };

  const addHeader = () => {
    appendHeader({
      name: "",
      value: "",
    });
  };

  const addEnumValue = (paramIndex: number, value: string) => {
    if (!value.trim()) return;

    const currentParam = form.getValues(`parameters.${paramIndex}`);
    const currentEnumValues = currentParam.enumValues || [];

    if (!currentEnumValues.includes(value.trim())) {
      updateParameter(paramIndex, {
        ...currentParam,
        enumValues: [...currentEnumValues, value.trim()],
      });
    }
  };

  const removeEnumValue = (paramIndex: number, enumIndex: number) => {
    const currentParam = form.getValues(`parameters.${paramIndex}`);
    const currentEnumValues = currentParam.enumValues || [];

    updateParameter(paramIndex, {
      ...currentParam,
      enumValues: currentEnumValues.filter((_, index) => index !== enumIndex),
    });
  };

  const onSubmit = async (values: FormData) => {
    try {
      setIsSubmitting(true);

      let result;
      if (mode === "create") {
        result = await createCustomTool({
          ...values,
          botId,
        });
      } else if (mode === "edit" && initialData?.toolId) {
        result = await updateCustomTool({
          ...values,
          toolId: initialData.toolId,
        });
      }

      if (!result?.data?.success) {
        const errorMessage =
          result?.data?.error?.message ||
          `Failed to ${mode} custom tool. Please try again.`;
        toast.error(errorMessage);
        return;
      }

      toast.success(
        mode === "create"
          ? "Custom tool created successfully!"
          : "Custom tool updated successfully!"
      );

      if (mode === "create") {
        router.push(`/dashboard/${orgId}/bots/${botId}/tools`);
      } else {
        // For edit mode, refresh the page to show updated data
        window.location.reload();
      }
    } catch (error) {
      console.error(`Error ${mode}ing custom tool:`, error);
      toast.error(`An unexpected error occurred while ${mode}ing the tool.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Configure the basic details of your custom tool
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tool Name</FormLabel>
                    <FormControl>
                      <Input placeholder="getStockDetails" {...field} />
                    </FormControl>
                    <FormDescription>
                      A unique name for your custom tool
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
                        placeholder="Fetches the stock info"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Explain what this tool does and how it works
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Options</h3>

                <FormField
                  control={form.control}
                  name="async"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Async</FormLabel>
                        <FormDescription>
                          Tool executes asynchronously
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

                <FormField
                  control={form.control}
                  name="strict"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Strict</FormLabel>
                        <FormDescription>
                          Enforces strict parameter validation
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
              </div>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Parameters</CardTitle>
                  <CardDescription>
                    Define the parameters your tool accepts.
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="editor-toggle" className="text-sm">
                    Visual Editor
                  </Label>
                  <Switch
                    id="editor-toggle"
                    checked={isVisualEditor}
                    onCheckedChange={setIsVisualEditor}
                  />
                  <Label className="text-sm">JSON</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isVisualEditor ? (
                <div className="space-y-4">
                  <h4 className="font-medium">Properties</h4>

                  {parameterFields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <Badge variant="outline" className="text-xs">
                          {form.watch(`parameters.${index}.name`) ||
                            "Property key"}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParameter(index)}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Icons.Trash className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormField
                          control={form.control}
                          name={`parameters.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Property key" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`parameters.${index}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {PARAMETER_TYPES.map((type) => (
                                    <SelectItem
                                      key={type.value}
                                      value={type.value}
                                    >
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`parameters.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="mb-4">
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Property description (optional)"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Show items type field only for array type */}
                      {form.watch(`parameters.${index}.type`) === "array" && (
                        <FormField
                          control={form.control}
                          name={`parameters.${index}.itemsType`}
                          render={({ field }) => (
                            <FormItem className="mb-4">
                              <FormLabel>Items Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select items type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ARRAY_ITEM_TYPES.map((type) => (
                                    <SelectItem
                                      key={type.value}
                                      value={type.value}
                                    >
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Define what type of items this array can contain
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Show enum values only for string type */}
                      {form.watch(`parameters.${index}.type`) === "string" && (
                        <div className="mb-4">
                          <Label className="text-sm font-medium mb-2 block">
                            Enum Values (Optional)
                          </Label>
                          <div className="space-y-2">
                            {form
                              .watch(`parameters.${index}.enumValues`)
                              ?.map((enumValue, enumIndex) => (
                                <div
                                  key={enumIndex}
                                  className="flex items-center gap-2"
                                >
                                  <Input value={enumValue} readOnly />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeEnumValue(index, enumIndex)
                                    }
                                    className="h-8 w-8 p-0 text-destructive"
                                  >
                                    <Icons.Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Add enum value"
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const target = e.target as HTMLInputElement;
                                    addEnumValue(index, target.value);
                                    target.value = "";
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  const input = e.currentTarget
                                    .previousElementSibling as HTMLInputElement;
                                  addEnumValue(index, input.value);
                                  input.value = "";
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name={`parameters.${index}.required`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Required</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addParameter}
                    className="w-full"
                  >
                    <Icons.Add className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="parameters"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="JSON representation of parameters"
                            value={JSON.stringify(field.value, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                field.onChange(parsed);
                              } catch {
                                // Invalid JSON, don't update
                              }
                            }}
                            className="min-h-[200px] font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Server Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Server Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="serverUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Server URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://test.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The endpoint that will receive tool execution requests
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="secretToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secret Token</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••••••••••••••••••••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Used for authentication when making requests to your
                        server
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timeout (seconds)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={300}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum time to wait for a response
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">HTTP Headers</h3>
                    <p className="text-sm text-muted-foreground">
                      Custom HTTP headers to include in API requests to your
                      server
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHeader}
                  >
                    <Icons.Add className="h-4 w-4 mr-2" />
                    Add Header
                  </Button>
                </div>

                {headerFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg"
                  >
                    <FormField
                      control={form.control}
                      name={`httpHeaders.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Header Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`httpHeaders.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Value" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHeader(index)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Icons.Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "create" ? "Creating..." : "Updating..."}
                </>
              ) : (
                <>
                  <Icons.Check className="mr-2 h-4 w-4" />
                  {mode === "create" ? "Create Tool" : "Update Tool"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>How Custom Tools Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">Request Format</h4>
            <p className="text-sm text-muted-foreground">
              Your server will receive POST requests with the following
              structure:
            </p>
            <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-x-auto">
              {`{
  "parameters": { /* user input */ },
  "context": {
    "botId": "...",
    "userId": "...",
    "organizationId": "...",
    "conversationId": "..."
  },
  "metadata": {
    "timestamp": "...",
    "toolVersion": "1.0.0"
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium">Expected Response</h4>
            <p className="text-sm text-muted-foreground">
              Your server should respond with:
            </p>
            <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-x-auto">
              {`{
  "success": true,
  "data": { /* your response data */ },
  "message": "Optional success message"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
