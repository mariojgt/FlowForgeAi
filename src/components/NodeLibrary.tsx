import { GripVertical } from "lucide-react";
import { nodeCatalog } from "../data/nodeCatalog";
import { CatalogIcon } from "./icons";
import { WorkflowGenerator } from "./WorkflowGenerator";

export function NodeLibrary() {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
          Node Library
        </p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-950">
          Build blocks
        </h2>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {nodeCatalog.map((node) => (
          <button
            key={node.type}
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/flowforge-node", node.type);
              event.dataTransfer.effectAllowed = "move";
            }}
            className="group flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-md text-white ${node.accent}`}
            >
              <CatalogIcon name={node.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-zinc-950">
                {node.label}
              </span>
              <span className="line-clamp-2 text-xs leading-4 text-zinc-500">
                {node.description}
              </span>
            </span>
            <GripVertical className="h-4 w-4 text-zinc-300 transition group-hover:text-zinc-500" />
          </button>
        ))}
      </div>

      <WorkflowGenerator />
    </aside>
  );
}
