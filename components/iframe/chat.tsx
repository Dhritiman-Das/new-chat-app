"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "ai/react";
import { IframeConfig } from "./types";
import { defaultIframeConfig } from "./config";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

interface IframeChatProps {
  botId: string;
  config?: Partial<IframeConfig>;
  className?: string;
}

export function IframeChat({ botId, config = {}, className }: IframeChatProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const mergedConfig = {
    ...defaultIframeConfig,
    ...config,
    theme: { ...defaultIframeConfig.theme, ...config.theme },
    messages: { ...defaultIframeConfig.messages, ...config.messages },
    avatar: { ...defaultIframeConfig.avatar, ...config.avatar },
    layout: { ...defaultIframeConfig.layout, ...config.layout },
    branding: { ...defaultIframeConfig.branding, ...config.branding },
    features: { ...defaultIframeConfig.features, ...config.features },
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageRef = useRef<string>(
    mergedConfig.messages.initialMessage
  );

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
    api: `/api/chat?botId=${botId}&source=iframe`,
    body: {
      conversationId,
    },
    onResponse: (response) => {
      const newConversationId = response.headers.get("X-Conversation-ID");
      if (newConversationId) {
        setConversationId(newConversationId);
      }
      setTimeout(() => scrollToBottom(), 100);
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  useEffect(() => {
    // Add initial message if enabled
    if (mergedConfig.features.enableInitialMessages && messages.length === 0) {
      setMessages([
        {
          id: "0",
          role: "assistant",
          content: mergedConfig.messages.initialMessage,
          createdAt: new Date(),
        },
      ]);
    }
  }, [
    mergedConfig.features.enableInitialMessages,
    mergedConfig.messages.initialMessage,
    messages.length,
    setMessages,
  ]);

  // Effect to update initial message when config changes
  useEffect(() => {
    if (
      messages.length > 0 &&
      messages[0].role === "assistant" &&
      initialMessageRef.current !== mergedConfig.messages.initialMessage
    ) {
      const updatedMessages = [...messages];
      updatedMessages[0] = {
        ...updatedMessages[0],
        content: mergedConfig.messages.initialMessage,
      };
      setMessages(updatedMessages);
      initialMessageRef.current = mergedConfig.messages.initialMessage;
    }
  }, [mergedConfig.messages.initialMessage, messages, setMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    handleSubmit(e);
    setTimeout(() => scrollToBottom(), 100);
  };

  const {
    theme,
    messages: messageConfig,
    avatar,
    layout,
    branding,
    features,
  } = mergedConfig;

  const containerStyle = {
    "--primary-color": theme.primaryColor,
    "--secondary-color": theme.secondaryColor,
    "--background-color": theme.backgroundColor,
    "--text-color": theme.textColor,
    "--font-family": theme.fontFamily,
    fontFamily: theme.fontFamily,
    maxHeight: layout.fullHeight ? "100vh" : layout.maxHeight,
    maxWidth: layout.fullWidth ? "100%" : layout.maxWidth,
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full bg-[var(--background-color)] text-[var(--text-color)]",
        className
      )}
      style={containerStyle}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 sm:p-4 border-b flex items-center justify-between"
        style={{
          backgroundColor: theme.primaryColor,
          color: "#fff",
        }}
      >
        <h2 className="text-base sm:text-lg font-semibold truncate">
          {messageConfig.headerText}
        </h2>
      </motion.div>

      {/* Messages */}
      <motion.div
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex items-start mb-3 sm:mb-4",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && avatar.showAvatar && (
                <div
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mr-2 flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {avatar.avatarUrl ? (
                    <Image
                      src={avatar.avatarUrl}
                      alt="Bot"
                      width={32}
                      height={32}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
                    />
                  ) : (
                    <span className="text-white text-xs sm:text-sm">AI</span>
                  )}
                </div>
              )}
              <div
                className={cn(
                  "py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg",
                  message.role === "user"
                    ? "bg-[var(--primary-color)] text-white ml-2 max-w-[85%] sm:max-w-[80%]"
                    : "bg-gray-100 text-[var(--text-color)] max-w-[85%] sm:max-w-[80%]"
                )}
                style={{ fontFamily: "inherit" }}
              >
                <div className="text-sm sm:text-base break-words">
                  {message.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && features.enableTypingIndicator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start"
          >
            {avatar.showAvatar && (
              <div
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mr-2 flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {avatar.avatarUrl ? (
                  <Image
                    src={avatar.avatarUrl}
                    alt="Bot"
                    width={32}
                    height={32}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
                  />
                ) : (
                  <span className="text-white text-xs sm:text-sm">AI</span>
                )}
              </div>
            )}
            <div className="bg-gray-100 py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg flex items-center space-x-1">
              <div
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </motion.div>

      {/* Input */}
      <motion.form
        onSubmit={handleFormSubmit}
        className="border-t p-2 sm:p-4 flex gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={messageConfig.placeholderText}
          className="flex-1 text-sm sm:text-base h-10 sm:h-auto min-h-[40px]"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="h-10 w-10 sm:h-auto sm:w-auto min-h-[40px] px-2 sm:px-4"
          style={{
            backgroundColor: theme.primaryColor,
            color: "#fff",
          }}
        >
          {isLoading ? (
            <Icons.Spinner className="h-4 w-4 animate-spin" />
          ) : (
            <Icons.ArrowRight className="h-4 w-4" />
          )}
        </Button>
      </motion.form>

      {/* Branding */}
      {branding.showBranding && (
        <motion.div
          className="p-1.5 sm:p-2 text-center text-[10px] sm:text-xs text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {branding.brandingText}
          {branding.brandingLogo && (
            <Image
              src={branding.brandingLogo}
              alt="Branding"
              width={16}
              height={16}
              className="h-3 sm:h-4 inline-block ml-1"
            />
          )}
        </motion.div>
      )}
    </div>
  );
}
