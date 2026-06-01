import { ChevronDown, Eraser } from "lucide-react";
import { useWorkflowStore } from "../store/workflowStore";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";

const logTone = {
  info: "text-zinc-500",
  success: "text-emerald-600",
  warning: "text-amber-600",
  error: "text-rose-600",
};

export function BottomPanel() {
  const logs = useWorkflowStore((state) => state.logs);
  const isOpen = useWorkflowStore((state) => state.isBottomPanelOpen);
  const setOpen = useWorkflowStore((state) => state.setBottomPanelOpen);
  const clearLogs = useWorkflowStore((state) => state.clearLogs);

  return (
    <section
      className={cn(
        "shrink-0 border-t border-zinc-200 bg-white transition-all",
        isOpen ? "h-44" : "h-11",
      )}
    >
      <div className="flex h-11 items-center justify-between gap-3 px-4">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-semibold text-zinc-950"
          onClick={() => setOpen(!isOpen)}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition", !isOpen && "-rotate-90")}
          />
          Execution Logs
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
            {logs.length}
          </span>
        </button>
        <Button type="button" size="sm" variant="ghost" onClick={clearLogs}>
          <Eraser className="h-4 w-4" />
          Clear
        </Button>
      </div>
      {isOpen ? (
        <div className="h-[calc(100%-44px)] overflow-y-auto border-t border-zinc-100 px-4 py-2 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="py-6 text-center font-sans text-sm text-zinc-500">
              Run a workflow to stream execution events here.
            </p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-3 py-1.5">
                <span className="w-20 shrink-0 text-zinc-400">{log.timestamp}</span>
                <span className={cn("w-16 shrink-0 uppercase", logTone[log.level])}>
                  {log.level}
                </span>
                <span className="min-w-0 flex-1 text-zinc-700">{log.message}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
