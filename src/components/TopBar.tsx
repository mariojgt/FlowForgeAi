import {
  Download,
  FolderOpen,
  Github,
  Import,
  Play,
  Save,
  Share2,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { encodeWorkflow, safeJsonParse } from "../lib/utils";
import { useWorkflowStore } from "../store/workflowStore";
import type { WorkflowSnapshot } from "../types/workflow";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Input } from "./ui/Field";

export function TopBar() {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const workflows = useWorkflowStore((state) => state.workflows);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);
  const saveWorkflow = useWorkflowStore((state) => state.saveWorkflow);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const deleteWorkflow = useWorkflowStore((state) => state.deleteWorkflow);
  const renameWorkflow = useWorkflowStore((state) => state.renameWorkflow);
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);
  const [nameDraft, setNameDraft] = useState(workflowName);
  const [loadOpen, setLoadOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const snapshot = {
    nodes,
    edges,
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-950 text-white">
          <span className="text-sm font-black">FF</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-zinc-950">
              FlowForge AI
            </h1>
            <Badge tone="teal">Static</Badge>
          </div>
          <p className="truncate text-xs text-zinc-500">
            Visual AI workflows for static GitHub Pages deployments
          </p>
        </div>
      </div>

      <div className="hidden min-w-56 max-w-sm flex-1 items-center gap-2 md:flex">
        <Input
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={() => saveWorkflow(nameDraft)}
          aria-label="Workflow name"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={isRunning}
          onClick={runWorkflow}
          title="Run workflow"
        >
          <Play className="h-4 w-4" />
          {isRunning ? "Running" : "Run"}
        </Button>
        <Button
          type="button"
          onClick={() => saveWorkflow(nameDraft)}
          title="Save workflow"
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
        <div className="relative">
          <Button
            type="button"
            onClick={() => setLoadOpen((open) => !open)}
            title="Load workflow"
          >
            <FolderOpen className="h-4 w-4" />
            Load
          </Button>
          {loadOpen ? (
            <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl">
              {workflows.length === 0 ? (
                <p className="p-3 text-sm text-zinc-500">
                  Saved workflows will appear here.
                </p>
              ) : (
                workflows.map((workflow) => (
                  <SavedWorkflowRow
                    key={workflow.id}
                    workflow={workflow}
                    onLoad={() => {
                      loadWorkflow(workflow.id);
                      setNameDraft(workflow.name);
                      setLoadOpen(false);
                    }}
                    onDelete={() => deleteWorkflow(workflow.id)}
                    onRename={(name) => renameWorkflow(workflow.id, name)}
                  />
                ))
              )}
            </div>
          ) : null}
        </div>
        <Button type="button" onClick={() => exportSnapshot(snapshot)}>
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button type="button" onClick={() => fileInputRef.current?.click()}>
          <Import className="h-4 w-4" />
          Import
        </Button>
        <Button
          type="button"
          variant="ghost"
          title="Copy share link"
          onClick={async () => {
            const url = new URL(window.location.href);
            url.hash = `workflow=${encodeWorkflow(snapshot)}`;
            await navigator.clipboard.writeText(url.toString());
            setShareCopied(true);
            window.setTimeout(() => setShareCopied(false), 1400);
          }}
        >
          <Share2 className="h-4 w-4" />
          {shareCopied ? "Copied" : "Share"}
        </Button>
        <a
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
          href="https://github.com/mariojgt/FlowForgeAi"
          target="_blank"
          rel="noreferrer"
          title="Open GitHub repository"
        >
          <Github className="h-4 w-4" />
        </a>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }
          const text = await file.text();
          const imported = safeJsonParse<{ nodes: typeof nodes; edges: typeof edges }>(
            text,
          );
          if (imported?.nodes && imported?.edges) {
            setWorkflow(imported.nodes, imported.edges, file.name.replace(/\.json$/i, ""));
            setNameDraft(file.name.replace(/\.json$/i, ""));
          }
          event.target.value = "";
        }}
      />
    </header>
  );
}

function SavedWorkflowRow({
  workflow,
  onLoad,
  onDelete,
  onRename,
}: {
  workflow: WorkflowSnapshot;
  onLoad: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [name, setName] = useState(workflow.name);

  return (
    <div className="flex items-center gap-2 rounded-md p-2 hover:bg-zinc-50">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onLoad}
      >
        <span className="block truncate text-sm font-semibold text-zinc-950">
          {workflow.name}
        </span>
        <span className="text-xs text-zinc-500">
          {new Date(workflow.updatedAt).toLocaleString()}
        </span>
      </button>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => onRename(name)}
        className="h-8 w-28"
        aria-label="Rename saved workflow"
      />
      <Button
        type="button"
        variant="danger"
        size="icon"
        title="Delete saved workflow"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function exportSnapshot(snapshot: { nodes: unknown; edges: unknown }) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "flowforge-workflow.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
