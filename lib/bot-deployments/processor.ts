import { ProcessMessageOptions } from "./types";
import { processChatRequest } from "@/app/actions/ai/chat/process";

/**
 * Processes a message from any deployment platform through the chat API
 */
export async function processDeploymentMessage(
  options: ProcessMessageOptions
): Promise<void> {
  const {
    botId,
    userId,
    messages,
    source,
    platform,
    conversationId,
    organizationId,
    // deploymentType,
    modelId = "gpt-4o", // Default model
    webhookPayload, // Extract webhookPayload for tools
  } = options;

  // Set thinking status if supported by the platform
  if (platform.setStatus) {
    await platform.setStatus("Processing...");
  }

  try {
    // Process the chat request using our modular function
    const result = await processChatRequest({
      messages,
      conversationId,
      modelId,
      botId,
      userId,
      organizationId,
      source: source || "deployment",
      useStreaming: platform.supportsStreaming,
      webhookPayload, // Pass the webhook payload to the processChatRequest
    });

    if (
      platform.supportsStreaming &&
      platform.appendToMessage &&
      result.stream
    ) {
      // For platforms that support streaming
      // Send an initial empty message that will be appended to
      await platform.sendMessage("");

      // Connect to the stream and process chunks
      const reader = result.stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append the chunk to the message
        const chunk = new TextDecoder().decode(value);
        await platform.appendToMessage(chunk);
      }
    } else if (result.text !== null) {
      // For platforms that don't support streaming
      await platform.sendMessage(result.text);
    } else {
      throw new Error("No text available in non-streaming mode");
    }

    // Clear status if applicable
    if (platform.setStatus) {
      await platform.setStatus("");
    }
  } catch (error) {
    console.error("Error processing message:", error);

    // Clear status on error
    if (platform.setStatus) {
      await platform.setStatus("");
    }

    // Send error message through the platform
    try {
      await platform.sendMessage(
        "Sorry, I encountered an error processing your request."
      );
    } catch (sendError) {
      console.error("Error sending error message:", sendError);
    }

    // Don't re-throw to avoid cascading errors
  }
}
