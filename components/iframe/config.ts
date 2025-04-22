import { IframeConfig } from "./types";

export const defaultIframeConfig: IframeConfig = {
  theme: {
    primaryColor: "#4f46e5",
    secondaryColor: "#8b5cf6",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    fontFamily: "Inter, sans-serif",
  },
  messages: {
    initialMessage: "Hi there! How can I help you today?",
    placeholderText: "Type your message here...",
    headerText: "Chat with our AI",
    loadingText: "Thinking...",
  },
  avatar: {
    showAvatar: true,
    avatarUrl: "",
  },
  layout: {
    fullHeight: true,
    maxHeight: "100vh",
    fullWidth: true,
    maxWidth: "100%",
  },
  branding: {
    showBranding: true,
    brandingText: "Powered by AI",
    brandingLogo: "",
  },
  features: {
    enableFileUpload: false,
    enableRichText: false,
    enableTypingIndicator: true,
    enableInitialMessages: true,
  },
};
