"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { submitSurvey } from "@/app/actions/survey";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Make all fields optional since questions can be skipped
const formSchema = z.object({
  referralSource: z.string().optional(),
  primaryUseCase: z.array(z.string()).optional(),
  expectedBots: z.string().optional(),
  integrations: z.array(z.string()).optional(),
});

const referralSources = [
  { value: "search", label: "Search Engine" },
  { value: "social", label: "Social Media" },
  { value: "recommendation", label: "Friend/Colleague" },
  { value: "advertisement", label: "Advertisement" },
  { value: "blog", label: "Blog or Article" },
  { value: "other", label: "Other" },
];

const useCases = [
  { value: "customer_support", label: "Customer Support" },
  { value: "lead_generation", label: "Lead Generation" },
  { value: "internal_tool", label: "Internal Tool" },
  { value: "personal_assistant", label: "Personal Assistant" },
  { value: "other", label: "Other" },
];

const botRanges = [
  { value: "1-2", label: "1-2 bots" },
  { value: "3-5", label: "3-5 bots" },
  { value: "6-10", label: "6-10 bots" },
  { value: "10+", label: "More than 10 bots" },
];

const integrationOptions = [
  { id: "calendar", label: "Calendar" },
  { id: "crm", label: "CRM" },
  { id: "email", label: "Email" },
  { id: "document", label: "Document Management" },
  { id: "messenger", label: "Messenger" },
  { id: "other", label: "Other" },
];

// Define survey steps
const surveySteps = [
  {
    id: "referralSource",
    title: "How did you hear about us?",
    fieldName: "referralSource",
  },
  {
    id: "primaryUseCase",
    title: "What are your primary use cases?",
    fieldName: "primaryUseCase",
    description: "Select all that apply",
  },
  {
    id: "expectedBots",
    title: "How many bots do you expect to create?",
    fieldName: "expectedBots",
  },
  {
    id: "integrations",
    title: "What integrations are you interested in?",
    fieldName: "integrations",
    description: "Select all that apply",
  },
];

interface SurveyFormProps {
  redirectPath?: string;
}

export default function SurveyForm({
  redirectPath = "/onboarding/complete",
}: SurveyFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      referralSource: "",
      primaryUseCase: [],
      expectedBots: "",
      integrations: [],
    },
  });

  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      setIsLoading(true);

      try {
        const response = await submitSurvey(values);

        if (response?.data?.success) {
          toast.success("Survey completed", {
            description: "Thanks for your feedback!",
          });
          router.push(redirectPath);
        } else {
          toast.error("Error submitting survey", {
            description: "Please try again later",
          });
        }
      } catch (error) {
        console.error("Error submitting survey:", error);
        toast.error("Error submitting survey", {
          description: "Please try again later",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, router, redirectPath]
  );

  const nextStep = useCallback(() => {
    if (currentStepIndex < surveySteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      form.handleSubmit(onSubmit)();
    }
  }, [currentStepIndex, form, onSubmit]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const currentStep = surveySteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / surveySteps.length) * 100;

  // Animation variants
  const variants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  // Render the appropriate form field based on the current step
  const renderFormField = () => {
    const fieldName = currentStep.fieldName;

    switch (fieldName) {
      case "referralSource":
        return (
          <FormField
            control={form.control}
            name="referralSource"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {referralSources.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "primaryUseCase":
        return (
          <FormField
            control={form.control}
            name="primaryUseCase"
            render={({ field }) => (
              <FormItem>
                {currentStep.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {currentStep.description}
                  </p>
                )}
                <div className="space-y-2">
                  {useCases.map((useCase) => (
                    <FormItem
                      key={useCase.value}
                      className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(useCase.value)}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value || [];
                            return checked
                              ? field.onChange([
                                  ...currentValues,
                                  useCase.value,
                                ])
                              : field.onChange(
                                  currentValues.filter(
                                    (value) => value !== useCase.value
                                  )
                                );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer w-full">
                        {useCase.label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "expectedBots":
        return (
          <FormField
            control={form.control}
            name="expectedBots"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a range" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {botRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "integrations":
        return (
          <FormField
            control={form.control}
            name="integrations"
            render={({ field }) => (
              <FormItem>
                {currentStep.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {currentStep.description}
                  </p>
                )}
                <div className="space-y-2">
                  {integrationOptions.map((integration) => (
                    <FormItem
                      key={integration.id}
                      className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(integration.id)}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value || [];
                            return checked
                              ? field.onChange([
                                  ...currentValues,
                                  integration.id,
                                ])
                              : field.onChange(
                                  currentValues.filter(
                                    (value) => value !== integration.id
                                  )
                                );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer w-full">
                        {integration.label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Progress bar */}
      <div className="w-full mb-8">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <Form {...form}>
        <Card className="relative">
          <CardHeader>
            <CardTitle className="text-xl">{currentStep.title}</CardTitle>
          </CardHeader>

          <CardContent className="pt-4 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStepIndex}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
              >
                {renderFormField()}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-4">
            <div className="flex gap-2">
              {currentStepIndex > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevStep}
                  disabled={isLoading}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={skipStep}
                disabled={
                  isLoading || currentStepIndex === surveySteps.length - 1
                }
              >
                Skip
              </Button>

              <Button size="sm" onClick={nextStep} disabled={isLoading}>
                {currentStepIndex < surveySteps.length - 1 ? (
                  <>
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                ) : isLoading ? (
                  "Finishing..."
                ) : (
                  "Finish"
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </Form>
    </>
  );
}
