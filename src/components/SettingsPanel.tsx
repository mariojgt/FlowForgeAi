import {
  ClipboardCopy,
  PanelRightClose,
  Save,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useWorkflowStore } from "../store/workflowStore";
import type { WorkflowConfig } from "../types/workflow";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Field, Input, Select, Textarea } from "./ui/Field";

export function SettingsPanel() {
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const nodes = useWorkflowStore((state) => state.nodes);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const updateSelectedNode = useWorkflowStore((state) => state.updateSelectedNode);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const [copied, setCopied] = useState(false);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  if (!selectedNode) {
    return (
      <aside className="flex h-full w-80 shrink-0 flex-col border-l border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
            Inspector
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">
            Select a node
          </h2>
        </div>
        <div className="grid flex-1 place-items-center p-6 text-center text-sm text-zinc-500">
          Click any canvas node to edit labels, configuration, and view its last
          execution result.
        </div>
      </aside>
    );
  }

  const config = selectedNode.data.config;

  const updateConfig = (patch: WorkflowConfig) => {
    updateSelectedNode({
      config: patch,
    });
  };

  const resultText = selectedNode.data.result
    ? stringifyResult(selectedNode.data.result)
    : "";

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="flex items-start gap-3 border-b border-zinc-200 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
            Inspector
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-zinc-950">
            {selectedNode.data.label}
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Close inspector"
          onClick={() => selectNode(null)}
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="flex items-center gap-2">
          <Badge
            tone={
              selectedNode.data.status === "error"
                ? "rose"
                : selectedNode.data.status === "success"
                  ? "green"
                  : selectedNode.data.status === "running"
                    ? "teal"
                    : "neutral"
            }
          >
            {selectedNode.data.status}
          </Badge>
          <span className="truncate font-mono text-xs text-zinc-400">
            {selectedNode.id}
          </span>
        </div>

        <Field label="Label">
          <Input
            value={selectedNode.data.label}
            onChange={(event) =>
              updateSelectedNode({ label: event.target.value })
            }
          />
        </Field>

        <NodeConfigFields
          nodeType={selectedNode.data.nodeType}
          config={config}
          updateConfig={updateConfig}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-950">Last result</h3>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!resultText}
              onClick={async () => {
                await navigator.clipboard.writeText(resultText);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              }}
            >
              <ClipboardCopy className="h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="max-h-80 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            {selectedNode.data.error ? (
              <p className="text-rose-700">{selectedNode.data.error}</p>
            ) : resultText ? (
              <ReactMarkdown className="markdown-result max-w-none">
                {resultText}
              </ReactMarkdown>
            ) : (
              <p className="text-zinc-500">Run the workflow to inspect output.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-zinc-200 p-4">
        <Button
          type="button"
          className="flex-1"
          onClick={() => updateSelectedNode({ status: "idle", result: undefined, error: undefined })}
        >
          <Save className="h-4 w-4" />
          Reset
        </Button>
        <Button
          type="button"
          variant="danger"
          size="icon"
          title="Delete node"
          onClick={() => {
            onNodesChange([{ id: selectedNode.id, type: "remove" }]);
            selectNode(null);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}

function NodeConfigFields({
  nodeType,
  config,
  updateConfig,
}: {
  nodeType: string;
  config: WorkflowConfig;
  updateConfig: (patch: WorkflowConfig) => void;
}) {
  if (nodeType === "input") {
    return (
      <Field label="Value">
        <Textarea
          value={String(config.value ?? "")}
          onChange={(event) => updateConfig({ value: event.target.value })}
        />
      </Field>
    );
  }

  if (nodeType === "prompt") {
    return (
      <Field label="Template" hint="Use {{input}} to insert upstream data.">
        <Textarea
          className="min-h-40 font-mono"
          value={String(config.template ?? "")}
          onChange={(event) => updateConfig({ template: event.target.value })}
        />
      </Field>
    );
  }

  if (nodeType === "llm") {
    return (
      <div className="space-y-4">
        <Field label="Model">
          <Select
            value={String(config.model ?? "mock-fast")}
            onChange={(event) => updateConfig({ model: event.target.value })}
          >
            <option value="mock-fast">mock-fast</option>
            <option value="mock-balanced">mock-balanced</option>
            <option value="mock-creative">mock-creative</option>
          </Select>
        </Field>
        <Field label={`Temperature: ${Number(config.temperature ?? 0.4).toFixed(1)}`}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={Number(config.temperature ?? 0.4)}
            onChange={(event) =>
              updateConfig({ temperature: Number(event.target.value) })
            }
            className="w-full accent-teal-600"
          />
        </Field>
      </div>
    );
  }

  if (nodeType === "condition") {
    return (
      <Field
        label="Condition"
        hint='Supports contains("text"), equals("text"), startsWith("text"), truthy.'
      >
        <Input
          value={String(config.condition ?? "")}
          onChange={(event) => updateConfig({ condition: event.target.value })}
        />
      </Field>
    );
  }

  if (nodeType === "jsonParser") {
    return (
      <Field label="Path" hint="Optional dot path, for example data.items.">
        <Input
          value={String(config.path ?? "")}
          onChange={(event) => updateConfig({ path: event.target.value })}
        />
      </Field>
    );
  }

  if (nodeType === "httpRequest") {
    return (
      <div className="space-y-4">
        <Field label="Method">
          <Select
            value={String(config.method ?? "GET")}
            onChange={(event) => updateConfig({ method: event.target.value })}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </Select>
        </Field>
        <Field label="URL">
          <Input
            value={String(config.url ?? "")}
            onChange={(event) => updateConfig({ url: event.target.value })}
          />
        </Field>
        <Field label="Body">
          <Textarea
            value={String(config.body ?? "")}
            onChange={(event) => updateConfig({ body: event.target.value })}
          />
        </Field>
      </div>
    );
  }

  return null;
}

function stringifyResult(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "response" in value &&
    typeof (value as { response?: unknown }).response === "string"
  ) {
    return (value as { response: string }).response;
  }

  return JSON.stringify(value, null, 2);
}
