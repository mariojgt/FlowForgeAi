import type {
  ExecutionCallbacks,
  FlowEdge,
  FlowNode,
  NodeOutput,
  WorkflowNodeData,
} from "../types/workflow";
import { getAiProvider } from "../providers/aiProvider";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function stringifyValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function pickInput(inputs: NodeOutput[]) {
  const merged = Object.assign({}, ...inputs);
  const direct =
    merged.input ??
    merged.text ??
    merged.prompt ??
    merged.response ??
    merged.message ??
    merged.data ??
    merged;

  return {
    merged,
    text: stringifyValue(direct),
  };
}

function topologicalSort(nodes: FlowNode[], edges: FlowEdge[]) {
  const ids = new Set(nodes.map((node) => node.id));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      return;
    }

    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  });

  const queue = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  const ordered: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) {
      continue;
    }

    ordered.push(id);
    for (const target of outgoing.get(id) ?? []) {
      const next = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, next);
      if (next === 0) {
        queue.push(target);
      }
    }
  }

  if (ordered.length !== nodes.length) {
    throw new Error("Cycle detected. Remove the loop before running this workflow.");
  }

  return ordered;
}

function evaluateCondition(condition: string, text: string) {
  const contains = condition.match(/^contains\(["'](.+)["']\)$/i);
  if (contains) {
    return text.toLowerCase().includes(contains[1].toLowerCase());
  }

  const equals = condition.match(/^equals\(["'](.+)["']\)$/i);
  if (equals) {
    return text.trim() === equals[1];
  }

  const startsWith = condition.match(/^startsWith\(["'](.+)["']\)$/i);
  if (startsWith) {
    return text.startsWith(startsWith[1]);
  }

  if (condition.trim().toLowerCase() === "truthy") {
    return Boolean(text.trim());
  }

  return text.toLowerCase().includes(condition.toLowerCase());
}

function selectPath(value: unknown, path: string) {
  if (!path.trim()) {
    return value;
  }

  return path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<unknown>((current, part) => {
      if (current && typeof current === "object" && part in current) {
        return (current as Record<string, unknown>)[part];
      }

      throw new Error(`Path "${path}" was not found in parsed JSON.`);
    }, value);
}

async function runNode(
  node: FlowNode,
  inputs: NodeOutput[],
  callbacks: ExecutionCallbacks,
) {
  const { config, nodeType } = node.data;
  const startedAt = performance.now();
  const input = pickInput(inputs);

  callbacks.onStatus(node.id, "running", {
    result: undefined,
    error: undefined,
    elapsedMs: undefined,
  });

  await wait(180);

  let output: NodeOutput;

  switch (nodeType) {
    case "input": {
      output = { text: String(config.value ?? "") };
      break;
    }

    case "prompt": {
      const template = String(config.template ?? "{{input}}");
      output = {
        prompt: template.split("{{input}}").join(input.text),
      };
      break;
    }

    case "llm": {
      const provider = getAiProvider();
      const model = String(config.model ?? "mock-fast");
      const temperature = Number(config.temperature ?? 0.4);
      let streamed = "";

      callbacks.onLog({
        level: "info",
        message: `${node.data.label} is streaming from ${provider.label}.`,
      });

      streamed = await provider.generate({
        prompt: input.merged.prompt ? String(input.merged.prompt) : input.text,
        model,
        temperature,
        onToken: (text) => {
          callbacks.onStatus(node.id, "running", {
            result: { response: text },
          });
        },
      });

      output = { response: streamed };
      break;
    }

    case "output": {
      output = {
        response:
          input.merged.response ??
          input.merged.prompt ??
          input.merged.text ??
          input.text,
      };
      break;
    }

    case "condition": {
      const condition = String(config.condition ?? "truthy");
      const passed = evaluateCondition(condition, input.text);
      output = {
        ...input.merged,
        condition: passed,
        __branch: passed ? "true" : "false",
      };
      break;
    }

    case "jsonParser": {
      const parsed = JSON.parse(input.text);
      output = {
        data: selectPath(parsed, String(config.path ?? "")),
      };
      break;
    }

    case "httpRequest": {
      const method = String(config.method ?? "GET").toUpperCase();
      const url = String(config.url ?? "");
      const body = String(config.body ?? "");
      const response = await fetch(url, {
        method,
        headers:
          method === "GET"
            ? undefined
            : {
                "Content-Type": "application/json",
              },
        body: method === "GET" || !body ? undefined : body,
      });
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
      output = {
        status: response.status,
        data,
        text: stringifyValue(data),
      };
      break;
    }

    default:
      output = input.merged;
  }

  const elapsedMs = Math.round(performance.now() - startedAt);
  callbacks.onStatus(node.id, "success", {
    result: output,
    elapsedMs,
  });
  callbacks.onLog({
    level: "success",
    message: `${node.data.label} completed in ${elapsedMs}ms.`,
  });

  return output;
}

export async function executeWorkflow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  callbacks: ExecutionCallbacks,
) {
  if (nodes.length === 0) {
    callbacks.onLog({ level: "warning", message: "Add nodes before running." });
    return;
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const outputs = new Map<string, NodeOutput>();
  const order = topologicalSort(nodes, edges);

  callbacks.onLog({
    level: "info",
    message: `Execution queued ${order.length} node${order.length === 1 ? "" : "s"}.`,
  });

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) {
      continue;
    }

    const incomingEdges = edges.filter((edge) => edge.target === nodeId);
    const inbound = incomingEdges
      .map((edge) => {
        const sourceOutput = outputs.get(edge.source);
        if (!sourceOutput) {
          return null;
        }

        if (
          sourceOutput.__branch &&
          edge.sourceHandle &&
          edge.sourceHandle !== sourceOutput.__branch
        ) {
          return null;
        }

        return sourceOutput;
      })
      .filter(Boolean) as NodeOutput[];

    if (incomingEdges.length > 0 && inbound.length === 0) {
      callbacks.onLog({
        level: "warning",
        message: `${node.data.label} waited because no active branch reached it.`,
      });
      callbacks.onStatus(node.id, "idle", {
        result: undefined,
        error: undefined,
      });
      continue;
    }

    try {
      const output = await runNode(node, inbound, callbacks);
      outputs.set(nodeId, output);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown execution error.";
      callbacks.onStatus(node.id, "error", {
        error: message,
        result: undefined,
      } satisfies Partial<WorkflowNodeData>);
      callbacks.onLog({
        level: "error",
        message: `${node.data.label} failed: ${message}`,
      });
      break;
    }
  }
}
