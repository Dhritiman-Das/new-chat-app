"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ToolUsageChartProps {
  data: {
    tool: string;
    count: number;
  }[];
}

export function ToolUsageChart({ data }: ToolUsageChartProps) {
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      usage: {
        label: "Usage Count",
        theme: {
          light: "var(--chart-3)",
          dark: "var(--chart-3)",
        },
      },
    }),
    []
  );

  // Sort data by count (descending) and limit to top 5 tools
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.count - a.count).slice(0, 7);
  }, [data]);

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ top: 5, right: 20, bottom: 20, left: 80 }}
      >
        <CartesianGrid horizontal={true} vertical={false} />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis
          dataKey="tool"
          type="category"
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="count"
          name="Usage"
          fill="var(--color-usage)"
          radius={[0, 4, 4, 0]}
          maxBarSize={30}
        />
      </BarChart>
    </ChartContainer>
  );
}
