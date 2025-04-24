import { NextRequest, NextResponse } from "next/server";
import { processChatRequest } from "@/app/actions/ai/chat/process";
import { addCorsHeaders } from "@/app/actions/ai/chat/cors";
import { initializeTools } from "@/lib/tools";

// Initialize the tools
initializeTools();

export async function OPTIONS(req: NextRequest) {
  const headers = new Headers();
  const url = new URL(req.url);
  const source = url.searchParams.get("source");
  const botId = url.searchParams.get("botId");

  return new NextResponse(null, {
    status: 204,
    headers: await addCorsHeaders(
      headers,
      source || undefined,
      botId || undefined
    ),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId } = await req.json();
    const url = new URL(req.url);
    const modelId = url.searchParams.get("model") || "gpt-4o";
    const botId = url.searchParams.get("botId");
    const source = url.searchParams.get("source") || "playground";

    if (!modelId) {
      return NextResponse.json(
        { error: "Model ID is required" },
        { status: 400 }
      );
    }

    if (!botId) {
      return NextResponse.json(
        { error: "Bot ID is required" },
        { status: 400 }
      );
    }

    // Process the chat request using our modular function
    const result = await processChatRequest({
      messages,
      conversationId,
      modelId,
      botId,
      source,
      useStreaming: true,
    });

    // Return streaming response with conversation ID and CORS headers
    const headers = new Headers();
    headers.set("X-Conversation-ID", result.conversationId);

    // Add CORS headers
    await addCorsHeaders(headers, source, botId);

    if (result.stream) {
      return new NextResponse(result.stream, {
        status: 200,
        headers,
      });
    } else {
      // In case we're not streaming (shouldn't happen in this route)
      return NextResponse.json(
        { text: result.text, conversationId: result.conversationId },
        { status: 200, headers }
      );
    }
  } catch (error) {
    console.error("Chat API error:", error);

    // Add CORS headers to error response
    const headers = new Headers();
    const url = new URL(req.url);
    const source = url.searchParams.get("source");
    const botId = url.searchParams.get("botId");

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: await addCorsHeaders(
          headers,
          source || undefined,
          botId || undefined
        ),
      }
    );
  }
}
