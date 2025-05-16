"use client";

import { ResponseTimeChart } from "./response-time-chart";
import { ToolUsageChart } from "./tool-usage-chart";
import { AnalyticsCard } from "./analytics-card";
import { ResponseTimeData, ToolUsageData } from "@/lib/queries";

interface PerformanceMetricsSectionProps {
  responseTimeData: ResponseTimeData[];
  toolUsageData: ToolUsageData[];
}

export function PerformanceMetricsSection({
  responseTimeData,
  toolUsageData,
}: PerformanceMetricsSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Performance Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnalyticsCard
          title="Average Response Time"
          description="Response processing time trend"
          tooltip="Monitor bot performance and responsiveness"
        >
          {responseTimeData.length > 0 ? (
            <ResponseTimeChart data={responseTimeData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No response time data available
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="Tool Usage Distribution"
          description="Which tools are being used most frequently"
          tooltip="Identify which capabilities are most valuable to users"
        >
          {toolUsageData.length > 0 ? (
            <ToolUsageChart data={toolUsageData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No tool usage data available
            </div>
          )}
        </AnalyticsCard>
      </div>
    </div>
  );
}
