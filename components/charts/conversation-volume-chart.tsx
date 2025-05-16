"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDate } from "@/lib/utils";

interface ConversationVolumeChartProps {
  data: {
    date: string;
    count: number;
  }[];
}

export function ConversationVolumeChart({
  data,
}: ConversationVolumeChartProps) {
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      conversations: {
        label: "Conversations",
        theme: {
          light: "var(--chart-2)",
          dark: "var(--chart-2)",
        },
      },
    }),
    []
  );

  const formattedData = useMemo(() => {
    return data.map((item) => ({
      date: formatDate(new Date(item.date)),
      conversations: item.count,
    }));
  }, [data]);

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <AreaChart
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
          tickFormatter={(value) => `${value}`}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Area
          type="monotone"
          dataKey="conversations"
          stroke="var(--color-conversations)"
          fill="var(--color-conversations)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
