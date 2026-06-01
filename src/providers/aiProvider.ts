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
    const response = buildMockResponse(prompt, model, temperature);
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

export function getAiProvider() {
  return mockAiProvider;
}
