"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatNumber } from "@/lib/utils";

interface MessagesHistogramChartProps {
  data: {
    // Buckets like "1-5", "6-10", etc.
    bucket: string;
    // Number of conversations in each bucket
    count: number;
  }[];
}

export function MessagesHistogramChart({ data }: MessagesHistogramChartProps) {
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      count: {
        label: "Conversations",
        theme: {
          light: "var(--chart-1)",
          dark: "var(--chart-1)",
        },
      },
    }),
    []
  );

  return (
    <div className="space-y-4">
      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, bottom: 20, left: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="bucket"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={(value) => formatNumber(value)}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
