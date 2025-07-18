"use client";

import { useState, useEffect, useCallback } from "react";
import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Appointment } from "./types";
import { getAppointments } from "@/app/actions/appointments";
import { formatDate, formatTime } from "./utils";

interface AppointmentsTabProps {
  botId: string;
  openAppointmentDetails: (appointment: Appointment) => void;
  activeTab: string;
}

// Add CSV generation utility function
function generateCSV(appointments: Appointment[]): string {
  if (appointments.length === 0) return "";

  // Define CSV headers
  const headers = [
    "Title",
    "Date",
    "Start Time",
    "End Time",
    "Status",
    "Timezone",
    "Calendar ID",
    "Description",
    "Location",
    "Meeting Link",
    "Organizer Email",
    "Attendees",
    "Created At",
    "Updated At",
  ];

  // Helper function to escape CSV values
  const escapeCSVValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Generate CSV rows
  const rows = appointments.map((appointment) => [
    escapeCSVValue(appointment.title || "Untitled Appointment"),
    escapeCSVValue(formatDate(appointment.startTime)),
    escapeCSVValue(formatTime(appointment.startTime)),
    escapeCSVValue(formatTime(appointment.endTime)),
    escapeCSVValue(appointment.status || "confirmed"),
    escapeCSVValue(appointment.timeZone || "UTC"),
    escapeCSVValue(appointment.calendarId || "Primary"),
    escapeCSVValue(appointment.description || ""),
    escapeCSVValue(appointment.location || ""),
    escapeCSVValue(appointment.meetingLink || ""),
    escapeCSVValue(appointment.organizer?.email || ""),
    escapeCSVValue(appointment.attendees?.map((a) => a.email).join("; ") || ""),
    escapeCSVValue(new Date(appointment.createdAt).toLocaleString()),
    escapeCSVValue(new Date(appointment.updatedAt).toLocaleString()),
  ]);

  // Combine headers and rows
  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

// Add download trigger function
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function AppointmentsTab({
  botId,
  openAppointmentDetails,
  activeTab,
}: AppointmentsTabProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch appointments function
  const fetchAppointments = useCallback(async () => {
    try {
      setAppointmentsLoading(true);

      const result = await getAppointments(botId, currentPage, 10);

      if (result.success && result.data) {
        // Map database appointment to component Appointment type
        const formattedAppointments = result.data.appointments.map(
          (appointment) => {
            // Handle JSON fields that might need parsing
            const parsedOrganizer =
              typeof appointment.organizer === "string"
                ? JSON.parse(appointment.organizer as string)
                : appointment.organizer;

            const parsedAttendees =
              typeof appointment.attendees === "string"
                ? JSON.parse(appointment.attendees as string)
                : appointment.attendees;

            const parsedProperties =
              typeof appointment.properties === "string"
                ? JSON.parse(appointment.properties as string)
                : appointment.properties;

            const parsedMetadata =
              typeof appointment.metadata === "string"
                ? JSON.parse(appointment.metadata as string)
                : appointment.metadata;

            return {
              ...appointment,
              // Convert Date objects to strings for the component
              startTime: appointment.startTime.toISOString(),
              endTime: appointment.endTime.toISOString(),
              createdAt: appointment.createdAt.toISOString(),
              updatedAt: appointment.updatedAt.toISOString(),
              // Use parsed JSON fields
              organizer: parsedOrganizer,
              attendees: parsedAttendees,
              properties: parsedProperties,
              metadata: parsedMetadata,
            } as Appointment;
          }
        );

        setAppointments(formattedAppointments);
        setTotalPages(result.data.totalPages);
      } else {
        toast.error(result.error?.message || "Failed to fetch appointments");
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to fetch appointments");
    } finally {
      setAppointmentsLoading(false);
    }
  }, [botId, currentPage]);

  // Fetch appointments when the appointments tab is activated
  useEffect(() => {
    if (activeTab === "appointments") {
      fetchAppointments();
    }
  }, [activeTab, currentPage, fetchAppointments]);

  // Add export handler function
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      // If we only have current page data, fetch all appointments
      if (appointments.length < 50) {
        // Reasonable limit for direct export
        const csvContent = generateCSV(appointments);
        const filename = `gohighlevel-appointments-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        downloadCSV(csvContent, filename);
        toast.success("Appointments exported successfully");
      } else {
        // For larger datasets, we might want to fetch all data first
        toast.info("Exporting large dataset, please wait...");
        // You could implement pagination to fetch all data here if needed
        const csvContent = generateCSV(appointments);
        const filename = `gohighlevel-appointments-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        downloadCSV(csvContent, filename);
        toast.success("Appointments exported successfully");
      }
    } catch (error) {
      console.error("Error exporting appointments:", error);
      toast.error("Failed to export appointments");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
        <CardDescription>
          View and manage appointments booked through your bot
        </CardDescription>
      </CardHeader>
      <CardContent>
        {appointmentsLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Icons.Spinner className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              Loading appointments...
            </p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Icons.Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-1">No appointments yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Once your bot books appointments, they will appear here for you to
              manage.
            </p>
          </div>
        ) : (
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Title</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[120px]">Start Time</TableHead>
                <TableHead className="w-[120px]">End Time</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[120px]">Timezone</TableHead>
                <TableHead className="w-[120px]">Calendar</TableHead>
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-medium truncate">
                    {appointment.title || "Untitled Appointment"}
                  </TableCell>
                  <TableCell>{formatDate(appointment.startTime)}</TableCell>
                  <TableCell>{formatTime(appointment.startTime)}</TableCell>
                  <TableCell>{formatTime(appointment.endTime)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        appointment.status === "cancelled"
                          ? "destructive"
                          : appointment.status === "confirmed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {appointment.status || "confirmed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="truncate">
                    {appointment.timeZone || "UTC"}
                  </TableCell>
                  <TableCell className="truncate">
                    {appointment.calendarId || "Primary"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Icons.MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => openAppointmentDetails(appointment)}
                        >
                          <Icons.Info className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {appointment.meetingLink && (
                          <DropdownMenuItem
                            onClick={() => {
                              if (appointment.meetingLink) {
                                window.open(appointment.meetingLink, "_blank");
                              }
                            }}
                          >
                            <Icons.ArrowUpRight className="mr-2 h-4 w-4" />
                            Join Meeting
                          </DropdownMenuItem>
                        )}
                        {appointment.status !== "cancelled" && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              // TODO: Implement cancel appointment functionality
                              toast.info(
                                "Cancel functionality will be implemented soon"
                              );
                            }}
                          >
                            <Icons.X className="mr-2 h-4 w-4" />
                            Cancel Appointment
                          </DropdownMenuItem>
                        )}
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
          onClick={handleExportCSV}
          disabled={appointments.length === 0 || isExporting}
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
            disabled={currentPage <= 1 || appointmentsLoading}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            <Icons.ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages || appointmentsLoading}
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
          >
            <Icons.ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
