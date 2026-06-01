import {
  Download,
  FolderOpen,
  Github,
  Import,
  KeyRound,
  MessageCircle,
  Network,
  Play,
  Save,
  Share2,
  X,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { encodeWorkflow, safeJsonParse } from "../lib/utils";
import {
  clearModelSettings,
  defaultModelSettings,
  loadModelSettings,
  modelPresets,
  providerDefaults,
  providerLabels,
  saveModelSettings,
  type ModelProvider,
  type ModelSettings,
} from "../providers/modelSettings";
import { useWorkflowStore } from "../store/workflowStore";
import type { ViewMode, WorkflowSnapshot } from "../types/workflow";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Field, Input, Select, Textarea } from "./ui/Field";

interface TopBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function TopBar({ viewMode, onViewModeChange }: TopBarProps) {
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
  const [modelOpen, setModelOpen] = useState(false);
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
        <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-zinc-50 p-1">
          <button
            type="button"
            className={`inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-semibold transition ${
              viewMode === "flow"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-950"
            }`}
            onClick={() => onViewModeChange("flow")}
          >
            <Network className="h-3.5 w-3.5" />
            Flow
          </button>
          <button
            type="button"
            className={`inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-semibold transition ${
              viewMode === "chat"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-950"
            }`}
            onClick={() => onViewModeChange("chat")}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Chat
          </button>
        </div>
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
          onClick={() => setModelOpen(true)}
          title="Configure model token"
        >
          <KeyRound className="h-4 w-4" />
          Models
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
            const params = new URLSearchParams();
            params.set("workflow", encodeWorkflow(snapshot));
            params.set("view", viewMode);
            url.hash = params.toString();
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

      {modelOpen ? <ModelSettingsDialog onClose={() => setModelOpen(false)} /> : null}

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

function ModelSettingsDialog({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<ModelSettings>(() => loadModelSettings());
  const [status, setStatus] = useState<"idle" | "saved" | "cleared">("idle");
  const selectedPresets = modelPresets[settings.provider];

  const update = (patch: Partial<ModelSettings>) => {
    setStatus("idle");
    setSettings((current) => ({ ...current, ...patch }));
  };

  const updateProvider = (provider: ModelProvider) => {
    setStatus("idle");
    setSettings((current) => ({
      ...current,
      ...providerDefaults[provider],
      provider,
      apiKey: provider === current.provider ? current.apiKey : "",
    }));
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/35 p-6 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start gap-4 border-b border-zinc-200 p-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-teal-600 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
              Model Access
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-950">
              Bring your own API token
            </h2>
            <p className="mt-1 text-sm leading-5 text-zinc-500">
              Tokens are stored only in this browser and are used directly from
              the static app.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 p-5">
          <Field label="Provider">
            <Select
              value={settings.provider}
              onChange={(event) =>
                updateProvider(event.target.value as ModelProvider)
              }
            >
              <option value="openai-compatible">
                {providerLabels["openai-compatible"]}
              </option>
              <option value="anthropic">{providerLabels.anthropic}</option>
              <option value="google">{providerLabels.google}</option>
              <option value="mock">{providerLabels.mock}</option>
            </Select>
          </Field>

          <Field label="API token">
            <Input
              type="password"
              autoComplete="off"
              value={settings.apiKey}
              placeholder={tokenPlaceholder(settings.provider)}
              disabled={settings.provider === "mock"}
              onChange={(event) => update({ apiKey: event.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Base URL">
              <Input
                value={settings.baseUrl}
                disabled={settings.provider === "mock"}
                onChange={(event) => update({ baseUrl: event.target.value })}
              />
            </Field>
            <Field label="Default model">
              <Input
                list="flowforge-model-presets"
                value={settings.defaultModel}
                placeholder={providerDefaults[settings.provider].defaultModel}
                disabled={settings.provider === "mock"}
                onChange={(event) => update({ defaultModel: event.target.value })}
              />
              <datalist id="flowforge-model-presets">
                {selectedPresets.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field label="Custom headers" hint='Optional JSON, for example {"X-Title":"FlowForge AI"}.'>
            <Textarea
              className="min-h-20 font-mono"
              value={settings.customHeaders}
              disabled={settings.provider === "mock"}
              onChange={(event) => update({ customHeaders: event.target.value })}
            />
          </Field>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-800">
            Browser-only tokens are convenient for demos, but they are visible to
            the person using the browser. For production teams, put provider
            calls behind a small backend proxy. Anthropic and Gemini browser
            calls also depend on the provider allowing CORS from GitHub Pages.
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 p-5">
          <div className="text-sm text-zinc-500">
            {status === "saved"
              ? "Model settings saved."
              : status === "cleared"
                ? "Model settings cleared."
                : "LLM nodes can use these saved settings."}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                clearModelSettings();
                setSettings(defaultModelSettings);
                setStatus("cleared");
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                saveModelSettings(settings);
                setStatus("saved");
              }}
            >
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function tokenPlaceholder(provider: ModelProvider) {
  if (provider === "google") {
    return "Google AI Studio API key";
  }

  if (provider === "anthropic") {
    return "Anthropic API key";
  }

  return "sk-...";
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
