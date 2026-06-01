import { WandSparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Field";
import { createNode, useWorkflowStore } from "../store/workflowStore";
import { uid } from "../lib/utils";
import type { FlowEdge, FlowNode } from "../types/workflow";

function edge(source: FlowNode, target: FlowNode, sourceHandle = "out"): FlowEdge {
  return {
    id: uid("edge"),
    source: source.id,
    target: target.id,
    sourceHandle,
    targetHandle: "in",
    type: "smoothstep",
  };
}

function generateTemplate(prompt: string) {
  const lower = prompt.toLowerCase();
  const wantsHttp =
    lower.includes("hacker news") ||
    lower.includes("api") ||
    lower.includes("fetch") ||
    lower.includes("url");
  const wantsJson = lower.includes("json") || wantsHttp;
  const wantsBranch =
    lower.includes("if") ||
    lower.includes("condition") ||
    lower.includes("error") ||
    lower.includes("branch");

  if (wantsHttp) {
    const http = createNode("httpRequest", 80, 120);
    const parser = createNode("jsonParser", 365, 120);
    const promptNode = createNode("prompt", 650, 120);
    const llm = createNode("llm", 935, 120);
    const output = createNode("output", 1220, 120);

    http.data.config = {
      ...http.data.config,
      url: lower.includes("hacker news")
        ? "https://hn.algolia.com/api/v1/search?query=ai"
        : String(http.data.config.url),
    };
    parser.data.config = { ...parser.data.config, path: "hits" };
    promptNode.data.config = {
      ...promptNode.data.config,
      template:
        "Summarize the most important items from this API payload. Include titles, URLs when available, and a concise recommendation:\n\n{{input}}",
    };

    return {
      name: lower.includes("hacker news")
        ? "Hacker News Summary Flow"
        : "API Summary Flow",
      nodes: [http, parser, promptNode, llm, output],
      edges: [
        edge(http, parser),
        edge(parser, promptNode),
        edge(promptNode, llm),
        edge(llm, output),
      ],
    };
  }

  if (wantsBranch) {
    const input = createNode("input", 80, 110);
    const condition = createNode("condition", 365, 110);
    const promptNode = createNode("prompt", 650, 30);
    const output = createNode("output", 650, 210);
    const llm = createNode("llm", 935, 30);
    const finalOutput = createNode("output", 1220, 30);

    condition.data.config = {
      ...condition.data.config,
      condition: 'contains("error")',
    };
    promptNode.data.config = {
      ...promptNode.data.config,
      template:
        "The input appears to contain an error. Diagnose it and suggest a fix:\n\n{{input}}",
    };
    output.data.label = "Clean Path Output";

    return {
      name: "Conditional Triage Flow",
      nodes: [input, condition, promptNode, output, llm, finalOutput],
      edges: [
        edge(input, condition),
        edge(condition, promptNode, "true"),
        edge(condition, output, "false"),
        edge(promptNode, llm),
        edge(llm, finalOutput),
      ],
    };
  }

  if (wantsJson) {
    const input = createNode("input", 80, 110);
    const parser = createNode("jsonParser", 365, 110);
    const output = createNode("output", 650, 110);
    input.data.config = {
      value: '{ "message": "hello", "priority": "normal" }',
    };
    return {
      name: "JSON Parsing Flow",
      nodes: [input, parser, output],
      edges: [edge(input, parser), edge(parser, output)],
    };
  }

  const input = createNode("input", 80, 110);
  const promptNode = createNode("prompt", 365, 110);
  const llm = createNode("llm", 650, 110);
  const output = createNode("output", 935, 110);

  promptNode.data.config = {
    ...promptNode.data.config,
    template: lower.includes("summar")
      ? "Summarize this clearly and list the next action:\n\n{{input}}"
      : "Transform the following input into a useful AI-ready response:\n\n{{input}}",
  };

  return {
    name: lower.includes("summar") ? "Summarizer Flow" : "Generated AI Flow",
    nodes: [input, promptNode, llm, output],
    edges: [edge(input, promptNode), edge(promptNode, llm), edge(llm, output)],
  };
}

export function WorkflowGenerator() {
  const [prompt, setPrompt] = useState("Build a workflow that summarizes Hacker News");
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);

  return (
    <div className="border-t border-zinc-200 p-4">
      <div className="mb-2 flex items-center gap-2">
        <WandSparkles className="h-4 w-4 text-teal-600" />
        <h2 className="text-sm font-semibold text-zinc-950">Workflow Generator</h2>
      </div>
      <Textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="min-h-24"
        placeholder="Describe the workflow you want"
      />
      <Button
        type="button"
        variant="primary"
        className="mt-3 w-full"
        onClick={() => {
          const generated = generateTemplate(prompt);
          setWorkflow(generated.nodes, generated.edges, generated.name);
        }}
      >
        <WandSparkles className="h-4 w-4" />
        Generate Flow
      </Button>
    </div>
  );
}
