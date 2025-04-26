"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink } from "lucide-react";

export function GoogleCalendarScopeDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto p-0 text-primary underline">
          here
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Google Calendar Integration Privacy & Data Usage
          </DialogTitle>
          <DialogDescription>
            Details about what permissions we request and how your data is used
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Required Permissions (OAuth Scopes)
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                To provide Google Calendar functionality, we request the
                following permission scopes:
              </p>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium">
                    https://www.googleapis.com/auth/calendar
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Full access to manage your calendars. This permission allows
                    our application to:
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                    <li>Create calendar events on your behalf</li>
                    <li>Update existing calendar events</li>
                    <li>
                      Delete calendar events when appointments are canceled
                    </li>
                    <li>Change calendar settings as needed for integration</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium">
                    https://www.googleapis.com/auth/calendar.events
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Access to view and manage events on your calendars. This
                    allows our application to:
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                    <li>Create and manage appointment events</li>
                    <li>Read events to check for scheduling conflicts</li>
                    <li>Update event details when appointments change</li>
                    <li>Cancel events when appointments are canceled</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium">
                    https://www.googleapis.com/auth/calendar.readonly
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Read-only access to view your calendar events. This allows
                    our application to:
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                    <li>View your existing calendar events</li>
                    <li>Check for scheduling conflicts</li>
                    <li>Find available time slots for scheduling</li>
                    <li>Display your upcoming appointments</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">
                How We Use Your Data
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>
                  <span className="font-medium">Scheduling Appointments:</span>{" "}
                  We create, update, and delete calendar events based on your
                  appointment scheduling needs.
                </li>
                <li>
                  <span className="font-medium">Availability Checking:</span> We
                  read your existing calendar events to determine available time
                  slots and avoid scheduling conflicts.
                </li>
                <li>
                  <span className="font-medium">Synchronization:</span> We
                  maintain synchronization between our system and your Google
                  Calendar to ensure appointment information is always
                  up-to-date.
                </li>
                <li>
                  <span className="font-medium">Notifications:</span> We may add
                  reminders to calendar events to help you keep track of your
                  appointments.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">
                Data Security & Privacy
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>
                  We do not sell, rent, or lease your calendar data to any third
                  parties.
                </li>
                <li>
                  Calendar data is only accessed for providing the appointment
                  scheduling functionality you requested.
                </li>
                <li>
                  All data is transmitted using encrypted connections to
                  maintain security.
                </li>
                <li>
                  We only store the minimum information necessary to provide our
                  service.
                </li>
                <li>
                  You can revoke access to your Google Calendar at any time.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">
                Verification Information
              </h3>
              <p className="text-sm text-muted-foreground">
                These permissions are required to provide core functionality of
                our Google Calendar integration:
              </p>
              <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                <li>
                  Creating, viewing, updating, and deleting calendar events for
                  appointments
                </li>
                <li>
                  Finding available time slots by reading existing calendar
                  events
                </li>
                <li>
                  Syncing appointment information between our system and Google
                  Calendar
                </li>
                <li>
                  Managing scheduling details including appointment duration,
                  buffer times, and availability windows
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Our application has passed Google&apos;s OAuth verification
                process, ensuring our data usage complies with Google&apos;s API
                Services User Data Policy.
              </p>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              window.open("https://policies.google.com/privacy", "_blank")
            }
          >
            Google Privacy Policy <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              window.open(
                "https://developers.google.com/terms/api-services-user-data-policy",
                "_blank"
              )
            }
          >
            API User Data Policy <ExternalLink className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GoogleCalendarScopeDialog;
