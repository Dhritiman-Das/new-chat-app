"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, Legend } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatNumber } from "@/lib/utils";

interface StatusBreakdownChartProps {
  data: {
    status: string;
    count: number;
  }[];
}

export function StatusBreakdownChart({ data }: StatusBreakdownChartProps) {
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      COMPLETED: {
        label: "Completed",
        theme: {
          light: "var(--chart-1)",
          dark: "var(--chart-1)",
        },
      },
      ABANDONED: {
        label: "Abandoned",
        theme: {
          light: "var(--chart-2)",
          dark: "var(--chart-2)",
        },
      },
      FAILED: {
        label: "Failed",
        theme: {
          light: "var(--chart-3)",
          dark: "var(--chart-3)",
        },
      },
      ACTIVE: {
        label: "Active",
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
      name: item.status,
      value: item.count,
    }));
  }, [data]);

  return (
    <div className="relative min-h-[200px] w-full">
      {/* <div className="flex flex-col items-center justify-center mb-4">
        <div className="text-3xl font-bold">{formatNumber(total)}</div>
        <div className="text-sm text-muted-foreground">Total Conversations</div>
      </div> */}
      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {formattedData.map((entry) => (
              <Cell
                key={entry.name}
                fill={`var(--color-${entry.name})`}
                stroke="transparent"
              />
            ))}
          </Pie>
          <ChartTooltip
            content={<ChartTooltipContent />}
            formatter={(value: number) => formatNumber(value)}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ChartContainer>
    </div>
  );
}
