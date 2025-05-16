"use client";

import { ConversationVolumeChart } from "./conversation-volume-chart";
import { StatusBreakdownChart } from "./status-breakdown-chart";
import { AnalyticsCard } from "./analytics-card";
import { ConversationVolumeData, ConversationStatusData } from "@/lib/queries";

interface ConversationOverviewSectionProps {
  conversationVolumeData: ConversationVolumeData[];
  conversationStatusData: ConversationStatusData[];
}

export function ConversationOverviewSection({
  conversationVolumeData,
  conversationStatusData,
}: ConversationOverviewSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Conversation Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnalyticsCard
          title="Conversation Volume Trend"
          description="Shows the number of conversations over time"
          tooltip="Monitor usage patterns and identify growth trends"
        >
          {conversationVolumeData.length > 0 ? (
            <ConversationVolumeChart data={conversationVolumeData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No conversation data available
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="Conversation Status Breakdown"
          description="Distribution of conversation status types"
          tooltip="Understand conversation completion rates and potential issues"
        >
          {conversationStatusData.length > 0 ? (
            <StatusBreakdownChart data={conversationStatusData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No status data available
            </div>
          )}
        </AnalyticsCard>
      </div>
    </div>
  );
}
