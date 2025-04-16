"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  ArrowUpRight,
  XAI,
  OpenAI,
  ArrowUpRight as ExternalLink,
} from "@/components/icons";
import { useChat } from "ai/react";
import { type Model } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ChatInterfaceProps {
  model: Model;
  botId: string;
}

export default function ChatInterface({ model, botId }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: `/api/chat?model=${model.id}&botId=${botId}`,
      // We no longer need the onFinish callback since useChat will manage the messages
    });

  // Auto scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const ProviderIcon =
    model.provider === "xai"
      ? XAI
      : model.provider === "openai"
      ? OpenAI
      : null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 border-b flex-none">
        <CardTitle className="text-base font-medium flex items-center">
          <MessageSquare className="h-4 w-4 mr-2" />
          {model.name}
        </CardTitle>
      </CardHeader>
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 p-4 h-[calc(100vh-25rem)]"
      >
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4">
              <Card className="w-full max-w-md mx-auto border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {ProviderIcon && <ProviderIcon className="h-5 w-5" />}
                    <span className="text-muted-foreground text-sm">
                      {model.providerName} / {model.name}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
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
                        <span className="text-sm font-medium">
                          {model.inputPricing}
                        </span>
                      </div>
                    )}
                    {model.outputPricing && (
                      <div className="flex justify-between">
                        <span className="text-sm">Output Pricing</span>
                        <span className="text-sm font-medium">
                          {model.outputPricing}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <Separator />

                <CardFooter className="flex justify-between py-3">
                  <div className="flex gap-2">
                    {model.modelPageUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          window.open(model.modelPageUrl, "_blank")
                        }
                      >
                        Model Page
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                    {model.modelPriceUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          window.open(model.modelPriceUrl, "_blank")
                        }
                      >
                        Pricing
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>

              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                  Start a conversation to begin testing this model
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`px-4 py-2 rounded-lg max-w-[80%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-2 rounded-lg max-w-[80%] bg-muted">
                    <div className="flex space-x-2 items-center">
                      <div
                        className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>
      <CardFooter className="border-t p-4 flex-none">
        <form
          onSubmit={handleSubmit}
          className="flex w-full items-center space-x-2"
        >
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
