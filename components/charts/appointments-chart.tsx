"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDate, formatNumber } from "@/lib/utils";

interface AppointmentsChartProps {
  data: {
    date: string;
    count: number;
  }[];
}

export function AppointmentsChart({ data }: AppointmentsChartProps) {
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      appointments: {
        label: "Appointments",
        theme: {
          light: "var(--chart-5)",
          dark: "var(--chart-5)",
        },
      },
    }),
    []
  );

  const formattedData = useMemo(() => {
    return data.map((item) => ({
      date: formatDate(new Date(item.date)),
      appointments: item.count,
    }));
  }, [data]);

  return (
    <div className="space-y-4">
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
            tickFormatter={(value) => formatNumber(value)}
          />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <Area
            type="monotone"
            dataKey="appointments"
            stroke="var(--color-appointments)"
            fill="var(--color-appointments)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
