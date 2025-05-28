"use client";

import { FC } from "react";
import Link from "next/link";
import {
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface UsageIndicatorProps {
  usage: number;
  limit: number;
  available: number;
  label?: string;
  redirectUrl?: string;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

const UsageIndicator: FC<UsageIndicatorProps> = ({
  usage,
  limit,
  available,
  label = "Usage",
  redirectUrl,
  tooltipSide = "top",
  size = "md",
  showTooltip = true,
}) => {
  const isLimitReached = available <= 0;
  const usagePercentage = (usage / (limit || 1)) * 100;

  // Define sizes for different size options
  const sizeMap = {
    sm: {
      width: 36,
      height: 36,
      fontSize: 10,
      innerRadius: 12,
      outerRadius: 18,
    },
    md: {
      width: 48,
      height: 48,
      fontSize: 12,
      innerRadius: 16,
      outerRadius: 24,
    },
    lg: {
      width: 64,
      height: 64,
      fontSize: 14,
      innerRadius: 22,
      outerRadius: 32,
    },
  };

  const { width, height, fontSize, innerRadius, outerRadius } = sizeMap[size];

  // Get appropriate color based on usage percentage
  const getUsageColor = () => {
    if (usagePercentage > 90) {
      return "var(--destructive)";
    }
    if (usagePercentage > 70) {
      return "var(--chart-4)";
    }
    return "var(--chart-2)";
  };

  // Data for the radial chart
  const data = [
    {
      name: "usage",
      value: usage,
      fill: getUsageColor(),
    },
  ];

  // Calculate max angle (360 degrees if full, or percentage of 360)
  const maxAngle = limit ? Math.min(360, (usage / limit) * 360) : 0;

  const chartContent = (
    <div className="flex items-center justify-center">
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
        className={`relative flex items-center justify-center ${
          isLimitReached ? "text-destructive-foreground" : ""
        }`}
      >
        <RadialBarChart
          width={width}
          height={height}
          data={data}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          barSize={6}
          startAngle={90}
          endAngle={maxAngle}
        >
          <PolarGrid radialLines={false} gridType="circle" />
          <RadialBar background dataKey="value" cornerRadius={10} />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false} />
        </RadialBarChart>
        <div
          className="absolute inset-0 flex items-center justify-center text-center font-medium"
          style={{ fontSize: `${fontSize}px` }}
        >
          {usage}/{limit}
        </div>
      </div>
    </div>
  );

  // Tooltip content
  const tooltipContent = (
    <div className="space-y-3 p-1">
      <h4 className="font-semibold text-sm text-secondary">{label}</h4>

      <div className="space-y-2">
        {/* Progress Bar */}
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 ease-in-out rounded-full"
            style={{
              width: `${Math.min(100, usagePercentage)}%`,
              backgroundColor: getUsageColor(),
            }}
          />
        </div>

        {/* Usage Stats */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted">
            {usage}/{limit} used
          </span>
          <span className="text-muted">{usagePercentage.toFixed(0)}%</span>
        </div>
      </div>

      {/* Status Message */}
      <div className="text-xs">
        {isLimitReached ? (
          <p className="text-destructive font-medium">
            You&apos;ve reached the maximum {label.toLowerCase()} allowed for
            your plan.
          </p>
        ) : (
          <p className="text-muted">
            {available} {label.toLowerCase()} slot{available !== 1 ? "s" : ""}{" "}
            remaining
          </p>
        )}
      </div>

      {/* Billing Button */}
      {isLimitReached && redirectUrl && (
        <Button
          variant="default"
          size="sm"
          className="w-full text-secondary mt-1 h-8 bg-secondary/10 hover:bg-secondary/20"
          asChild
        >
          <Link href={redirectUrl}>
            <span className="text-xs">Upgrade Plan</span>
          </Link>
        </Button>
      )}
    </div>
  );

  return showTooltip ? (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{chartContent}</TooltipTrigger>
        <TooltipContent className="w-64 p-3" side={tooltipSide}>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    chartContent
  );
};

export { UsageIndicator };
