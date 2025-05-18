"use client";

import { useState, useEffect } from "react";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tooltip,
} from "@/components/ui/tooltip";
import { fetchVectorRecord } from "@/app/actions/vector-db";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface VectorChunkTooltipProps {
  id: string;
  score?: number;
  children: React.ReactNode;
}

export function VectorChunkTooltip({
  id,
  score,
  children,
}: VectorChunkTooltipProps) {
  const [chunk, setChunk] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch chunk when tooltip is first rendered
  useEffect(() => {
    console.log("fetching chunk", id);
    let isMounted = true;

    const getChunk = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const result = await fetchVectorRecord({ id });
        if (isMounted) {
          if (result?.data?.success) {
            setChunk(result.data.data?.metadata.chunk as string);
          } else {
            setError("Failed to load chunk content");
          }
          setIsLoading(false);
        }
      } catch {
        // Ignore the specific error, just handle the failure case
        if (isMounted) {
          setError("Error loading chunk content");
          setIsLoading(false);
        }
      }
    };

    getChunk();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Calculate confidence class based on score
  const getConfidenceColor = (score?: number) => {
    if (!score) return "bg-muted";
    if (score >= 0.8) return "bg-chart-1";
    if (score >= 0.5) return "bg-chart-4";
    return "bg-destructive";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="start"
          className="max-w-md border border-border bg-card shadow-lg p-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <Badge
                  variant="outline"
                  className="font-medium text-foreground"
                >
                  Match Score
                </Badge>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-16 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full ${getConfidenceColor(
                        score
                      )} transition-all duration-300`}
                      style={{ width: `${score ? score * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {score ? (score * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ) : error ? (
              <p className="text-xs text-destructive font-medium">{error}</p>
            ) : chunk ? (
              <div className="text-xs bg-muted text-muted-foreground p-3 rounded-md border border-border overflow-auto max-h-[200px]">
                <p className="break-words whitespace-pre-wrap break-all">
                  {chunk}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No content available
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
