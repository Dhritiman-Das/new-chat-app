"use client";

import { useRef, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, PlusCircle } from "@/components/icons";
import { Icons } from "@/components/icons";
import { useChat } from "@ai-sdk/react";
import { type Model } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClipboard } from "@/hooks/use-clipboard";
import ConversationHistoryDialog from "./conversation-history-dialog";
import { getConversationMessages } from "@/app/actions/organizations";

interface ChatInterfaceProps {
  model: Model;
  botId: string;
  models: Model[];
  modelCreditCosts: Map<string, number>;
  onModelChange: (modelId: string) => void;
  onAddPlayground: () => void;
}

export default function ChatInterface({
  model,
  botId,
  models,
  modelCreditCosts,
  onModelChange,
  onAddPlayground,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const { copy } = useClipboard();
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
    api: `/api/chat?model=${model.id}&botId=${botId}`,
    body: {
      conversationId,
    },
    onResponse: (response) => {
      // Extract conversation ID from response headers
      const newConversationId = response.headers.get("X-Conversation-ID");
      if (newConversationId) {
        setConversationId(newConversationId);
      }
    },
    onError: (error) => {
      console.error("Chat error:", JSON.stringify(error, null, 2));
      // Extract the error message from JSON if it's in that format
      let errorMessage = error.message;

      const parsedError = JSON.parse(error.message);
      if (parsedError.error) {
        errorMessage = parsedError.error;
      }

      toast.error(errorMessage || "An unexpected error occurred");
    },
  });

  // Reset conversation ID when model changes
  useEffect(() => {
    setConversationId(null);
    setMessages([]);
  }, [model.id, setMessages]);

  // Auto scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Function to load a conversation from history
  const handleLoadConversation = async (selectedConversationId: string) => {
    setIsLoadingConversation(true);
    try {
      const result = await getConversationMessages({
        conversationId: selectedConversationId,
      });

      if (result?.data?.success && result.data.data) {
        const conversationMessages = result.data.data;

        // Convert prisma messages to useChat format
        const formattedMessages = conversationMessages.map(
          (msg: { id: string; role: string; content: string }) => ({
            id: msg.id,
            role: msg.role.toLowerCase() as "user" | "assistant" | "system",
            content: msg.content,
          })
        );

        // Set the conversation ID and messages
        setConversationId(selectedConversationId);
        setMessages(formattedMessages);

        toast.success("Conversation loaded successfully");
      } else {
        const errorMessage =
          result?.data?.error?.message || "Failed to load conversation";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Failed to load conversation");
    } finally {
      setIsLoadingConversation(false);
    }
  };

  // Function to restart conversation
  const handleRestartConversation = () => {
    setConversationId(null);
    setMessages([]);
    toast.success("Started a new conversation");
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "xai":
        return Icons.X;
      case "openai":
        return Icons.OpenAI;
      case "anthropic":
        return Icons.Anthropic;
      case "gemini":
        return Icons.Gemini;
      case "perplexity":
        return Icons.Perplexity;
      default:
        return null;
    }
  };

  const ProviderIcon = getProviderIcon(model.provider);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 border-b flex-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Select value={model.id} onValueChange={onModelChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue>
                  {ProviderIcon && (
                    <ProviderIcon className="h-4 w-4 mr-2 inline" />
                  )}
                  {model.providerName} / {model.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => {
                  const ModelIcon = getProviderIcon(m.provider);
                  return (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center">
                        {ModelIcon && <ModelIcon className="h-4 w-4 mr-2" />}
                        <span>
                          {m.providerName} / {m.name}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryDialogOpen(true)}
              title="Load past conversation"
            >
              <Icons.History className="h-4 w-4 mr-1" />
              History
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRestartConversation}
              title="Start new conversation"
            >
              <Icons.RefreshCcw className="h-4 w-4 mr-1" />
              New
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="px-2"
              onClick={() => copy(conversationId as string)}
              disabled={!conversationId}
              title="Copy conversation ID"
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={onAddPlayground}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh]">
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
                      <span className="text-sm">Credits per Message</span>
                      <span className="text-sm font-medium">
                        {modelCreditCosts.get(model.id) || "N/A"} credits
                      </span>
                    </div>
                  </div>
                </CardContent>
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
            disabled={isLoading || !input.trim() || isLoadingConversation}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>

      {/* Conversation History Dialog */}
      <ConversationHistoryDialog
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        botId={botId}
        onSelectConversation={handleLoadConversation}
      />
    </Card>
  );
}
