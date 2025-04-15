import { xai } from "@ai-sdk/xai";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getModelById } from "@/lib/models";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

interface ChatMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const url = new URL(req.url);
  const modelId = url.searchParams.get("model");
  const botId = url.searchParams.get("botId");

  if (!modelId) {
    return new Response("Model ID is required", { status: 400 });
  }

  // Get bot system prompt if botId is provided
  let systemPrompt = "You are a helpful assistant.";
  if (botId) {
    try {
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
      });
      if (bot) {
        systemPrompt = bot.systemPrompt;
      }
    } catch (error) {
      console.error("Error fetching bot:", error);
    }
  }

  // Add system message if it doesn't exist
  const hasSystemMessage = messages.some(
    (message: ChatMessage) => message.role === "system"
  );
  const messagesWithSystem = hasSystemMessage
    ? messages
    : [{ role: "system", content: systemPrompt }, ...messages];

  const model = getModelById(modelId);

  if (!model) {
    return new Response("Model not found", { status: 404 });
  }

  try {
    let aiModel;

    if (model.provider === "xai") {
      aiModel = xai(model.id);
    } else if (model.provider === "openai") {
      aiModel = openai(model.id);
    } else {
      return new Response("Provider not supported", { status: 400 });
    }

    const result = streamText({
      model: aiModel,
      messages: messagesWithSystem,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error:", error);
    return new Response("Error processing your request", { status: 500 });
  }
}
