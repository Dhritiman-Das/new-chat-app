"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface PeakUsageChartProps {
  data: {
    day: string;
    hour: number;
    value: number;
  }[];
}

export function PeakUsageChart({ data }: PeakUsageChartProps) {
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      morning: {
        label: "Morning (8am-12pm)",
        theme: {
          light: "var(--chart-1)",
          dark: "var(--chart-1)",
        },
      },
      afternoon: {
        label: "Afternoon (12pm-5pm)",
        theme: {
          light: "var(--chart-2)",
          dark: "var(--chart-2)",
        },
      },
      evening: {
        label: "Evening (5pm-10pm)",
        theme: {
          light: "var(--chart-3)",
          dark: "var(--chart-3)",
        },
      },
    }),
    []
  );

  const barData = useMemo(() => {
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    // Prepare aggregated data by day and time period
    const aggregatedData = days.map((day) => {
      const dayData = data.filter((d) => d.day === day);

      const morning = dayData
        .filter((d) => d.hour >= 8 && d.hour < 12)
        .reduce((sum, d) => sum + d.value, 0);

      const afternoon = dayData
        .filter((d) => d.hour >= 12 && d.hour < 17)
        .reduce((sum, d) => sum + d.value, 0);

      const evening = dayData
        .filter((d) => d.hour >= 17 && d.hour < 22)
        .reduce((sum, d) => sum + d.value, 0);

      return {
        day,
        morning,
        afternoon,
        evening,
      };
    });

    return aggregatedData;
  }, [data]);

  return (
    <div className="space-y-4">
      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <BarChart
          data={barData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          <Bar dataKey="morning" stackId="a" fill="var(--color-morning)" />
          <Bar dataKey="afternoon" stackId="a" fill="var(--color-afternoon)" />
          <Bar dataKey="evening" stackId="a" fill="var(--color-evening)" />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
