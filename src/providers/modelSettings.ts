import { safeJsonParse } from "../lib/utils";

export type ModelProvider = "openai-compatible" | "mock";

export interface ModelSettings {
  provider: ModelProvider;
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  customHeaders: string;
}

export const MODEL_SETTINGS_KEY = "flowforge.modelSettings";

export const defaultModelSettings: ModelSettings = {
  provider: "openai-compatible",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  defaultModel: "gpt-4.1-mini",
  customHeaders: "",
};

export function loadModelSettings(): ModelSettings {
  if (typeof window === "undefined") {
    return defaultModelSettings;
  }

  const raw = window.localStorage.getItem(MODEL_SETTINGS_KEY);
  const parsed = raw ? safeJsonParse<Partial<ModelSettings>>(raw) : null;

  return {
    ...defaultModelSettings,
    ...parsed,
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
