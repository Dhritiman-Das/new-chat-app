"use client";

import { LeadGenerationChart } from "./lead-generation-chart";
import { AppointmentsChart } from "./appointments-chart";
import { AnalyticsCard } from "./analytics-card";
import { LeadGenerationData, AppointmentsData } from "@/lib/queries";

interface BusinessOutcomesSectionProps {
  leadGenerationData: LeadGenerationData;
  appointmentsData: AppointmentsData[];
}

export function BusinessOutcomesSection({
  leadGenerationData,
  appointmentsData,
}: BusinessOutcomesSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Business Outcomes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnalyticsCard
          title="Lead Generation Rate"
          description="Percentage of conversations that generated leads"
          tooltip="Track how effectively your bot is converting conversations to leads"
        >
          {leadGenerationData.timeSeriesData.length > 0 ? (
            <LeadGenerationChart data={leadGenerationData.timeSeriesData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No lead generation data available
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="Appointments Booked"
          description="Number of appointments booked over time"
          tooltip="Monitor the business impact of your bot through appointment bookings"
        >
          {appointmentsData.length > 0 ? (
            <AppointmentsChart data={appointmentsData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No appointments data available
            </div>
          )}
        </AnalyticsCard>
      </div>
    </div>
  );
}
