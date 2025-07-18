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
import { Plus, Trash2, MessageSquare, Zap, Clock } from "lucide-react";
import { Icons } from "@/components/icons";
import { updateGoHighLevelFollowUpSituations } from "@/app/actions/gohighlevel";
import type { GoHighLevelFollowUpSituation } from "@/lib/shared/types/gohighlevel";

// Configuration
const MAX_DELAY_DAYS = 3;
const MAX_DELAY_SECONDS = MAX_DELAY_DAYS * 24 * 60 * 60; // 3 days in seconds

// Duration input component
interface DurationInputProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function DurationInput({
  value = "3600s",
  onChange,
  disabled,
}: DurationInputProps) {
  // Parse seconds from value (remove 's' suffix if present)
  const totalSeconds = parseInt(value?.replace("s", "")) || 3600; // Default to 1 hour
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

  const updateDuration = (
    newDays: number,
    newHours: number,
    newMinutes: number
  ) => {
    const newTotalSeconds =
      newDays * 24 * 60 * 60 + newHours * 60 * 60 + newMinutes * 60;

    // Ensure minimum of 1 minute and maximum of MAX_DELAY_SECONDS
    const clampedSeconds = Math.max(
      60,
      Math.min(newTotalSeconds, MAX_DELAY_SECONDS)
    );
    onChange(`${clampedSeconds}s`); // Add 's' suffix
  };

  const formatDuration = (totalSecs: number) => {
    const d = Math.floor(totalSecs / (24 * 60 * 60));
    const h = Math.floor((totalSecs % (24 * 60 * 60)) / (60 * 60));
    const m = Math.floor((totalSecs % (60 * 60)) / 60);

    const parts = [];
    if (d > 0) parts.push(`${d} day${d !== 1 ? "s" : ""}`);
    if (h > 0) parts.push(`${h} hour${h !== 1 ? "s" : ""}`);
    if (m > 0) parts.push(`${m} minute${m !== 1 ? "s" : ""}`);

    return parts.join(", ") || "0 minutes";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-start gap-4">
        <div className="flex flex-col items-center space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Days
          </Label>
          <Input
            type="number"
            min="0"
            max={MAX_DELAY_DAYS}
            value={days}
            onChange={(e) => {
              const newDays = Math.max(
                0,
                Math.min(parseInt(e.target.value) || 0, MAX_DELAY_DAYS)
              );
              updateDuration(newDays, hours, minutes);
            }}
            disabled={disabled}
            className="w-16 h-12 text-center text-lg font-semibold border-2 focus:border-primary transition-colors"
          />
        </div>

        <div className="text-2xl font-light text-muted-foreground self-end pb-3">
          :
        </div>

        <div className="flex flex-col items-center space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Hours
          </Label>
          <Input
            type="number"
            min="0"
            max="23"
            value={hours}
            onChange={(e) => {
              const newHours = Math.max(
                0,
                Math.min(parseInt(e.target.value) || 0, 23)
              );
              updateDuration(days, newHours, minutes);
            }}
            disabled={disabled}
            className="w-16 h-12 text-center text-lg font-semibold border-2 focus:border-primary transition-colors"
          />
        </div>

        <div className="text-2xl font-light text-muted-foreground self-end pb-3">
          :
        </div>

        <div className="flex flex-col items-center space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Minutes
          </Label>
          <Input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => {
              const newMinutes = Math.max(
                0,
                Math.min(parseInt(e.target.value) || 0, 59)
              );
              updateDuration(days, hours, newMinutes);
            }}
            disabled={disabled}
            className="w-16 h-12 text-center text-lg font-semibold border-2 focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center justify-start gap-2 p-3 bg-gradient-to-r from-muted/30 to-muted/50 rounded-lg border">
        <Clock className="h-4 w-4 text-primary" />
        <div className="text-sm">
          <span className="font-semibold text-foreground">
            {formatDuration(totalSeconds)}
          </span>
          <span className="text-muted-foreground ml-2">
            ({totalSeconds.toLocaleString()} seconds)
          </span>
        </div>
      </div>

      {totalSeconds >= MAX_DELAY_SECONDS && (
        <div className="text-xs text-center text-amber-600 dark:text-amber-400 font-medium">
          ⚠️ Maximum delay reached ({MAX_DELAY_DAYS} days)
        </div>
      )}

      {totalSeconds < 60 && (
        <div className="text-xs text-center text-amber-600 dark:text-amber-400 font-medium">
          ⚠️ Minimum delay is 1 minute
        </div>
      )}
    </div>
  );
}

const situationSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  name: z.string().min(1, "Name is required"),
  tag: z.string().min(1, "Tag is required"),
  timeLimit: z.string().refine((val) => {
    const seconds = parseInt(val.replace("s", ""));
    return !isNaN(seconds) && seconds >= 60 && seconds <= MAX_DELAY_SECONDS;
  }, `Time limit must be between 1 minute and ${MAX_DELAY_DAYS} days`),
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

function generateId() {
  return `situation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to convert old format to seconds if needed
function normalizeTimeLimit(timeLimit: string): string {
  // If it's already in seconds format with 's' suffix, return as is
  if (/^\d+s$/.test(timeLimit)) {
    return timeLimit;
  }

  // If it's just numbers (old seconds format), add 's' suffix
  if (/^\d+$/.test(timeLimit)) {
    return `${timeLimit}s`;
  }

  // Convert old format to seconds
  const conversions: Record<string, number> = {
    "15m": 15 * 60,
    "30m": 30 * 60,
    "1h": 60 * 60,
    "2h": 2 * 60 * 60,
    "4h": 4 * 60 * 60,
    "8h": 8 * 60 * 60,
    "12h": 12 * 60 * 60,
    "1d": 24 * 60 * 60,
    "2d": 2 * 24 * 60 * 60,
    "7d": 7 * 24 * 60 * 60,
  };

  const secondsValue = conversions[timeLimit];
  return secondsValue ? `${secondsValue}s` : "3600s"; // Default to 1 hour
}

// Helper function to format time limit for display
function formatTimeLimitDisplay(timeLimit: string): string {
  const seconds = parseInt(timeLimit.replace("s", "")) || 3600;
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(" ") || "1h";
}

export function GoHighLevelFollowUpSituations({
  deploymentId,
  currentSituations = [],
}: GoHighLevelFollowUpSituationsProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Normalize existing situations to use seconds format
  const normalizedSituations = currentSituations.map((situation) => ({
    ...situation,
    timeLimit: normalizeTimeLimit(situation.timeLimit),
  }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      situations: normalizedSituations.length > 0 ? normalizedSituations : [],
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
      timeLimit: "3600s", // Default to 1 hour in seconds
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
                            {formatTimeLimitDisplay(
                              form.watch(`situations.${index}.timeLimit`)
                            )}
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
                              <FormControl>
                                <DurationInput
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormDescription>
                                How long to wait after the tag is added before
                                sending the follow-up message (max{" "}
                                {MAX_DELAY_DAYS} days)
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
