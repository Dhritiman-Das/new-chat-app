"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type Model } from "@/lib/models";
import ChatInterface from "./chat-interface";

interface ModelComparisonProps {
  models: Model[];
  botId: string;
  defaultModelId?: string | null;
}

export default function ModelComparison({
  models,
  botId,
  defaultModelId,
}: ModelComparisonProps) {
  // Generate unique ID prefix for playgrounds
  const playgroundIdPrefix = `playground-${Math.random()
    .toString(36)
    .substring(2, 9)}`;
  let playgroundCounter = 0;

  // Get the default model if specified, otherwise use the first available model
  const getInitialModelId = () => {
    if (defaultModelId) {
      // Verify the defaultModelId exists in available models
      const modelExists = models.some((model) => model.id === defaultModelId);
      if (modelExists) {
        return defaultModelId;
      }
    }
    return models.length > 0 ? models[0].id : "";
  };

  const [playgrounds, setPlaygrounds] = useState<
    { id: string; modelId: string }[]
  >([
    // Use the default model or first available model in first playground
    {
      id: `${playgroundIdPrefix}-${playgroundCounter++}`,
      modelId: getInitialModelId(),
    },
  ]);

  const handleAddPlayground = () => {
    // Add a new playground with default model with unique ID
    setPlaygrounds((prev) => [
      ...prev,
      {
        id: `${playgroundIdPrefix}-${Date.now()}`, // Use timestamp for unique IDs
        modelId: getInitialModelId(),
      },
    ]);
  };

  const handleRemovePlayground = (playgroundId: string) => {
    if (playgrounds.length > 1) {
      setPlaygrounds((prev) => prev.filter((p) => p.id !== playgroundId));
    }
  };

  const handleModelChange = (playgroundId: string, modelId: string) => {
    setPlaygrounds((prev) =>
      prev.map((p) => (p.id === playgroundId ? { ...p, modelId } : p))
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-4 h-full overflow-x-auto pb-2">
        {playgrounds.map((playground) => {
          const model =
            models.find((m) => m.id === playground.modelId) || models[0];

          return (
            <div
              key={playground.id}
              className="relative h-full min-w-[600px] flex-1 flex-shrink-0"
            >
              {playgrounds.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 h-6 w-6"
                  onClick={() => handleRemovePlayground(playground.id)}
                >
                  ×
                </Button>
              )}
              <ChatInterface
                model={model}
                botId={botId}
                models={models}
                onModelChange={(modelId) =>
                  handleModelChange(playground.id, modelId)
                }
                onAddPlayground={handleAddPlayground}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
