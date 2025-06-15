"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { format } from "date-fns";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import CustomToolForm from "./custom-tool-form";
import { deleteCustomTool } from "@/app/actions/custom-tools";

// Define interfaces
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

interface ToolExecution {
  id: string;
  functionName: string;
  params: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "TIMEOUT";
  startTime: Date;
  endTime: Date | null;
  executionTime: number | null;
  error: Record<string, unknown> | null;
  conversationId: string | null;
}

interface CustomToolData {
  id: string;
  name: string;
  description: string;
  async: boolean;
  strict: boolean;
  parameters: Array<{
    name: string;
    type: string;
    description?: string;
    required: boolean;
    enumValues?: string[];
    itemsType?: string;
  }>;
  serverUrl: string;
  secretToken: string;
  timeout: number;
  httpHeaders: Array<{
    name: string;
    value: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomToolComponentProps {
  tool: SerializableTool;
  botId: string;
  orgId: string;
}

export default function CustomToolComponent({
  tool,
  botId,
  orgId,
}: CustomToolComponentProps) {
  const [activeTab, setActiveTab] = useQueryState("tab", {
    defaultValue: "configuration",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [toolData, setToolData] = useState<CustomToolData | null>(null);
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const [selectedExecution, setSelectedExecution] =
    useState<ToolExecution | null>(null);
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);
  const [executionsLoading, setExecutionsLoading] = useState(false);

  const router = useRouter();

  // Fetch tool configuration data
  const fetchToolData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tools/${tool.id}/config`);
      if (!response.ok) {
        throw new Error("Failed to fetch tool data");
      }
      const data = await response.json();
      if (data.success) {
        setToolData(data.data);
      }
    } catch (error) {
      console.error("Error fetching tool data:", error);
      toast.error("Failed to load tool configuration");
    } finally {
      setIsLoading(false);
    }
  }, [tool.id]);

  // Fetch execution history
  const fetchExecutions = useCallback(async () => {
    try {
      setExecutionsLoading(true);
      const response = await fetch(
        `/api/tools/${tool.id}/executions?botId=${botId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch executions");
      }
      const data = await response.json();
      if (data.success) {
        setExecutions(data.data);
      }
    } catch (error) {
      console.error("Error fetching executions:", error);
      toast.error("Failed to load execution history");
    } finally {
      setExecutionsLoading(false);
    }
  }, [tool.id, botId]);

  // Load data on mount and when tab changes
  useEffect(() => {
    if (activeTab === "configuration") {
      fetchToolData();
    } else if (activeTab === "history") {
      fetchExecutions();
    }
  }, [activeTab, tool.id]);

  // Handle tool deletion
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteCustomTool({ toolId: tool.id });

      if (result?.data?.success) {
        toast.success("Custom tool deleted successfully");
        router.push(`/dashboard/${orgId}/bots/${botId}/tools`);
      } else {
        toast.error(
          result?.data?.error?.message || "Failed to delete custom tool"
        );
      }
    } catch (error) {
      console.error("Error deleting tool:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Handle execution item click
  const handleExecutionClick = (execution: ToolExecution) => {
    setSelectedExecution(execution);
    setShowExecutionDialog(true);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "FAILED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "TIMEOUT":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <Icons.Settings className="w-[32px] h-[32px]" />
              </div>
              <div>
                <CardTitle>Custom Tool: {tool.name}</CardTitle>
                <CardDescription>
                  This tool makes HTTP requests to external services
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Icons.Spinner className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.Trash className="h-4 w-4" />
                )}
                Delete Tool
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Description</h4>
              <p className="text-muted-foreground text-sm">
                {tool.description}
              </p>
            </div>

            {/* <Separator /> */}

            {/* <div>
              <h4 className="font-medium text-sm mb-2">Available Functions</h4>
              <div className="space-y-2">
                {Object.entries(tool.functionsMeta).map(([name, func]) => (
                  <div key={name} className="flex items-start space-x-3">
                    <Icons.MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">{name}</div>
                      <div className="text-xs text-muted-foreground">
                        {func.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="">
          <TabsTrigger value="configuration" className="w-[150px]">
            Configuration
          </TabsTrigger>
          <TabsTrigger value="history" className="w-[150px]">
            Execution History
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Custom Tool</CardTitle>
                <CardDescription>
                  Update the configuration of your custom tool
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomToolForm
                  botId={botId}
                  orgId={orgId}
                  initialData={
                    toolData
                      ? {
                          ...toolData,
                          toolId: tool.id,
                          parameters: toolData.parameters.map((param) => ({
                            ...param,
                            type: param.type as
                              | "string"
                              | "number"
                              | "boolean"
                              | "object"
                              | "array",
                            itemsType: param.itemsType as
                              | "string"
                              | "number"
                              | "boolean"
                              | "object"
                              | undefined,
                          })),
                        }
                      : undefined
                  }
                  mode="edit"
                />
                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tool Configuration</CardTitle>
                    <CardDescription>
                      Current configuration of your custom tool
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsEditing(true)} size="sm">
                    <Icons.Pen className="h-4 w-4 mr-2" />
                    Edit Configuration
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Icons.Spinner className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading configuration...</span>
                  </div>
                ) : toolData ? (
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h4 className="font-medium mb-3">Basic Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium">Name:</span>
                          <p className="text-sm text-muted-foreground">
                            {toolData.name}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Type:</span>
                          <p className="text-sm text-muted-foreground">
                            Custom Tool
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="text-sm font-medium">
                          Description:
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {toolData.description}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Options */}
                    <div>
                      <h4 className="font-medium mb-3">Options</h4>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={toolData.async ? "default" : "secondary"}
                          >
                            Async: {toolData.async ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={toolData.strict ? "default" : "secondary"}
                          >
                            Strict: {toolData.strict ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Parameters */}
                    <div>
                      <h4 className="font-medium mb-3">Parameters</h4>
                      {toolData.parameters.length > 0 ? (
                        <div className="space-y-2">
                          {toolData.parameters.map((param, index) => (
                            <div key={index} className="border rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{param.name}</Badge>
                                <Badge variant="secondary">{param.type}</Badge>
                                {param.required && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Required
                                  </Badge>
                                )}
                              </div>
                              {param.description && (
                                <p className="text-sm text-muted-foreground">
                                  {param.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No parameters defined
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Server Settings */}
                    <div>
                      <h4 className="font-medium mb-3">Server Settings</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium">
                            Server URL:
                          </span>
                          <p className="text-sm text-muted-foreground font-mono break-all">
                            {toolData.serverUrl}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Timeout:</span>
                          <p className="text-sm text-muted-foreground">
                            {toolData.timeout} seconds
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">
                            Secret Token:
                          </span>
                          <p className="text-sm text-muted-foreground font-mono">
                            {"•".repeat(20)}
                          </p>
                        </div>
                        {toolData.httpHeaders.length > 0 && (
                          <div>
                            <span className="text-sm font-medium">
                              HTTP Headers:
                            </span>
                            <div className="mt-2 space-y-1">
                              {toolData.httpHeaders.map((header, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <code className="bg-muted px-2 py-1 rounded text-xs">
                                    {header.name}
                                  </code>
                                  <span className="text-muted-foreground">
                                    :
                                  </span>
                                  <code className="bg-muted px-2 py-1 rounded text-xs">
                                    {header.value}
                                  </code>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Metadata */}
                    <div>
                      <h4 className="font-medium mb-3">Metadata</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium">Created:</span>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(toolData.createdAt), "PPp")}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">
                            Last Updated:
                          </span>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(toolData.updatedAt), "PPp")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Failed to load configuration
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>
                View the execution history and results of this custom tool
              </CardDescription>
            </CardHeader>
            <CardContent>
              {executionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Icons.Spinner className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading execution history...</span>
                </div>
              ) : executions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Function</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Execution Time</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell className="font-medium">
                          {execution.functionName}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(execution.status)}>
                            {execution.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {execution.executionTime
                            ? `${execution.executionTime}ms`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(execution.startTime), "PPp")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExecutionClick(execution)}
                          >
                            <Icons.Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Icons.History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No execution history found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Executions will appear here when the tool is used in
                    conversations
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              custom tool &quot;{tool.name}&quot; and remove it from all bots
              that are using it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Tool
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Execution Details Dialog */}
      <Dialog open={showExecutionDialog} onOpenChange={setShowExecutionDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Execution Details</DialogTitle>
            <DialogDescription>
              Detailed information about this tool execution
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {selectedExecution && (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Function:</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedExecution.functionName}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium block">Status:</span>
                    <Badge className={getStatusColor(selectedExecution.status)}>
                      {selectedExecution.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Started:</span>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedExecution.startTime), "PPp")}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Execution Time:</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedExecution.executionTime
                        ? `${selectedExecution.executionTime}ms`
                        : "Not available"}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Parameters */}
                <div>
                  <h4 className="font-medium mb-2">Parameters</h4>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-auto max-w-full whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedExecution.params, null, 2)}
                  </pre>
                </div>

                {/* Result */}
                {selectedExecution.result && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Result</h4>
                      <pre className="bg-muted p-3 rounded-md text-sm overflow-auto max-w-full whitespace-pre-wrap break-all">
                        {JSON.stringify(selectedExecution.result, null, 2)}
                      </pre>
                    </div>
                  </>
                )}

                {/* Error */}
                {selectedExecution.error && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2 text-destructive">
                        Error
                      </h4>
                      <pre className="bg-destructive/10 p-3 rounded-md text-sm overflow-auto max-w-full whitespace-pre-wrap break-all">
                        {JSON.stringify(selectedExecution.error, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
