import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";
import { defaultConfigFor } from "../data/nodeCatalog";
import { executeWorkflow } from "../engine/executionEngine";
import type {
  ExecutionLog,
  FlowEdge,
  FlowNode,
  NodeKind,
  WorkflowNodeData,
  WorkflowSnapshot,
} from "../types/workflow";
import { formatTime, uid } from "../lib/utils";

const WORKFLOWS_KEY = "flowforge.workflows";
const ACTIVE_KEY = "flowforge.active";

function createNode(type: NodeKind, x: number, y: number): FlowNode {
  const id = uid(type);
  return {
    id,
    type: "workflowNode",
    position: { x, y },
    data: {
      label: labelForType(type),
      nodeType: type,
      config: defaultConfigFor(type),
      status: "idle",
    },
  };
}

function labelForType(type: NodeKind) {
  const labels: Record<NodeKind, string> = {
    input: "Input",
    prompt: "Prompt",
    llm: "LLM",
    output: "Output",
    condition: "Condition",
    jsonParser: "JSON Parser",
    httpRequest: "HTTP Request",
  };

  return labels[type];
}

function starterWorkflow() {
  const nodes: FlowNode[] = [
    createNode("input", 80, 110),
    createNode("prompt", 370, 110),
    createNode("llm", 660, 110),
    createNode("output", 950, 110),
  ];

  const edges: FlowEdge[] = [
    {
      id: uid("edge"),
      source: nodes[0].id,
      target: nodes[1].id,
      sourceHandle: "out",
      targetHandle: "in",
      type: "smoothstep",
      animated: false,
    },
    {
      id: uid("edge"),
      source: nodes[1].id,
      target: nodes[2].id,
      sourceHandle: "out",
      targetHandle: "in",
      type: "smoothstep",
      animated: false,
    },
    {
      id: uid("edge"),
      source: nodes[2].id,
      target: nodes[3].id,
      sourceHandle: "out",
      targetHandle: "in",
      type: "smoothstep",
      animated: false,
    },
  ];

  return { nodes, edges };
}

function safeLoad<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function persistActive(nodes: FlowNode[], edges: FlowEdge[], workflowName: string) {
  localStorage.setItem(
    ACTIVE_KEY,
    JSON.stringify({
      id: "active",
      name: workflowName,
      updatedAt: new Date().toISOString(),
      nodes,
      edges,
    }),
  );
}

function loadInitialState() {
  const starter = starterWorkflow();
  const active = safeLoad<WorkflowSnapshot | null>(ACTIVE_KEY, null);

  return {
    nodes: active?.nodes?.length ? active.nodes : starter.nodes,
    edges: active?.edges?.length ? active.edges : starter.edges,
    workflowName: active?.name || "Customer Insight Flow",
  };
}

interface WorkflowStore {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  logs: ExecutionLog[];
  workflows: WorkflowSnapshot[];
  workflowName: string;
  isRunning: boolean;
  isBottomPanelOpen: boolean;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeKind, position: { x: number; y: number }) => void;
  selectNode: (nodeId: string | null) => void;
  updateSelectedNode: (patch: Partial<WorkflowNodeData>) => void;
  updateNodeData: (nodeId: string, patch: Partial<WorkflowNodeData>) => void;
  setWorkflow: (nodes: FlowNode[], edges: FlowEdge[], name?: string) => void;
  saveWorkflow: (name?: string) => void;
  loadWorkflow: (id: string) => void;
  deleteWorkflow: (id: string) => void;
  renameWorkflow: (id: string, name: string) => void;
  refreshWorkflows: () => void;
  runWorkflow: () => Promise<void>;
  clearLogs: () => void;
  setBottomPanelOpen: (isOpen: boolean) => void;
}

const initial = loadInitialState();

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,
  selectedNodeId: null,
  logs: [],
  workflows: safeLoad<WorkflowSnapshot[]>(WORKFLOWS_KEY, []),
  workflowName: initial.workflowName,
  isRunning: false,
  isBottomPanelOpen: true,

  onNodesChange: (changes) =>
    set((state) => {
      const nodes = applyNodeChanges(changes, state.nodes) as FlowNode[];
      persistActive(nodes, state.edges, state.workflowName);
      return { nodes };
    }),

  onEdgesChange: (changes) =>
    set((state) => {
      const edges = applyEdgeChanges(changes, state.edges);
      persistActive(state.nodes, edges, state.workflowName);
      return { edges };
    }),

  onConnect: (connection) =>
    set((state) => {
      const edges = addEdge(
        {
          ...connection,
          id: uid("edge"),
          type: "smoothstep",
          animated: false,
        },
        state.edges,
      );
      persistActive(state.nodes, edges, state.workflowName);
      return { edges };
    }),

  addNode: (type, position) =>
    set((state) => {
      const nodes = [...state.nodes, createNode(type, position.x, position.y)];
      persistActive(nodes, state.edges, state.workflowName);
      return { nodes };
    }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  updateSelectedNode: (patch) => {
    const selectedNodeId = get().selectedNodeId;
    if (!selectedNodeId) {
      return;
    }

    get().updateNodeData(selectedNodeId, patch);
  },

  updateNodeData: (nodeId, patch) =>
    set((state) => {
      const nodes = state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...patch,
                config: patch.config
                  ? {
                      ...node.data.config,
                      ...patch.config,
                    }
                  : node.data.config,
              },
            }
          : node,
      );
      persistActive(nodes, state.edges, state.workflowName);
      return { nodes };
    }),

  setWorkflow: (nodes, edges, name = get().workflowName) => {
    const normalizedNodes: FlowNode[] = nodes.map((node) => ({
      ...node,
      type: "workflowNode",
      data: {
        ...node.data,
        status: "idle" as const,
        result: undefined,
        error: undefined,
      },
    }));
    persistActive(normalizedNodes, edges, name);
    set({
      nodes: normalizedNodes,
      edges,
      workflowName: name,
      selectedNodeId: null,
    });
  },

  saveWorkflow: (name) =>
    set((state) => {
      const workflowName = name?.trim() || state.workflowName || "Untitled Flow";
      const snapshot: WorkflowSnapshot = {
        id: uid("workflow"),
        name: workflowName,
        updatedAt: new Date().toISOString(),
        nodes: state.nodes,
        edges: state.edges,
      };
      const workflows = [
        snapshot,
        ...state.workflows.filter((workflow) => workflow.name !== workflowName),
      ].slice(0, 12);
      localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));
      persistActive(state.nodes, state.edges, workflowName);
      return { workflows, workflowName };
    }),

  loadWorkflow: (id) => {
    const workflow = get().workflows.find((item) => item.id === id);
    if (!workflow) {
      return;
    }

    get().setWorkflow(workflow.nodes, workflow.edges, workflow.name);
  },

  deleteWorkflow: (id) =>
    set((state) => {
      const workflows = state.workflows.filter((workflow) => workflow.id !== id);
      localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));
      return { workflows };
    }),

  renameWorkflow: (id, name) =>
    set((state) => {
      const workflows = state.workflows.map((workflow) =>
        workflow.id === id
          ? { ...workflow, name, updatedAt: new Date().toISOString() }
          : workflow,
      );
      localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));
      return { workflows };
    }),

  refreshWorkflows: () =>
    set({ workflows: safeLoad<WorkflowSnapshot[]>(WORKFLOWS_KEY, []) }),

  runWorkflow: async () => {
    const state = get();
    if (state.isRunning) {
      return;
    }

    set({
      isRunning: true,
      isBottomPanelOpen: true,
      logs: [
        {
          id: uid("log"),
          timestamp: formatTime(),
          level: "info",
          message: "Workflow run started.",
        },
      ],
      nodes: state.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: "idle",
          result: undefined,
          error: undefined,
          elapsedMs: undefined,
        },
      })),
      edges: state.edges.map((edge) => ({ ...edge, animated: false })),
    });

    try {
      await executeWorkflow(get().nodes, get().edges, {
        onStatus: (nodeId, status, patch) => {
          set((current) => ({
            nodes: current.nodes.map((node) =>
              node.id === nodeId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      ...patch,
                      status,
                    },
                  }
                : node,
            ),
            edges: current.edges.map((edge) =>
              edge.source === nodeId || edge.target === nodeId
                ? { ...edge, animated: status === "running" }
                : edge,
            ),
          }));
        },
        onLog: (log) => {
          set((current) => ({
            logs: [
              ...current.logs,
              {
                ...log,
                id: uid("log"),
                timestamp: formatTime(),
              },
            ],
          }));
        },
      });

      set((current) => ({
        logs: [
          ...current.logs,
          {
            id: uid("log"),
            timestamp: formatTime(),
            level: "success",
            message: "Workflow run finished.",
          },
        ],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Run failed.";
      set((current) => ({
        logs: [
          ...current.logs,
          {
            id: uid("log"),
            timestamp: formatTime(),
            level: "error",
            message,
          },
        ],
      }));
    } finally {
      set((current) => ({
        isRunning: false,
        edges: current.edges.map((edge) => ({ ...edge, animated: false })),
      }));
    }
  },

  clearLogs: () => set({ logs: [] }),
  setBottomPanelOpen: (isBottomPanelOpen) => set({ isBottomPanelOpen }),
}));

export { createNode };
