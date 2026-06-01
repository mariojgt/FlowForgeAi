import { loadModelSettings, type ModelSettings } from "./modelSettings";

export interface GenerateOptions {
  prompt: string;
  model: string;
  temperature: number;
  onToken: (text: string) => void;
}

export interface BrowserAiProvider {
  id: string;
  label: string;
  generate: (options: GenerateOptions) => Promise<string>;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function buildMockResponse(prompt: string, model: string, temperature: number) {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  const topic = cleaned.slice(0, 160) || "the workflow input";
  const tone =
    temperature > 0.7
      ? "creative"
      : temperature < 0.25
        ? "precise"
        : "balanced";

  return [
    `### ${model} mock response`,
    "",
    `I read the prompt as: "${topic}${cleaned.length > 160 ? "..." : ""}"`,
    "",
    `- Main takeaway: the workflow is asking for a ${tone} transformation of the incoming data.`,
    "- Useful next step: review the result, then connect this node to an Output node or a branch.",
    "- Provider note: this static demo uses a mock browser provider, but the provider interface is ready for OpenAI, Anthropic, or browser-native models.",
  ].join("\n");
}

export const mockAiProvider: BrowserAiProvider = {
  id: "mock",
  label: "Mock streaming provider",
  async generate({ prompt, model, temperature, onToken }) {
    const response = buildMockResponse(prompt, model || "mock-fast", temperature);
    const tokens = response.split(/(\s+)/);
    let streamed = "";

    for (const token of tokens) {
      streamed += token;
      onToken(streamed);
      await wait(Math.min(90, 22 + token.length * 4));
    }

    return streamed;
  },
};

function endpointFromBaseUrl(baseUrl: string) {
  const clean = baseUrl.trim().replace(/\/+$/, "");
  if (!clean) {
    return `${loadModelSettings().baseUrl}/chat/completions`;
  }

  return clean.endsWith("/chat/completions")
    ? clean
    : `${clean}/chat/completions`;
}

function parseCustomHeaders(value: string) {
  if (!value.trim()) {
    return {};
  }

  const parsed = JSON.parse(value) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(parsed).filter(([, headerValue]) => typeof headerValue === "string"),
  ) as Record<string, string>;
}

function extractResponseText(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  const choices = record.choices as Array<Record<string, unknown>> | undefined;
  const firstChoice = choices?.[0];
  const message = firstChoice?.message as Record<string, unknown> | undefined;
  const content =
    message?.content ??
    firstChoice?.text ??
    record.output_text ??
    record.content;

  return typeof content === "string" ? content : JSON.stringify(value, null, 2);
}

function createOpenAiCompatibleProvider(settings: ModelSettings): BrowserAiProvider {
  return {
    id: "openai-compatible",
    label: "OpenAI-compatible provider",
    async generate({ prompt, model, temperature, onToken }) {
      const selectedModel = model.trim() || settings.defaultModel.trim();
      if (!settings.apiKey.trim()) {
        throw new Error(
          "Add an API token in Models, or set this LLM node to Mock provider.",
        );
      }

      if (!selectedModel) {
        throw new Error("Add a model name in Models or on this LLM node.");
      }

      let response: Response;

      try {
        response = await fetch(endpointFromBaseUrl(settings.baseUrl), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.apiKey.trim()}`,
            ...parseCustomHeaders(settings.customHeaders),
          },
          body: JSON.stringify({
            model: selectedModel,
            temperature,
            stream: true,
            messages: [
              {
                role: "system",
                content:
                  "You are running inside FlowForge AI. Return useful, concise workflow output.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error("Custom headers must be valid JSON.");
        }

        throw new Error(
          "Model request failed before it reached the provider. Check the base URL, browser/CORS support, and API token.",
        );
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Model request failed (${response.status}): ${
            errorText.slice(0, 280) || response.statusText
          }`,
        );
      }

      if (!response.body) {
        const json = (await response.json()) as unknown;
        const text = extractResponseText(json);
        onToken(text);
        return text;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamed = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) {
            continue;
          }

          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            return streamed;
          }

          const parsed = JSON.parse(data) as Record<string, unknown>;
          const choices = parsed.choices as
            | Array<{
                delta?: { content?: string };
                message?: { content?: string };
                text?: string;
              }>
            | undefined;
          const token =
            choices?.[0]?.delta?.content ??
            choices?.[0]?.message?.content ??
            choices?.[0]?.text ??
            "";

          if (token) {
            streamed += token;
            onToken(streamed);
          }
        }
      }

      return streamed;
    },
  };
}

export function getAiProvider(mode = "saved") {
  if (mode === "mock") {
    return mockAiProvider;
  }

  const settings = loadModelSettings();
  if (settings.provider === "mock") {
    return mockAiProvider;
  }

  return createOpenAiCompatibleProvider(settings);
}
