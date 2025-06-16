"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryState } from "nuqs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Appointment } from "./gohighlevel-calendar/types";
import { SerializableTool } from "./gohighlevel-calendar/types";
import { CalendarSettings } from "./gohighlevel-calendar/calendar-settings";
import { FunctionsTab } from "./gohighlevel-calendar/functions-tab";
import { AuthenticationTab } from "./gohighlevel-calendar/authentication-tab";
import { AppointmentsTab } from "./gohighlevel-calendar/appointments-tab";
import { AppointmentDetailsDialog } from "./gohighlevel-calendar/appointment-details-dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Icons } from "../icons";
import { getToolCredentials } from "@/app/actions/credentials";
import { connectGoHighLevel } from "@/app/actions/tool-credentials";
import { fetchGoHighLevelCalendars } from "@/app/actions/gohighlevel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface GoHighLevelCalendarToolProps {
  tool: SerializableTool;
  botId: string;
  orgId: string;
}

export default function GoHighLevelCalendarTool({
  tool,
  botId,
  orgId,
}: GoHighLevelCalendarToolProps) {
  const [activeTab, setActiveTab] = useQueryState("tab", {
    defaultValue: "settings",
  });
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] =
    useState(false);
  const [toolHasCredential, setToolHasCredential] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [calendars, setCalendars] = useState<
    { id: string; name: string; isPrimary?: boolean }[]
  >([]);

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      setIsLoading(true);

      // Check if the tool has credentials
      const toolResponse = await getToolCredentials({
        toolId: tool.id,
        botId,
      });

      if (toolResponse?.data?.success && toolResponse.data.data?.credential) {
        const toolCredential = toolResponse.data.data.credential;
        const toolData = toolResponse.data.data.botTool;
        setToolHasCredential(true);

        // Only fetch calendars if the tool has a credential
        if (toolCredential.id) {
          try {
            const result = await fetchGoHighLevelCalendars({
              credentialId: toolCredential.id,
            });

            if (result?.data?.success) {
              setCalendars(result.data.data || []);

              // If there's a default calendar in the bot tool config, select it
              if (
                toolData?.config &&
                typeof toolData.config === "object" &&
                "defaultCalendarId" in toolData.config
              ) {
                setSelectedCalendar(
                  toolData.config.defaultCalendarId as string
                );
              }
            } else {
              console.error("Error fetching calendars:", result?.data?.error);
            }
          } catch (calendarError) {
            console.error("Error fetching calendars:", calendarError);
          }
        }
      }
    } catch (error) {
      console.error("Error checking GoHighLevel connection:", error);
    } finally {
      setIsLoading(false);
    }
  }, [tool.id, botId]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Handle connecting to GoHighLevel
  const handleConnectGoHighLevel = async () => {
    setIsConnecting(true);
    try {
      const response = await connectGoHighLevel({
        toolId: tool.id,
        botId,
        orgId,
      });

      // Check if the response has a success flag and authUrl
      if (response?.data?.success && response.data?.data?.authUrl) {
        window.location.href = response.data.data.authUrl;
      } else {
        toast.error(
          response?.data?.error?.message || "Failed to connect to GoHighLevel"
        );
      }
    } catch (error) {
      console.error("Error connecting to GoHighLevel:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle calendar selection
  const handleCalendarSelection = async (calendarId: string) => {
    setSelectedCalendar(calendarId);

    try {
      // Save the calendar selection
      const response = await fetch(
        `/api/bots/${botId}/tools/${tool.id}/config`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ defaultCalendarId: calendarId }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to save calendar selection: ${response.statusText}`
        );
      }

      toast.success("Default calendar updated successfully");
    } catch (error) {
      console.error("Error saving calendar selection:", error);
      toast.error("Failed to update default calendar");
    }
  };

  // Function to open appointment details dialog
  const openAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentDetailsOpen(true);
  };

  return (
    <>
      {/* Conditional Alert based on connection and configuration status */}
      {isLoading ? (
        <Alert className="mb-8">
          <Icons.Spinner className="h-4 w-4 animate-spin" />
          <AlertTitle>Checking Connection</AlertTitle>
          <AlertDescription>
            <span>Loading GoHighLevel connection status...</span>
          </AlertDescription>
        </Alert>
      ) : !toolHasCredential ? (
        <Alert className="mb-8" variant="destructive">
          <Icons.Info className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              You need to connect your GoHighLevel account to use this tool.
              Please authenticate your account to get started.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectGoHighLevel}
              disabled={isConnecting}
              className="ml-4 shrink-0"
            >
              {isConnecting ? (
                <>
                  <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Icons.Building className="mr-2 h-4 w-4" />
                  Connect Account
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      ) : !selectedCalendar ? (
        <Alert className="mb-8" variant="default">
          <Icons.Warning className="h-4 w-4" />
          <AlertTitle>Configuration Required</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              You&apos;re connected to GoHighLevel but haven&apos;t selected a
              default calendar. Please choose a default calendar to complete the
              setup.
            </span>
            <div className="ml-4 shrink-0">
              <Select
                disabled={!toolHasCredential || calendars.length === 0}
                value={selectedCalendar || undefined}
                onValueChange={handleCalendarSelection}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue
                    placeholder={
                      !toolHasCredential
                        ? "Connect account first"
                        : calendars.length === 0
                        ? "No calendars available"
                        : "Select a calendar"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((calendar) => (
                    <SelectItem
                      key={calendar.id}
                      value={calendar.id}
                      className="flex items-center"
                    >
                      <span>
                        {calendar.name}
                        {calendar.isPrimary && " (Primary)"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-8">
          <Icons.CheckCircle className="h-4 w-4" />
          <AlertTitle>Ready to Use</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              GoHighLevel is connected and configured. Your bot can now manage
              CRM data, conversations, and appointments.
            </span>
          </AlertDescription>
        </Alert>
      )}
      <div>
        <Tabs
          defaultValue="settings"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="settings" className="w-[150px]">
              Settings
            </TabsTrigger>
            <TabsTrigger value="functions" className="w-[150px]">
              Functions
            </TabsTrigger>
            <TabsTrigger value="auth" className="w-[150px]">
              Authentication
            </TabsTrigger>
            <TabsTrigger value="appointments" className="w-[150px]">
              Appointments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <CalendarSettings tool={tool} botId={botId} />
          </TabsContent>

          <TabsContent value="functions">
            <FunctionsTab tool={tool} />
          </TabsContent>

          <TabsContent value="auth">
            <AuthenticationTab tool={tool} botId={botId} orgId={orgId} />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentsTab
              botId={botId}
              openAppointmentDetails={openAppointmentDetails}
              activeTab={activeTab}
            />
          </TabsContent>
        </Tabs>

        {/* Appointment Details Dialog */}
        <AppointmentDetailsDialog
          isOpen={isAppointmentDetailsOpen}
          setIsOpen={setIsAppointmentDetailsOpen}
          appointment={selectedAppointment}
          orgId={orgId}
          botId={botId}
        />
      </div>
    </>
  );
}
