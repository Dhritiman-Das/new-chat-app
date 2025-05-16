"use client";

import { MessagesHistogramChart } from "./messages-histogram-chart";
import { PeakUsageChart } from "./peak-usage-chart";
import { AnalyticsCard } from "./analytics-card";
import { HistogramData, PeakUsageData } from "@/lib/queries";

interface UserEngagementSectionProps {
  messagesHistogramData: HistogramData[];
  peakUsageData: PeakUsageData[];
}

export function UserEngagementSection({
  messagesHistogramData,
  peakUsageData,
}: UserEngagementSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">User Engagement</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnalyticsCard
          title="Messages per Conversation"
          description="Distribution of conversation lengths"
          tooltip="Identify potential drop-off points and conversation depth"
        >
          {messagesHistogramData.length > 0 ? (
            <MessagesHistogramChart data={messagesHistogramData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No message histogram data available
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="Peak Usage Times"
          description="When users are most active (by hour and day)"
          tooltip="Understand when your audience is engaging with your bot"
        >
          {peakUsageData.length > 0 ? (
            <PeakUsageChart data={peakUsageData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No peak usage data available
            </div>
          )}
        </AnalyticsCard>
      </div>
    </div>
  );
}
