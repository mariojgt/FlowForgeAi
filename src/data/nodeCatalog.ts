import type { NodeDefinition, NodeKind, WorkflowConfig } from "../types/workflow";

export const nodeCatalog: NodeDefinition[] = [
  {
    type: "input",
    label: "Input",
    description: "Start a workflow with text or JSON.",
    accent: "bg-teal-500",
    icon: "Play",
    defaultConfig: {
      value:
        "Paste customer feedback, a support ticket, or a research note here.",
    },
  },
  {
    type: "prompt",
    label: "Prompt",
    description: "Shape upstream data into a reusable prompt.",
    accent: "bg-indigo-500",
    icon: "Braces",
    defaultConfig: {
      template:
        "Summarize this in three useful bullets and include the likely next action:\n\n{{input}}",
    },
  },
  {
    type: "llm",
    label: "LLM",
    description: "Generate streamed AI output with a pluggable provider.",
    accent: "bg-fuchsia-500",
    icon: "Sparkles",
    defaultConfig: {
      model: "mock-fast",
      temperature: 0.4,
    },
  },
  {
    type: "output",
    label: "Output",
    description: "Render the final result with copy support.",
    accent: "bg-emerald-500",
    icon: "PanelBottom",
    defaultConfig: {
      markdown: true,
    },
  },
  {
    type: "condition",
    label: "Condition",
    description: "Branch execution with a lightweight expression.",
    accent: "bg-amber-500",
    icon: "GitBranch",
    defaultConfig: {
      condition: 'contains("error")',
    },
  },
  {
    type: "jsonParser",
    label: "JSON Parser",
    description: "Parse and validate JSON flowing through the graph.",
    accent: "bg-cyan-500",
    icon: "FileJson",
    defaultConfig: {
      path: "",
    },
  },
  {
    type: "httpRequest",
    label: "HTTP Request",
    description: "Fetch data from public APIs when CORS allows it.",
    accent: "bg-rose-500",
    icon: "Globe2",
    defaultConfig: {
      method: "GET",
      url: "https://hn.algolia.com/api/v1/search?query=ai",
      body: "",
    },
  },
];

export function getNodeDefinition(type: NodeKind) {
  return nodeCatalog.find((node) => node.type === type) ?? nodeCatalog[0];
}

export function defaultConfigFor(type: NodeKind): WorkflowConfig {
  return { ...getNodeDefinition(type).defaultConfig };
}

export function isNodeKind(value: string): value is NodeKind {
  return nodeCatalog.some((node) => node.type === value);
}
