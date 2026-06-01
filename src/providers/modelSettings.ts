import { safeJsonParse } from "../lib/utils";

export type ModelProvider = "openai-compatible" | "anthropic" | "google" | "mock";

export interface ModelSettings {
  provider: ModelProvider;
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  customHeaders: string;
}

export const MODEL_SETTINGS_KEY = "flowforge.modelSettings";

export const providerDefaults: Record<
  ModelProvider,
  Pick<ModelSettings, "baseUrl" | "defaultModel" | "customHeaders">
> = {
  "openai-compatible": {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1-mini",
    customHeaders: "",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-20250514",
    customHeaders: "",
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.5-flash",
    customHeaders: "",
  },
  mock: {
    baseUrl: "",
    defaultModel: "mock-fast",
    customHeaders: "",
  },
};

export const providerLabels: Record<ModelProvider, string> = {
  "openai-compatible": "OpenAI-compatible API",
  anthropic: "Anthropic Claude",
  google: "Google Gemini",
  mock: "Mock provider",
};

export const modelPresets: Record<ModelProvider, string[]> = {
  "openai-compatible": ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-7-sonnet-20250219",
  ],
  google: [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-3-pro-preview",
  ],
  mock: ["mock-fast", "mock-balanced", "mock-creative"],
};

export const defaultModelSettings: ModelSettings = {
  provider: "openai-compatible",
  apiKey: "",
  ...providerDefaults["openai-compatible"],
};

export function loadModelSettings(): ModelSettings {
  if (typeof window === "undefined") {
    return defaultModelSettings;
  }

  const raw = window.localStorage.getItem(MODEL_SETTINGS_KEY);
  const parsed = raw ? safeJsonParse<Partial<ModelSettings>>(raw) : null;

  const provider =
    parsed?.provider && parsed.provider in providerDefaults
      ? (parsed.provider as ModelProvider)
      : defaultModelSettings.provider;

  return {
    ...defaultModelSettings,
    ...providerDefaults[provider],
    ...parsed,
    provider,
  };
}

export function saveModelSettings(settings: ModelSettings) {
  window.localStorage.setItem(MODEL_SETTINGS_KEY, JSON.stringify(settings));
}

export function clearModelSettings() {
  window.localStorage.removeItem(MODEL_SETTINGS_KEY);
}

export function hasUsableModelToken(settings = loadModelSettings()) {
  return settings.provider === "mock" || Boolean(settings.apiKey.trim());
}
