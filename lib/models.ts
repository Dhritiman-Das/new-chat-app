export type ModelProvider = "xai" | "openai" | "anthropic";

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
  {
    id: "grok-3-mini-beta",
    name: "Grok 3 Mini Beta",
    provider: "xai",
    providerName: "xAI",
    description:
      "A fast and efficient AI model created by xAI to be super helpful and straightforward.",
    contextWindow: 128000,
    attributes: ["New"],
    isAvailable: true,
    modelPageUrl: "https://xai.com/models/grok-3-mini-beta",
    modelPriceUrl: "https://xai.com/pricing",
  },
  {
    id: "grok-3-beta",
    name: "Grok 3 Beta",
    provider: "xai",
    providerName: "xAI",
    description:
      "A powerful AI model created by xAI with advanced reasoning capabilities.",
    contextWindow: 128000,
    attributes: ["Pro", "Intelligent"],
    isAvailable: true,
    modelPageUrl: "https://xai.com/models/grok-3-beta",
    modelPriceUrl: "https://xai.com/pricing",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    providerName: "OpenAI",
    description:
      "GPT-4o from OpenAI has broad general knowledge and domain expertise allowing it to follow complex instructions in natural language and solve difficult problems accurately.",
    contextWindow: 128000,
    inputPricing: "$2.50 / million tokens",
    outputPricing: "$10.00 / million tokens",
    attributes: ["Pro"],
    isAvailable: true,
    modelPageUrl: "https://openai.com/api/models/gpt-4o",
    modelPriceUrl: "https://openai.com/api/pricing",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    providerName: "Anthropic",
    description:
      "A powerful model that excels at a wide range of tasks from sophisticated dialogue and creative content generation to detailed instruction.",
    contextWindow: 200000,
    attributes: ["Pro", "New"],
    isAvailable: false,
    modelPageUrl: "https://anthropic.com/models/claude-3-5-sonnet",
    modelPriceUrl: "https://anthropic.com/pricing",
  },
  {
    id: "claude-3-7-sonnet",
    name: "Claude 3.7 Sonnet",
    provider: "anthropic",
    providerName: "Anthropic",
    description:
      "Anthropic's most advanced model with exceptional reasoning and instruction-following capabilities.",
    contextWindow: 200000,
    attributes: ["Pro", "New", "Intelligent"],
    isAvailable: false,
    modelPageUrl: "https://anthropic.com/models/claude-3-7-sonnet",
    modelPriceUrl: "https://anthropic.com/pricing",
  },
];

export function getModelById(id: string): Model | undefined {
  return models.find((model) => model.id === id);
}

export function getAvailableModels(): Model[] {
  return models.filter((model) => model.isAvailable);
}
