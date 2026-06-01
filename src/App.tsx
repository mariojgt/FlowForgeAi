import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect } from "react";
import { BottomPanel } from "./components/BottomPanel";
import { NodeLibrary } from "./components/NodeLibrary";
import { SettingsPanel } from "./components/SettingsPanel";
import { TopBar } from "./components/TopBar";
import { WorkflowNode } from "./components/WorkflowNode";
import { isNodeKind } from "./data/nodeCatalog";
import { decodeWorkflow, safeJsonParse } from "./lib/utils";
import { useWorkflowStore } from "./store/workflowStore";
import type { FlowEdge, FlowNode } from "./types/workflow";

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode,
};

function FlowCanvas() {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const addNode = useWorkflowStore((state) => state.addNode);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const importText = useCallback(
    (text: string, name = "Imported Workflow") => {
      const parsed = safeJsonParse<{ nodes: FlowNode[]; edges: FlowEdge[] }>(text);
      if (parsed?.nodes && parsed?.edges) {
        setWorkflow(parsed.nodes, parsed.edges, name);
        window.setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 60);
      }
    },
    [fitView, setWorkflow],
  );

  useEffect(() => {
    const hash = window.location.hash.replace(/^#workflow=/, "");
    if (!hash) {
      return;
    }

    const decoded = decodeWorkflow<{ nodes: FlowNode[]; edges: FlowEdge[] }>(hash);
    if (decoded?.nodes && decoded?.edges) {
      setWorkflow(decoded.nodes, decoded.edges, "Shared Workflow");
      window.setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 80);
    }
  }, [fitView, setWorkflow]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, node) => selectNode(node.id)}
      onPaneClick={() => selectNode(null)}
      fitView
      minZoom={0.2}
      maxZoom={1.8}
      defaultEdgeOptions={{
        type: "smoothstep",
        className: "flowforge-edge",
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={async (event) => {
        event.preventDefault();

        const file = event.dataTransfer.files?.[0];
        if (file && file.name.endsWith(".json")) {
          importText(await file.text(), file.name.replace(/\.json$/i, ""));
          return;
        }

        const type = event.dataTransfer.getData("application/flowforge-node");
        if (!isNodeKind(type)) {
          return;
        }

        addNode(
          type,
          screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          }),
        );
      }}
    >
      <Background
        color="#d4d4d8"
        gap={22}
        size={1}
        variant={BackgroundVariant.Dots}
      />
      <MiniMap
        pannable
        zoomable
        nodeStrokeWidth={3}
        className="!rounded-lg !border !border-zinc-200 !bg-white"
      />
      <Controls className="!rounded-lg !border !border-zinc-200 !bg-white" />
    </ReactFlow>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <div className="flex h-screen min-h-[720px] flex-col bg-zinc-100 text-zinc-950">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <NodeLibrary />
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1 bg-[#f6f7f9]">
              <FlowCanvas />
              <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 text-xs text-zinc-600 shadow-sm backdrop-blur">
                Drop nodes or JSON workflows onto the canvas
              </div>
            </div>
            <BottomPanel />
          </main>
          <SettingsPanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
