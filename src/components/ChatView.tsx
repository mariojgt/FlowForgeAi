import { Bot, CornerDownLeft, Eraser, Loader2, Send, User } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { uid } from "../lib/utils";
import { useWorkflowStore } from "../store/workflowStore";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Field";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  state?: "pending" | "error";
}

export function ChatView() {
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const nodes = useWorkflowStore((state) => state.nodes);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const runWorkflowForChat = useWorkflowStore((state) => state.runWorkflowForChat);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid("chat"),
      role: "assistant",
      content:
        "I can run this workflow as a chat. Send a message and I will route it through the flow.",
    },
  ]);

  const workflowSteps = useMemo(
    () =>
      nodes.map((node) => ({
        id: node.id,
        label: node.data.label,
        status: node.data.status,
      })),
    [nodes],
  );

  const submit = async () => {
    const message = input.trim();
    if (!message || isRunning) {
      return;
    }

    const pendingId = uid("chat");
    setInput("");
    setMessages((current) => [
      ...current,
      { id: uid("chat"), role: "user", content: message },
      {
        id: pendingId,
        role: "assistant",
        content: "Running the workflow...",
        state: "pending",
      },
    ]);

    try {
      const response = await runWorkflowForChat(message);
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingId
            ? { ...item, content: response, state: undefined }
            : item,
        ),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "The workflow failed.";
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                content: errorMessage,
                state: "error",
              }
            : item,
        ),
      );
    }
  };

  return (
    <main className="flex min-h-0 flex-1 bg-[#f6f7f9]">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-zinc-200 bg-white px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
            Chat View
          </p>
          <h2 className="mt-1 truncate text-xl font-semibold text-zinc-950">
            {workflowName}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto grid max-w-4xl gap-4">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-200 bg-white p-4">
          <div className="mx-auto flex max-w-4xl gap-3">
            <Textarea
              value={input}
              disabled={isRunning}
              placeholder="Ask this workflow anything..."
              className="min-h-16 flex-1 resize-none"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
            <div className="flex w-28 flex-col gap-2">
              <Button
                type="button"
                variant="primary"
                disabled={isRunning || !input.trim()}
                onClick={() => void submit()}
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setMessages([
                    {
                      id: uid("chat"),
                      role: "assistant",
                      content:
                        "Chat cleared. Send a message to run the workflow again.",
                    },
                  ])
                }
              >
                <Eraser className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
          <div className="mx-auto mt-2 flex max-w-4xl items-center gap-2 text-xs text-zinc-500">
            <CornerDownLeft className="h-3.5 w-3.5" />
            Enter sends, Shift+Enter adds a new line
          </div>
        </div>
      </section>

      <aside className="hidden w-80 shrink-0 border-l border-zinc-200 bg-white xl:flex xl:flex-col">
        <div className="border-b border-zinc-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
            Backed By Flow
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">
            Execution Path
          </h3>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {workflowSteps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white text-xs font-semibold text-zinc-500">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-950">
                  {step.label}
                </span>
                <span className="text-xs capitalize text-zinc-500">
                  {step.status}
                </span>
              </span>
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const Icon = isUser ? User : Bot;

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-zinc-950 text-white">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <div
        className={`max-w-[76%] rounded-lg border px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "border-teal-200 bg-teal-600 text-white"
            : message.state === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-zinc-200 bg-white text-zinc-800"
        }`}
      >
        {message.state === "pending" ? (
          <span className="inline-flex items-center gap-2 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {message.content}
          </span>
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown className="markdown-result max-w-none">
            {message.content}
          </ReactMarkdown>
        )}
      </div>
      {isUser ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-teal-600 text-white">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}
