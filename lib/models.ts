export type ModelProvider =
  | "xai"
  | "openai"
  | "anthropic"
  | "gemini"
  | "perplexity";

export type ModelAttribute = "Pro" | "New" | "Intelligent" | "Fast";

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  providerName: string;
  description: string;
  contextWindow: number;
  inputPricing?: string;
  outputPricing?: string;
  attributes?: ModelAttribute[];
  isAvailable?: boolean;
  modelPageUrl?: string;
  modelPriceUrl?: string;
}

export const models: Model[] = [
  // xAI
  {
    id: "grok-3",
    name: "Grok 3",
    provider: "xai",
    providerName: "xAI",
    description:
      "xAI's flagship model for 2025, excelling at reasoning, math, science, and real-time information with a massive context window.",
    contextWindow: 1000000,
    attributes: ["Pro", "Intelligent", "New"],
    isAvailable: true,
    modelPageUrl: "https://xai.com/models/grok-3",
    modelPriceUrl: "https://xai.com/pricing",
  },
  {
    id: "grok-3-mini",
    name: "Grok 3 Mini",
    provider: "xai",
    providerName: "xAI",
    description:
      "A lightweight, fast, and efficient version of Grok 3, suitable for high-volume or lower-latency tasks.",
    contextWindow: 128000,
    attributes: ["Fast", "New"],
    isAvailable: true,
    modelPageUrl: "https://xai.com/models/grok-3-mini",
    modelPriceUrl: "https://xai.com/pricing",
  },

  // OpenAI
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    providerName: "OpenAI",
    description:
      "OpenAI’s GPT-4o is a top-tier general-purpose model with broad knowledge, strong reasoning, and a large context window.",
    contextWindow: 128000,
    inputPricing: "$2.50 / million tokens",
    outputPricing: "$10.00 / million tokens",
    attributes: ["Pro"],
    isAvailable: true,
    modelPageUrl: "https://openai.com/api/models/gpt-4o",
    modelPriceUrl: "https://openai.com/api/pricing",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    providerName: "OpenAI",
    description:
      "OpenAI’s GPT-4o Mini is a smaller, faster version of GPT-4o, suitable for low-latency applications.",
    contextWindow: 128000,
    inputPricing: "$0.50 / million tokens",
    outputPricing: "$2.00 / million tokens",
    attributes: ["Fast", "New"],
    isAvailable: true,
    modelPageUrl: "https://openai.com/api/models/gpt-4o-mini",
    modelPriceUrl: "https://openai.com/api/pricing",
  },
  {
    id: "gpt-o3-mini",
    name: "GPT-o3 Mini",
    provider: "openai",
    providerName: "OpenAI",
    description:
      "OpenAI’s latest reasoning-optimized model for STEM and code, offering lower cost and fast responses.",
    contextWindow: 128000,
    attributes: ["Fast", "New"],
    isAvailable: true,
    modelPageUrl: "https://openai.com/api/models/gpt-o3-mini",
    modelPriceUrl: "https://openai.com/api/pricing",
  },

  // Anthropic
  {
    id: "claude-3-7-sonnet",
    name: "Claude 3.7 Sonnet",
    provider: "anthropic",
    providerName: "Anthropic",
    description:
      "Anthropic’s most advanced 2025 model, with exceptional reasoning and instruction-following capabilities.",
    contextWindow: 200000,
    attributes: ["Pro", "Intelligent", "New"],
    isAvailable: true,
    modelPageUrl: "https://anthropic.com/models/claude-3-7-sonnet",
    modelPriceUrl: "https://anthropic.com/pricing",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    providerName: "Anthropic",
    description:
      "A powerful model excelling at sophisticated dialogue and creative content generation.",
    contextWindow: 200000,
    attributes: ["Pro", "New"],
    isAvailable: true,
    modelPageUrl: "https://anthropic.com/models/claude-3-5-sonnet",
    modelPriceUrl: "https://anthropic.com/pricing",
  },

  // Gemini (Google)
  {
    id: "gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    providerName: "Google",
    description:
      "Google’s Gemini 2.5 Pro is a flagship model for enterprise-grade tasks, with advanced multimodal and coding capabilities.",
    contextWindow: 2000000,
    attributes: ["Pro", "Intelligent", "New"],
    isAvailable: true,
    modelPageUrl: "https://ai.google/discover/gemini-2-5-pro",
    modelPriceUrl: "https://ai.google/pricing",
  },
  {
    id: "gemini-2-0-flash",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    providerName: "Google",
    description:
      "A fast, lightweight version of Gemini 2.0, optimized for speed and efficiency.",
    contextWindow: 128000,
    attributes: ["Fast", "New"],
    isAvailable: true,
    modelPageUrl: "https://ai.google/discover/gemini-2-0-flash",
    modelPriceUrl: "https://ai.google/pricing",
  },

  // Perplexity
  {
    id: "perplexity-llama-3",
    name: "Perplexity Llama-3",
    provider: "perplexity",
    providerName: "Perplexity",
    description:
      "Perplexity’s integration of Meta’s Llama-3, optimized for research and conversational accuracy.",
    contextWindow: 128000,
    attributes: ["Pro", "New"],
    isAvailable: true,
    modelPageUrl: "https://www.perplexity.ai/models/llama-3",
    modelPriceUrl: "https://www.perplexity.ai/pricing",
  },
  {
    id: "perplexity-mistral-large-2",
    name: "Perplexity Mistral Large 2",
    provider: "perplexity",
    providerName: "Perplexity",
    description:
      "A high-performance model based on Mistral Large 2, known for multilingual and coding capabilities.",
    contextWindow: 128000,
    attributes: ["Pro", "Intelligent", "New"],
    isAvailable: true,
    modelPageUrl: "https://www.perplexity.ai/models/mistral-large-2",
    modelPriceUrl: "https://www.perplexity.ai/pricing",
  },
];

export function getModelById(id: string): Model | undefined {
  return models.find((model) => model.id === id);
}

export function getAvailableModels(): Model[] {
  return models.filter((model) => model.isAvailable);
}
