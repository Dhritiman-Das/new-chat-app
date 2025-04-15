"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XAI, OpenAI } from "@/components/icons";
import { type Model } from "@/lib/models";

interface ModelCardProps {
  model: Model;
  onSelect: () => void;
  isSelected: boolean;
}

export default function ModelCard({
  model,
  onSelect,
  isSelected,
}: ModelCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const ProviderIcon =
    model.provider === "xai"
      ? XAI
      : model.provider === "openai"
      ? OpenAI
      : null;

  return (
    <Card
      className={`relative cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary" : "hover:border-primary/50"
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {ProviderIcon && <ProviderIcon className="h-5 w-5" />}
            <span className="text-muted-foreground text-sm">
              {model.providerName}
            </span>
          </div>
          <Badge
            variant="outline"
            className={`${isSyncing ? "animate-pulse bg-green-100" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSync();
            }}
          >
            {isSyncing ? "Syncing" : "Synced"}
          </Badge>
        </div>
        <div className="flex flex-col space-y-1">
          <CardTitle className="text-xl font-medium">{model.name}</CardTitle>
          <div className="flex flex-wrap gap-1">
            {model.attributes?.map((attribute) => (
              <Badge
                key={attribute}
                variant={attribute === "Pro" ? "default" : "secondary"}
                className="text-xs"
              >
                {attribute}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {model.description}
        </p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Context</span>
            <span className="text-sm font-medium">
              {model.contextWindow.toLocaleString()} tokens
            </span>
          </div>
          {model.inputPricing && (
            <div className="flex justify-between">
              <span className="text-sm">Input Pricing</span>
              <span className="text-sm font-medium">{model.inputPricing}</span>
            </div>
          )}
          {model.outputPricing && (
            <div className="flex justify-between">
              <span className="text-sm">Output Pricing</span>
              <span className="text-sm font-medium">{model.outputPricing}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
