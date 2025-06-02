"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Appointment } from "./types";
import { SerializableTool } from "./types";
import { CalendarSettings } from "./calendar-settings";
import { FunctionsTab } from "./functions-tab";
import { AuthenticationTab } from "./authentication-tab";
import { AppointmentsTab } from "./appointments-tab";
import { AppointmentDetailsDialog } from "./appointment-details-dialog";

interface GoogleCalendarToolProps {
  tool: SerializableTool;
  botId: string;
  orgId: string;
}

export default function GoogleCalendarTool({
  tool,
  botId,
  orgId,
}: GoogleCalendarToolProps) {
  const [activeTab, setActiveTab] = useState("settings");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] =
    useState(false);

  // Function to open appointment details dialog
  const openAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentDetailsOpen(true);
  };

  return (
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
  );
}
