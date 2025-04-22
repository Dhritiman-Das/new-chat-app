"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { IframeChat } from "../../components/iframe";
import { IframeConfig } from "../../components/iframe/types";

interface IframeWrapperProps {
  botId: string;
  config: Partial<IframeConfig>;
}

export function IframeWrapper({ botId, config }: IframeWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Short timeout to ensure smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "loop",
          }}
        >
          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin"></div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <IframeChat botId={botId} config={config} />
    </div>
  );
}
