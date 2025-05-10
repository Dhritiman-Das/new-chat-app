"use client";

import { Icons } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Appointment } from "./types";
import { formatDate, formatTime } from "./utils";

interface AppointmentDetailsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  appointment: Appointment | null;
  orgId: string;
  botId: string;
}

export function AppointmentDetailsDialog({
  isOpen,
  setIsOpen,
  appointment,
  orgId,
  botId,
}: AppointmentDetailsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="lg:max-w-screen-md overflow-y-scroll max-h-screen">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            Details for the selected appointment
          </DialogDescription>
        </DialogHeader>
        {appointment && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Title</p>
                <p className="text-base">
                  {appointment.title || "Untitled Appointment"}
                </p>
              </div>

              {appointment.description && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {appointment.description}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(appointment.startTime)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Status</p>
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
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Start Time</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(appointment.startTime)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">End Time</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(appointment.endTime)}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Timezone</p>
              <p className="text-sm text-muted-foreground">
                {appointment.timeZone || "UTC"}
              </p>
            </div>

            {appointment.location && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.location}
                </p>
              </div>
            )}

            {appointment.attendees && appointment.attendees.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Attendees</p>
                <div className="space-y-1">
                  {appointment.attendees.map((attendee, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      {attendee.name
                        ? `${attendee.name} (${attendee.email})`
                        : attendee.email}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {appointment.meetingLink && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Meeting Link</p>
                <a
                  href={appointment.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline"
                >
                  {appointment.meetingLink}
                </a>
              </div>
            )}

            {appointment.conversationId && (
              <div className="mt-2">
                <Link
                  href={`/dashboard/${orgId}/bots/${botId}/conversations/${appointment.conversationId}`}
                  target="_blank"
                  className="flex items-center hover:underline text-sm"
                >
                  Check conversation
                  <Icons.ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}

            {/* Properties */}
            {appointment.properties &&
              Object.keys(appointment.properties).length > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Properties</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(appointment.properties).map(
                        ([key, value]) => (
                          <div key={key} className="space-y-1">
                            <p className="text-sm font-medium capitalize">
                              {key}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {value === null || value === undefined
                                ? "—"
                                : typeof value === "object"
                                ? JSON.stringify(value)
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
            {appointment.metadata &&
              Object.keys(appointment.metadata).length > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Metadata</h4>
                    <pre className="bg-secondary/50 p-4 rounded-md overflow-auto text-xs">
                      {JSON.stringify(appointment.metadata, null, 2)}
                    </pre>
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
  );
}
