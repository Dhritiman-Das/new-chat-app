"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, MessageSquare, Zap } from "lucide-react";
import { Icons } from "@/components/icons";
import { updateGoHighLevelFollowUpSituations } from "@/app/actions/gohighlevel";
import type { GoHighLevelFollowUpSituation } from "@/lib/shared/types/gohighlevel";

const situationSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  name: z.string().min(1, "Name is required"),
  tag: z.string().min(1, "Tag is required"),
  timeLimit: z.string().min(1, "Time limit is required"),
  messageType: z.enum(["manual", "ai_generated"]),
  manualMessage: z.string().optional(),
  customPrompt: z.string().optional(),
});

const formSchema = z.object({
  situations: z.array(situationSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface GoHighLevelFollowUpSituationsProps {
  deploymentId: string | undefined;
  currentSituations?: GoHighLevelFollowUpSituation[];
}

const timeLimitOptions = [
  { value: "15m", label: "15 minutes" },
  { value: "30m", label: "30 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "2h", label: "2 hours" },
  { value: "4h", label: "4 hours" },
  { value: "8h", label: "8 hours" },
  { value: "12h", label: "12 hours" },
  { value: "1d", label: "1 day" },
  { value: "2d", label: "2 days" },
  { value: "7d", label: "7 days" },
];

function generateId() {
  return `situation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function GoHighLevelFollowUpSituations({
  deploymentId,
  currentSituations = [],
}: GoHighLevelFollowUpSituationsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      situations: currentSituations.length > 0 ? currentSituations : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "situations",
  });

  const addNewSituation = () => {
    append({
      id: generateId(),
      enabled: true,
      name: "",
      tag: "",
      timeLimit: "1h",
      messageType: "ai_generated",
      manualMessage: "",
      customPrompt: "",
    });
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);

      if (!deploymentId) {
        toast.error("Deployment ID is required");
        return;
      }

      const result = await updateGoHighLevelFollowUpSituations({
        deploymentId,
        situations: data.situations,
      });

      if (result?.data?.success) {
        toast.success("Follow-up situations updated successfully");
      } else {
        toast.error(
          result?.data?.error?.message || "Failed to update situations"
        );
      }
    } catch (error) {
      toast.error("An error occurred while updating situations");
      console.error("Error updating follow-up situations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Follow-up Situations
        </CardTitle>
        <CardDescription>
          Configure multiple follow-up scenarios that trigger when specific tags
          are added to contacts. Each situation can have its own timing and
          messaging strategy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {fields.length > 0 && (
              <Accordion type="single" collapsible className="space-y-4">
                {fields.map((field, index) => (
                  <AccordionItem
                    key={field.id}
                    value={`situation-${index}`}
                    className="border rounded-lg"
                  >
                    <div className="flex items-center px-4 py-3 border-b">
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={form.watch(`situations.${index}.enabled`)}
                          onCheckedChange={(checked) =>
                            form.setValue(
                              `situations.${index}.enabled`,
                              checked
                            )
                          }
                        />
                        <div className="text-left flex-1">
                          <div className="font-medium">
                            {form.watch(`situations.${index}.name`) ||
                              `Situation ${index + 1}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Tag:{" "}
                            {form.watch(`situations.${index}.tag`) || "Not set"}{" "}
                            • Delay:{" "}
                            {form.watch(`situations.${index}.timeLimit`)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              form.watch(`situations.${index}.enabled`)
                                ? "default"
                                : "secondary"
                            }
                          >
                            {form.watch(`situations.${index}.enabled`)
                              ? "Enabled"
                              : "Disabled"}
                          </Badge>
                          <Badge variant="outline">
                            {form.watch(`situations.${index}.messageType`) ===
                            "manual"
                              ? "Manual"
                              : "AI Generated"}
                          </Badge>
                        </div>
                      </div>
                      <AccordionTrigger className="ml-2 hover:no-underline" />
                    </div>
                    <AccordionContent className="px-4 py-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`situations.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Situation Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., No-Show Follow Up"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  A descriptive name for this situation
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`situations.${index}.tag`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Trigger Tag</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., no-show"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  The contact tag that triggers this follow-up
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`situations.${index}.timeLimit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Follow-up Delay</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="max-w-sm">
                                    <SelectValue placeholder="Select delay" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {timeLimitOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                How long to wait after the tag is added before
                                sending the follow-up message
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`situations.${index}.messageType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message Type</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex flex-col space-y-3"
                                >
                                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                                    <RadioGroupItem
                                      value="manual"
                                      id={`manual-${index}`}
                                    />
                                    <div className="flex items-center gap-2">
                                      <MessageSquare className="h-4 w-4" />
                                      <Label htmlFor={`manual-${index}`}>
                                        Manual Message
                                      </Label>
                                    </div>
                                    <Badge
                                      variant="secondary"
                                      className="ml-auto"
                                    >
                                      Fixed
                                    </Badge>
                                  </div>
                                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                                    <RadioGroupItem
                                      value="ai_generated"
                                      id={`ai-${index}`}
                                    />
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-4 w-4" />
                                      <Label htmlFor={`ai-${index}`}>
                                        AI Generated
                                      </Label>
                                    </div>
                                    <Badge
                                      variant="default"
                                      className="ml-auto"
                                    >
                                      Dynamic
                                    </Badge>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormDescription>
                                Choose whether to send a fixed message or let AI
                                generate contextual responses
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch(`situations.${index}.messageType`) ===
                          "manual" && (
                          <FormField
                            control={form.control}
                            name={`situations.${index}.manualMessage`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Manual Message</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Enter the message to send..."
                                    className="min-h-[100px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  This exact message will be sent to the contact
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {form.watch(`situations.${index}.messageType`) ===
                          "ai_generated" && (
                          <FormField
                            control={form.control}
                            name={`situations.${index}.customPrompt`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Custom AI Prompt (Optional)
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Enter custom instructions for the AI to generate the message... (Leave empty for default behavior)"
                                    className="min-h-[100px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Provide specific instructions for how the AI
                                  should craft the follow-up message. If empty,
                                  the AI will use default conversation context.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <Separator />

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => remove(index)}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove Situation
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={addNewSituation}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Follow-up Situation
              </Button>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icons.Check className="mr-2 h-4 w-4" />
                    Save All Situations
                  </>
                )}
              </Button>
            </div>

            {fields.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Zap className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  No Follow-up Situations Configured
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Create automated follow-up messages that trigger when contacts
                  are tagged with specific labels. Perfect for no-shows,
                  unresponsive leads, and more.
                </p>
                <Button onClick={addNewSituation} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Situation
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
