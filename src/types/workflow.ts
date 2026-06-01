import type { Edge, Node } from "@xyflow/react";

export type NodeKind =
  | "input"
  | "prompt"
  | "llm"
  | "output"
  | "condition"
  | "jsonParser"
  | "httpRequest";

export type NodeStatus = "idle" | "running" | "success" | "error";

export type WorkflowConfig = Record<string, string | number | boolean>;

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeKind;
  config: WorkflowConfig;
  status: NodeStatus;
  result?: unknown;
  error?: string;
  elapsedMs?: number;
}

export type FlowNode = Node<WorkflowNodeData>;
export type FlowEdge = Edge;

export interface WorkflowSnapshot {
  id: string;
  name: string;
  updatedAt: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

export interface NodeDefinition {
  type: NodeKind;
  label: string;
  description: string;
  accent: string;
  icon: string;
  defaultConfig: WorkflowConfig;
}

export interface ExecutionCallbacks {
  onStatus: (
    nodeId: string,
    status: NodeStatus,
    patch?: Partial<WorkflowNodeData>,
  ) => void;
  onLog: (log: Omit<ExecutionLog, "id" | "timestamp">) => void;
}

export type NodeOutput = Record<string, unknown> & {
  __branch?: "true" | "false";
};
