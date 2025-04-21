export interface IframeConfig {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
  };
  messages: {
    initialMessage: string;
    placeholderText: string;
    headerText: string;
    loadingText: string;
  };
  avatar: {
    showAvatar: boolean;
    avatarUrl?: string;
  };
  layout: {
    fullHeight: boolean;
    maxHeight?: string;
    fullWidth: boolean;
    maxWidth?: string;
  };
  branding: {
    showBranding: boolean;
    brandingText: string;
    brandingLogo?: string;
  };
  features: {
    enableFileUpload: boolean;
    enableRichText: boolean;
    enableTypingIndicator: boolean;
    enableInitialMessages: boolean;
  };
}

export interface IframeParams {
  botId: string;
  config: IframeConfig;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
