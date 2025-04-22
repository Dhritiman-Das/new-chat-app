"use client";

import { useState } from "react";
import { ConfigurePanel } from "./configure-panel";
import { IframePreview } from "./preview";
import { IframeConfig } from "./types";
import { defaultIframeConfig } from "./config";

interface IframeConfiguratorProps {
  botId: string;
  initialConfig: Partial<IframeConfig>;
}

export function IframeConfigurator({
  botId,
  initialConfig,
}: IframeConfiguratorProps) {
  // Create a complete config object by merging defaults with initialConfig
  const [config, setConfig] = useState<IframeConfig>({
    ...defaultIframeConfig,
    ...initialConfig,
    theme: { ...defaultIframeConfig.theme, ...initialConfig.theme },
    messages: { ...defaultIframeConfig.messages, ...initialConfig.messages },
    avatar: { ...defaultIframeConfig.avatar, ...initialConfig.avatar },
    layout: { ...defaultIframeConfig.layout, ...initialConfig.layout },
    branding: { ...defaultIframeConfig.branding, ...initialConfig.branding },
    features: { ...defaultIframeConfig.features, ...initialConfig.features },
  });

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 overflow-hidden">
        <div className="w-full lg:w-2/5 flex flex-col overflow-hidden">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">
            Iframe Configuration
          </h1>
          <div className="overflow-auto flex-1">
            <ConfigurePanel
              botId={botId}
              config={config}
              setConfig={setConfig}
            />
          </div>
        </div>
        <div className="w-full lg:w-3/5 flex flex-col">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Preview</h1>
          <div className="border rounded-lg h-[400px] md:h-[500px] lg:h-[calc(100vh-14rem)] flex-1">
            <IframePreview botId={botId} config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}
