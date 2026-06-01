import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { getNodeDefinition } from "../data/nodeCatalog";
import { cn } from "../lib/utils";
import type { WorkflowNodeData } from "../types/workflow";
import { CatalogIcon } from "./icons";

const statusStyles = {
  idle: "border-zinc-200 bg-white",
  running: "border-teal-400 bg-teal-50 shadow-glow",
  success: "border-emerald-300 bg-emerald-50",
  error: "border-rose-300 bg-rose-50",
};

const statusIcons = {
  idle: Clock3,
  running: Loader2,
  success: CheckCircle2,
  error: AlertTriangle,
};

export function WorkflowNode({ data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const definition = getNodeDefinition(nodeData.nodeType);
  const StatusIcon = statusIcons[nodeData.status];
  const hasInput = nodeData.nodeType !== "input";
  const hasOutput = nodeData.nodeType !== "output";
  const isCondition = nodeData.nodeType === "condition";

  return (
    <div
      className={cn(
        "group relative min-w-[224px] overflow-hidden rounded-lg border text-left shadow-sm transition",
        statusStyles[nodeData.status],
        selected && "ring-2 ring-zinc-950 ring-offset-2",
      )}
    >
      {hasInput ? (
        <Handle
          id="in"
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-white !bg-zinc-500"
        />
      ) : null}

      <div className="flex items-center gap-3 border-b border-zinc-100 px-3 py-2.5">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-md text-white",
            definition.accent,
          )}
        >
          <CatalogIcon name={definition.icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-950">
            {nodeData.label}
          </div>
          <div className="truncate text-xs text-zinc-500">
            {definition.description}
          </div>
        </div>
        <StatusIcon
          className={cn(
            "h-4 w-4 text-zinc-400",
            nodeData.status === "running" && "animate-spin text-teal-600",
            nodeData.status === "success" && "text-emerald-600",
            nodeData.status === "error" && "text-rose-600",
          )}
        />
      </div>

      <div className="grid gap-2 px-3 py-3 text-xs text-zinc-600">
        {nodeData.status === "error" ? (
          <p className="line-clamp-3 text-rose-700">{nodeData.error}</p>
        ) : nodeData.result ? (
          <pre className="max-h-20 overflow-hidden whitespace-pre-wrap rounded-md bg-white/70 p-2 font-mono text-[11px] leading-4 text-zinc-700">
            {JSON.stringify(nodeData.result, null, 2)}
          </pre>
        ) : (
          <p className="line-clamp-2">{previewConfig(nodeData)}</p>
        )}
        {nodeData.elapsedMs ? (
          <span className="text-[11px] font-medium text-zinc-500">
            {nodeData.elapsedMs}ms
          </span>
        ) : null}
      </div>

      {isCondition ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            className="!top-[42%] !h-3 !w-3 !border-2 !border-white !bg-emerald-500"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            className="!top-[68%] !h-3 !w-3 !border-2 !border-white !bg-rose-500"
          />
          <span className="absolute right-3 top-[37%] rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
            T
          </span>
          <span className="absolute right-3 top-[63%] rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
            F
          </span>
        </>
      ) : hasOutput ? (
        <Handle
          id="out"
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-white !bg-zinc-700"
        />
      ) : null}
    </div>
  );
}

function previewConfig(data: WorkflowNodeData) {
  if (data.nodeType === "input") {
    return String(data.config.value ?? "No input configured.");
  }

  if (data.nodeType === "prompt") {
    return String(data.config.template ?? "No prompt template.");
  }

  if (data.nodeType === "llm") {
    const provider =
      data.config.provider === "mock" ? "Mock provider" : "Saved provider";
    const model = data.config.model ? String(data.config.model) : "default model";
    return `${provider} · ${model} at ${data.config.temperature ?? 0.4}`;
  }

  if (data.nodeType === "httpRequest") {
    return `${data.config.method ?? "GET"} ${data.config.url ?? ""}`;
  }

  if (data.nodeType === "condition") {
    return String(data.config.condition ?? "truthy");
  }

  return "Waiting for upstream data.";
}
