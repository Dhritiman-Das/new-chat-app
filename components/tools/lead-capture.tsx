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
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  updateLeadCaptureConfig,
  getLeads,
  exportLeads,
} from "@/app/actions/lead-capture";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopyIcon, InfoIcon, MailIcon } from "lucide-react";

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

// Define a Lead type for capturing lead data
interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string | null;
  triggerKeyword: string | null;
  properties: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

// Define response types to help with type narrowing
interface LeadsResponse {
  leads: Lead[];
  totalCount: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface ExportResponse {
  downloadUrl: string;
  message: string;
}

export default function LeadCaptureTool({ tool, botId }: LeadCaptureToolProps) {
  const [activeTab, setActiveTab] = useState("settings");
  const [newTrigger, setNewTrigger] = useState("");
  const [newCustomTrigger, setNewCustomTrigger] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDetailsOpen, setIsLeadDetailsOpen] = useState(false);

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
      customTriggerPhrases:
        (tool.defaultConfig?.customTriggerPhrases as string[]) || [],
    },
  });

  // Fetch initial configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsConfigLoading(true);
        const response = await fetch(
          `/api/bots/${botId}/tools/${tool.id}/config`
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch tool config: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.success && data.config) {
          // Update the form with existing config values
          if (data.config.requiredFields) {
            form.setValue("requiredFields", data.config.requiredFields);
          }

          if (data.config.leadNotifications !== undefined) {
            form.setValue("leadNotifications", data.config.leadNotifications);
          }

          if (
            data.config.leadCaptureTriggers &&
            Array.isArray(data.config.leadCaptureTriggers)
          ) {
            form.setValue(
              "leadCaptureTriggers",
              data.config.leadCaptureTriggers
            );
          }

          if (
            data.config.customTriggerPhrases &&
            Array.isArray(data.config.customTriggerPhrases)
          ) {
            form.setValue(
              "customTriggerPhrases",
              data.config.customTriggerPhrases
            );
          }
        }
      } catch (error) {
        console.error("Error fetching tool config:", error);
        // Use default values from the form
      } finally {
        setIsConfigLoading(false);
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [botId, tool.id, form]);

  // Fetch leads when the leads tab is activated
  useEffect(() => {
    if (activeTab === "leads") {
      fetchLeads();
    }
  }, [activeTab, currentPage, botId]);

  // Fetch leads function
  const fetchLeads = async () => {
    try {
      setLeadsLoading(true);
      const result = await getLeads({
        botId,
        page: currentPage,
        limit: 10,
      });

      if (result?.data?.success && result.data?.data) {
        const leadsData = result.data.data as LeadsResponse;
        setLeads(leadsData.leads);
        setTotalPages(leadsData.totalPages);
      } else {
        toast.error("Failed to fetch leads");
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to fetch leads");
    } finally {
      setLeadsLoading(false);
    }
  };

  // Add this new function to get all field keys from leads
  const getAllLeadFieldKeys = (leads: Lead[]) => {
    const fieldKeys = new Set<string>();

    // Add standard fields first
    ["name", "email", "phone", "company", "source", "status"].forEach((field) =>
      fieldKeys.add(field)
    );

    // Add custom property fields
    leads.forEach((lead) => {
      if (lead.properties) {
        Object.keys(lead.properties).forEach((key) => fieldKeys.add(key));
      }
    });

    return Array.from(fieldKeys);
  };

  async function onSubmit(values: z.infer<typeof configSchema>) {
    try {
      setIsSaving(true);

      const result = await updateLeadCaptureConfig({
        botId,
        toolId: tool.id,
        config: values,
      });

      if (result && result.data && result.data.success) {
        toast.success("Lead capture configuration saved successfully");
      } else {
        toast.error(
          result?.data?.error?.message || "Failed to save configuration"
        );
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
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

  function addCustomTriggerPhrase() {
    if (!newCustomTrigger || newCustomTrigger.trim() === "") return;

    const currentPhrases = form.getValues().customTriggerPhrases || [];
    form.setValue("customTriggerPhrases", [
      ...currentPhrases,
      newCustomTrigger.trim(),
    ]);
    setNewCustomTrigger("");
  }

  function removeCustomTriggerPhrase(phrase: string) {
    const currentPhrases = form.getValues().customTriggerPhrases || [];
    form.setValue(
      "customTriggerPhrases",
      currentPhrases.filter((p) => p !== phrase)
    );
  }

  // Handle exporting leads
  const handleExportLeads = async (format: "csv" | "json" = "csv") => {
    try {
      setIsExporting(true);
      const result = await exportLeads({
        botId,
        format,
      });

      if (result?.data?.success && result.data?.data) {
        const exportData = result.data.data as ExportResponse;
        toast.success(exportData.message);
      } else {
        toast.error("Failed to export leads");
      }
    } catch (error) {
      console.error("Error exporting leads:", error);
      toast.error("Failed to export leads");
    } finally {
      setIsExporting(false);
    }
  };

  // Function to open lead details dialog
  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadDetailsOpen(true);
  };

  // Add a function to copy lead data to clipboard
  const copyLeadToClipboard = (lead: Lead) => {
    // Create a formatted object with lead data
    const leadData: Record<string, string | number | boolean | object> = {
      name: lead.name || "—",
      email: lead.email || "—",
      phone: lead.phone || "—",
      company: lead.company || "—",
      source: lead.source || "—",
      status: lead.status || "—",
      triggerKeyword: lead.triggerKeyword || "—",
      date: new Date(lead.createdAt).toLocaleString(),
    };

    // Add custom properties
    if (lead.properties) {
      Object.entries(lead.properties).forEach(([key, value]) => {
        leadData[key] = value === null || value === undefined ? "—" : value;
      });
    }

    // Convert to JSON string with formatting
    const leadString = JSON.stringify(
      leadData,
      (key, value) => {
        // Handle null and undefined values
        if (value === null || value === undefined) {
          return "—";
        }
        return value;
      },
      2
    );

    // Copy to clipboard
    navigator.clipboard
      .writeText(leadString)
      .then(() => {
        toast.success("Lead data copied to clipboard");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
        toast.error("Failed to copy lead data");
      });
  };

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
              {isConfigLoading || isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Icons.Spinner className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Loading configuration...
                  </p>
                </div>
              ) : (
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
                        Select what information your bot should collect from
                        leads
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
                                    checked={formField.value?.includes(
                                      field.id
                                    )}
                                    onCheckedChange={(checked) => {
                                      const currentValue =
                                        formField.value || [];
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

                    <Separator className="my-6" />

                    <div>
                      <h3 className="text-md font-medium mb-2">
                        Custom Trigger Phrases
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add longer phrases that will trigger lead capture (like
                        questions or specific requests)
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {form.watch("customTriggerPhrases")?.map((phrase) => (
                          <Badge
                            key={phrase}
                            variant="secondary"
                            className="gap-1 px-3 py-1"
                          >
                            {phrase}
                            <button
                              type="button"
                              onClick={() => removeCustomTriggerPhrase(phrase)}
                              className="ml-1 rounded-full h-4 w-4 inline-flex items-center justify-center hover:bg-destructive/20"
                            >
                              <Icons.X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Add custom phrase... (e.g., 'What are your pricing options?')"
                          value={newCustomTrigger}
                          onChange={(e) => setNewCustomTrigger(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addCustomTriggerPhrase}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Configuration"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
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
              {leadsLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Icons.Spinner className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Loading leads...
                  </p>
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Icons.User className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                  <h3 className="text-lg font-semibold mb-1">No leads yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Once your bot captures leads, they will appear here for you
                    to manage.
                  </p>
                </div>
              ) : (
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Name</TableHead>
                      <TableHead className="w-[200px]">Email</TableHead>
                      <TableHead className="w-[150px]">Phone</TableHead>
                      {/* Dynamically add columns for custom properties */}
                      {leads.length > 0 &&
                        getAllLeadFieldKeys(leads)
                          .filter(
                            (key) =>
                              ![
                                "name",
                                "email",
                                "phone",
                                "id",
                                "createdAt",
                                "updatedAt",
                                "metadata",
                              ].includes(key)
                          )
                          .map((key) => (
                            <TableHead key={key} className="w-[120px]">
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </TableHead>
                          ))}
                      <TableHead className="w-[120px]">Date Captured</TableHead>
                      <TableHead className="w-[60px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium truncate">
                          {lead.name || "—"}
                        </TableCell>
                        <TableCell className="truncate">
                          {lead.email || "—"}
                        </TableCell>
                        <TableCell className="truncate">
                          {lead.phone || "—"}
                        </TableCell>
                        {/* Render custom property cells */}
                        {getAllLeadFieldKeys(leads)
                          .filter(
                            (key) =>
                              ![
                                "name",
                                "email",
                                "phone",
                                "id",
                                "createdAt",
                                "updatedAt",
                                "metadata",
                              ].includes(key)
                          )
                          .map((key) => (
                            <TableCell key={key} className="truncate">
                              {key === "company"
                                ? lead.company || "—"
                                : key === "source"
                                ? lead.source || "—"
                                : key === "status"
                                ? lead.status || "—"
                                : key === "triggerKeyword"
                                ? lead.triggerKeyword || "—"
                                : lead.properties &&
                                  lead.properties[key] !== undefined
                                ? typeof lead.properties[key] === "object"
                                  ? lead.properties[key]
                                    ? JSON.stringify(lead.properties[key])
                                    : "—"
                                  : String(lead.properties[key] || "—")
                                : "—"}
                            </TableCell>
                          ))}
                        <TableCell>
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Icons.MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => openLeadDetails(lead)}
                              >
                                <InfoIcon className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => copyLeadToClipboard(lead)}
                              >
                                <CopyIcon className="mr-2 h-4 w-4" />
                                Copy Data
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(`mailto:${lead.email}`, "_blank")
                                }
                                disabled={!lead.email}
                              >
                                <MailIcon className="mr-2 h-4 w-4" />
                                Email Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => handleExportLeads()}
                disabled={isExporting || leads.length === 0}
              >
                {isExporting ? (
                  <>
                    <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  "Export to CSV"
                )}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage <= 1 || leadsLoading}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                >
                  <Icons.ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= totalPages || leadsLoading}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                >
                  <Icons.ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lead Details Dialog */}
      <Dialog open={isLeadDetailsOpen} onOpenChange={setIsLeadDetailsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>
              All captured information for this lead
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLead.name || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLead.email || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLead.phone || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Company</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLead.company || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Source</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLead.source || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLead.status || "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">Trigger Keyword</p>
                <p className="text-sm text-muted-foreground">
                  {selectedLead.triggerKeyword || "—"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">Date Captured</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedLead.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Custom Properties */}
              {selectedLead.properties &&
                Object.keys(selectedLead.properties).length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">
                        Custom Properties
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(selectedLead.properties).map(
                          ([key, value]) => (
                            <div key={key} className="space-y-1">
                              <p className="text-sm font-medium capitalize">
                                {key}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {value === null || value === undefined
                                  ? "—"
                                  : typeof value === "object"
                                  ? value
                                    ? JSON.stringify(value)
                                    : "—"
                                  : String(value)}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}

              {/* Metadata */}
              {selectedLead.metadata &&
                Object.keys(selectedLead.metadata).length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Metadata</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(selectedLead.metadata).map(
                          ([key, value]) => (
                            <div key={key} className="space-y-1">
                              <p className="text-sm font-medium capitalize">
                                {key}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {value === null || value === undefined
                                  ? "—"
                                  : typeof value === "object"
                                  ? value
                                    ? JSON.stringify(value)
                                    : "—"
                                  : String(value)}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}
            </div>
          )}
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
