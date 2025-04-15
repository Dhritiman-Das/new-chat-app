"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Icons } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Model } from "@/lib/models";
import ChatInterface from "./chat-interface";

interface ModelComparisonProps {
  models: Model[];
  botId: string;
}

export default function ModelComparison({
  models,
  botId,
}: ModelComparisonProps) {
  const [selectedModels, setSelectedModels] = useState<Model[]>(
    [
      // Default to first available model
      models.length > 0 ? models[0] : null,
    ].filter(Boolean) as Model[]
  );

  const [viewMode, setViewMode] = useState<"split" | "tabs">("split");

  const handleAddModel = (model: Model) => {
    if (!selectedModels.some((m) => m.id === model.id)) {
      setSelectedModels((prev) => [...prev, model]);
    }
  };

  const handleRemoveModel = (modelId: string) => {
    if (selectedModels.length > 1) {
      setSelectedModels((prev) => prev.filter((m) => m.id !== modelId));
    }
  };

  const availableModels = models.filter(
    (model) => !selectedModels.some((m) => m.id === model.id)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)] max-h-[calc(100vh-13rem)]">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <Button
            variant={viewMode === "split" ? "default" : "outline"}
            onClick={() => setViewMode("split")}
            size="sm"
          >
            Split View
          </Button>
          <Button
            variant={viewMode === "tabs" ? "default" : "outline"}
            onClick={() => setViewMode("tabs")}
            size="sm"
          >
            Tabs
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {availableModels.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Model
                  <Icons.ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <ScrollArea className="h-[300px]">
                  {availableModels.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => handleAddModel(model)}
                      className="cursor-pointer"
                    >
                      {model.name}
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {viewMode === "split" ? (
        <div
          className="grid gap-4 h-full"
          style={{
            gridTemplateColumns: `repeat(${Math.min(
              selectedModels.length,
              3
            )}, minmax(0, 1fr))`,
          }}
        >
          {selectedModels.map((model) => (
            <div key={model.id} className="relative h-full">
              {selectedModels.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 h-6 w-6"
                  onClick={() => handleRemoveModel(model.id)}
                >
                  ×
                </Button>
              )}
              <ChatInterface model={model} botId={botId} />
            </div>
          ))}
        </div>
      ) : (
        <Tabs
          defaultValue={selectedModels[0]?.id}
          className="h-full flex flex-col"
        >
          <TabsList className="mb-4">
            {selectedModels.map((model) => (
              <TabsTrigger key={model.id} value={model.id} className="relative">
                {model.name}
                {selectedModels.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveModel(model.id);
                    }}
                  >
                    ×
                  </Button>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {selectedModels.map((model) => (
            <TabsContent
              key={model.id}
              value={model.id}
              className="flex-1 h-full"
            >
              <ChatInterface model={model} botId={botId} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
