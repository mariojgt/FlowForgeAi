import {
  loadModelSettings,
  providerLabels,
  type ModelSettings,
} from "./modelSettings";

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

function openAiEndpointFromBaseUrl(baseUrl: string) {
  const clean = baseUrl.trim().replace(/\/+$/, "");
  if (!clean) {
    return `${loadModelSettings().baseUrl}/chat/completions`;
  }

  return clean.endsWith("/chat/completions")
    ? clean
    : `${clean}/chat/completions`;
}

function anthropicEndpointFromBaseUrl(baseUrl: string) {
  const clean = baseUrl.trim().replace(/\/+$/, "");
  if (!clean) {
    return "https://api.anthropic.com/v1/messages";
  }

  return clean.endsWith("/messages") ? clean : `${clean}/messages`;
}

function googleEndpointFromBaseUrl(baseUrl: string, model: string) {
  const clean = baseUrl.trim().replace(/\/+$/, "");
  const selectedModel = model.replace(/^models\//, "");
  const root = clean || "https://generativelanguage.googleapis.com/v1beta";

  return `${root}/models/${encodeURIComponent(
    selectedModel,
  )}:streamGenerateContent?alt=sse`;
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

function extractAnthropicResponseText(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const content = (value as { content?: Array<{ text?: string }> }).content;
  return content?.map((part) => part.text ?? "").join("") ?? "";
}

function extractGoogleResponseText(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const candidates = (value as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  }).candidates;
  return (
    candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? ""
  );
}

function selectedModel(settings: ModelSettings, model: string) {
  return model.trim() || settings.defaultModel.trim();
}

function assertReady(settings: ModelSettings, model: string) {
  if (!settings.apiKey.trim()) {
    throw new Error(
      `Add a ${providerLabels[settings.provider]} API token in Models, or set this LLM node to Mock provider.`,
    );
  }

  if (!model) {
    throw new Error("Add a model name in Models or on this LLM node.");
  }
}

async function readSseStream(
  response: Response,
  onEvent: (payload: Record<string, unknown>) => string | undefined,
  onToken: (text: string) => void,
) {
  if (!response.body) {
    return "";
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
      const token = onEvent(parsed) ?? "";

      if (token) {
        streamed += token;
        onToken(streamed);
      }
    }
  }

  return streamed;
}

async function fetchProvider(
  endpoint: string,
  settings: ModelSettings,
  body: Record<string, unknown>,
  headers: Record<string, string>,
) {
  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
        ...parseCustomHeaders(settings.customHeaders),
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Custom headers must be valid JSON.");
    }

    throw new Error(
      "Model request failed before it reached the provider. Check the base URL, browser/CORS support, and API token.",
    );
  }
}

async function assertOk(response: Response) {
  if (response.ok) {
    return;
  }

  const errorText = await response.text().catch(() => "");
  throw new Error(
    `Model request failed (${response.status}): ${
      errorText.slice(0, 280) || response.statusText
    }`,
  );
}

function createOpenAiCompatibleProvider(settings: ModelSettings): BrowserAiProvider {
  return {
    id: "openai-compatible",
    label: "OpenAI-compatible provider",
    async generate({ prompt, model, temperature, onToken }) {
      const modelName = selectedModel(settings, model);
      assertReady(settings, modelName);

      const response = await fetchProvider(
        openAiEndpointFromBaseUrl(settings.baseUrl),
        settings,
        {
          model: modelName,
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
        },
        {
          Authorization: `Bearer ${settings.apiKey.trim()}`,
        },
      );

      await assertOk(response);

      if (!response.headers.get("content-type")?.includes("text/event-stream")) {
        const json = (await response.json()) as unknown;
        const text = extractResponseText(json);
        onToken(text);
        return text;
      }

      return readSseStream(
        response,
        (parsed) => {
          const choices = parsed.choices as
            | Array<{
                delta?: { content?: string };
                message?: { content?: string };
                text?: string;
              }>
            | undefined;
          return (
            choices?.[0]?.delta?.content ??
            choices?.[0]?.message?.content ??
            choices?.[0]?.text ??
            ""
          );
        },
        onToken,
      );
    },
  };
}

function createAnthropicProvider(settings: ModelSettings): BrowserAiProvider {
  return {
    id: "anthropic",
    label: "Anthropic Claude",
    async generate({ prompt, model, temperature, onToken }) {
      const modelName = selectedModel(settings, model);
      assertReady(settings, modelName);

      const response = await fetchProvider(
        anthropicEndpointFromBaseUrl(settings.baseUrl),
        settings,
        {
          model: modelName,
          max_tokens: 4096,
          temperature,
          stream: true,
          system:
            "You are running inside FlowForge AI. Return useful, concise workflow output.",
          messages: [{ role: "user", content: prompt }],
        },
        {
          "anthropic-version": "2023-06-01",
          "x-api-key": settings.apiKey.trim(),
        },
      );

      await assertOk(response);

      if (!response.headers.get("content-type")?.includes("text/event-stream")) {
        const json = (await response.json()) as unknown;
        const text = extractAnthropicResponseText(json);
        onToken(text);
        return text;
      }

      return readSseStream(
        response,
        (parsed) => {
          const delta = parsed.delta as
            | { type?: string; text?: string; thinking?: string }
            | undefined;

          if (parsed.type === "error") {
            const error = parsed.error as { message?: string } | undefined;
            throw new Error(error?.message ?? "Anthropic stream returned an error.");
          }

          return delta?.text ?? "";
        },
        onToken,
      );
    },
  };
}

function createGoogleProvider(settings: ModelSettings): BrowserAiProvider {
  return {
    id: "google",
    label: "Google Gemini",
    async generate({ prompt, model, temperature, onToken }) {
      const modelName = selectedModel(settings, model);
      assertReady(settings, modelName);

      const response = await fetchProvider(
        googleEndpointFromBaseUrl(settings.baseUrl, modelName),
        settings,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          systemInstruction: {
            parts: [
              {
                text: "You are running inside FlowForge AI. Return useful, concise workflow output.",
              },
            ],
          },
          generationConfig: {
            temperature,
          },
        },
        {
          "x-goog-api-key": settings.apiKey.trim(),
        },
      );

      await assertOk(response);

      if (!response.headers.get("content-type")?.includes("text/event-stream")) {
        const json = (await response.json()) as unknown;
        const text = extractGoogleResponseText(json);
        onToken(text);
        return text;
      }

      return readSseStream(
        response,
        (parsed) => extractGoogleResponseText(parsed),
        onToken,
      );
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

  if (settings.provider === "anthropic") {
    return createAnthropicProvider(settings);
  }

  if (settings.provider === "google") {
    return createGoogleProvider(settings);
  }

  return createOpenAiCompatibleProvider(settings);
}
