"use client";

import { useMemo } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDate } from "@/lib/utils";

interface LeadGenerationChartProps {
  data: {
    date: string;
    rate: number; // Percentage as decimal (e.g., 0.25 for 25%)
  }[];
}

export function LeadGenerationChart({ data }: LeadGenerationChartProps) {
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      rate: {
        label: "Lead Rate (%)",
        theme: {
          light: "var(--chart-4)",
          dark: "var(--chart-4)",
        },
      },
    }),
    []
  );

  const formattedData = useMemo(() => {
    return data.map((item) => ({
      date: formatDate(new Date(item.date)),
      rate: (item.rate * 100).toFixed(1), // Convert to percentage for display
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Historical trend */}
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 20, bottom: 20, left: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          <ChartTooltip
            content={<ChartTooltipContent indicator="line" />}
            formatter={(value: string) => `${value}%`}
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="var(--color-rate)"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
