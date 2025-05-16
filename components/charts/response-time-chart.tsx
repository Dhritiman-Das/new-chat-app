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

interface ResponseTimeChartProps {
  data: {
    date: string;
    avgResponseTime: number;
  }[];
}

export function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      responseTime: {
        label: "Response Time",
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
      responseTime: Math.round(item.avgResponseTime),
    }));
  }, [data]);

  const currentResponseTime = useMemo(() => {
    const latest = formattedData[formattedData.length - 1];
    return latest ? latest.responseTime : 0;
  }, [formattedData]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Current Avg. Response Time
        </div>
        <div className="text-2xl font-bold">{currentResponseTime} ms</div>
      </div>

      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
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
            tickFormatter={(value) => `${value} ms`}
          />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <Line
            type="monotone"
            dataKey="responseTime"
            stroke="var(--color-responseTime)"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
