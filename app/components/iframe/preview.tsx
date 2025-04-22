"use client";

import { motion } from "framer-motion";
import { IframeConfig } from "./types";
import { IframeChat } from "./chat";

interface IframePreviewProps {
  botId: string;
  config: Partial<IframeConfig>;
}

export function IframePreview({ botId, config }: IframePreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full overflow-hidden rounded-lg border shadow-md bg-secondary flex"
    >
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full h-full max-w-full sm:max-w-[400px] md:max-w-full lg:max-w-[480px] mx-auto">
          <IframeChat botId={botId} config={config} className="h-full" />
        </div>
      </div>
    </motion.div>
  );
}
