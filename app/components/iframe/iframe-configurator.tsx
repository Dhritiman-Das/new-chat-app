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
    <div className="flex flex-1 gap-6 overflow-hidden">
      <div className="w-2/5 overflow-auto">
        <h1 className="text-2xl font-bold mb-6">Iframe Configuration</h1>
        <ConfigurePanel botId={botId} config={config} setConfig={setConfig} />
      </div>
      <div className="w-3/5 overflow-auto">
        <h1 className="text-2xl font-bold mb-6">Preview</h1>
        <div className="border rounded-lg h-[calc(100vh-12rem)]">
          <IframePreview botId={botId} config={config} />
        </div>
      </div>
    </div>
  );
}
