"use client";

import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";

// Interface for serialized tool object
interface SerializableTool {
  id: string;
  name: string;
  description: string;
  type: string;
  integrationType?: string;
  version: string;
  defaultConfig?: Record<string, unknown>;
  functionsMeta: Record<string, { description: string }>;
}

interface LeadCaptureToolProps {
  tool: SerializableTool;
  botId: string;
}

const fieldOptions = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "company", label: "Company" },
  { id: "website", label: "Website" },
  { id: "message", label: "Message" },
  { id: "budget", label: "Budget" },
  { id: "timeline", label: "Timeline" },
] as const;

const configSchema = z.object({
  requiredFields: z.array(z.string()).min(1, {
    message: "At least one field must be required",
  }),
  leadNotifications: z.boolean(),
  leadCaptureTriggers: z.array(z.string()),
  customTriggerPhrases: z.array(z.string()).optional(),
});

export default function LeadCaptureTool({ tool, botId }: LeadCaptureToolProps) {
  const [activeTab, setActiveTab] = useState("settings");
  const [newTrigger, setNewTrigger] = useState("");

  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      requiredFields: (tool.defaultConfig?.requiredFields as string[]) || [
        "name",
        "email",
      ],
      leadNotifications: tool.defaultConfig?.leadNotifications !== false,
      leadCaptureTriggers: (tool.defaultConfig
        ?.leadCaptureTriggers as string[]) || [
        "pricing",
        "demo",
        "contact",
        "quote",
      ],
      customTriggerPhrases: [],
    },
  });

  function onSubmit(values: z.infer<typeof configSchema>) {
    // TODO: Implement save configuration using botId for API calls
    console.log(values, botId);
  }

  function addCustomTrigger() {
    if (!newTrigger || newTrigger.trim() === "") return;

    const currentTriggers = form.getValues().leadCaptureTriggers || [];
    form.setValue("leadCaptureTriggers", [
      ...currentTriggers,
      newTrigger.trim().toLowerCase(),
    ]);
    setNewTrigger("");
  }

  function removeTrigger(trigger: string) {
    const currentTriggers = form.getValues().leadCaptureTriggers || [];
    form.setValue(
      "leadCaptureTriggers",
      currentTriggers.filter((t) => t !== trigger)
    );
  }

  return (
    <div>
      <Tabs
        defaultValue="settings"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="functions">Functions</TabsTrigger>
          <TabsTrigger value="leads">Captured Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Lead Capture Settings</CardTitle>
              <CardDescription>
                Configure how your bot collects lead information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-md font-medium mb-2">
                      Required Fields
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select what information your bot should collect from leads
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fieldOptions.map((field) => (
                        <FormField
                          key={field.id}
                          control={form.control}
                          name="requiredFields"
                          render={({ field: formField }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={formField.value?.includes(field.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = formField.value || [];
                                    return checked
                                      ? formField.onChange([
                                          ...currentValue,
                                          field.id,
                                        ])
                                      : formField.onChange(
                                          currentValue.filter(
                                            (value) => value !== field.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium cursor-pointer">
                                  {field.label}
                                </FormLabel>
                                <FormDescription>
                                  Collect {field.label.toLowerCase()} from
                                  prospects
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <FormField
                    control={form.control}
                    name="leadNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Email Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive email notifications when new leads are
                            captured
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

                  <Separator />

                  <div>
                    <h3 className="text-md font-medium mb-2">
                      Lead Capture Triggers
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Keywords that trigger the lead capture flow in
                      conversations
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {form.watch("leadCaptureTriggers")?.map((trigger) => (
                        <Badge
                          key={trigger}
                          variant="secondary"
                          className="gap-1 px-3 py-1"
                        >
                          {trigger}
                          <button
                            type="button"
                            onClick={() => removeTrigger(trigger)}
                            className="ml-1 rounded-full h-4 w-4 inline-flex items-center justify-center hover:bg-destructive/20"
                          >
                            <Icons.X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Add new trigger word..."
                        value={newTrigger}
                        onChange={(e) => setNewTrigger(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCustomTrigger}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <Button type="submit">Save Configuration</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions">
          <Card>
            <CardHeader>
              <CardTitle>Available Functions</CardTitle>
              <CardDescription>
                Functions this tool provides for your bot to use
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(tool.functionsMeta).map(([name, func]) => (
                  <div key={name} className="space-y-2">
                    <div className="flex items-start space-x-4">
                      <Icons.MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{name}</h3>
                          <div className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Function
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {func.description}
                        </p>
                      </div>
                    </div>
                    <Separator className="my-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Captured Leads</CardTitle>
              <CardDescription>
                View and manage leads collected by your bot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date Captured</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">John Doe</TableCell>
                    <TableCell>john.doe@example.com</TableCell>
                    <TableCell>2 days ago</TableCell>
                    <TableCell>
                      <Badge variant="outline">New</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Icons.MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Jane Smith</TableCell>
                    <TableCell>jane.smith@example.com</TableCell>
                    <TableCell>5 days ago</TableCell>
                    <TableCell>
                      <Badge variant="outline">Contacted</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Icons.MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Export to CSV</Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" disabled>
                  <Icons.ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page 1 of 1
                </span>
                <Button variant="outline" size="icon" disabled>
                  <Icons.ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
