import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, UploadCloud, Sparkles, Activity, Trash2, X, ArrowUp } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Message = { role: "user" | "assistant" | "error"; content: string };

// TODO: replace with your FastAPI base URL
const API_URL = import.meta.env.VITE_API_URL;

console.log("API_URL =", API_URL);

function Index() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [health, setHealth] = useState<"idle" | "checking" | "ok" | "down">("idle");
  const [input, setInput] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleFiles = async (fileList: FileList) => {
    const pdfs = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of pdfs) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          await fetch(`${API_URL}/upload`, { method: "POST", body: fd });
        } catch {
          // ignore, still show locally
        }
        setFiles((f) => [...f, { name: file.name, size: file.size }]);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || isLoading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setIsLoading(true);
    try {
      // POST /chat — FastAPI endpoint
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer ?? "" }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "error", content: `${(e as Error).message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const ready = files.length > 0;

  const checkHealth = async () => {
    setHealth("checking");
    try {
      const res = await fetch(`${API_URL}/health`);
      setHealth(res.ok ? "ok" : "down");
    } catch {
      setHealth("down");
    }
  };

  const clearChat = () => setMessages([]);

  const removeFile = (name: string) =>
    setFiles((f) => f.filter((x) => x.name !== name));

  return (
    <div className="min-h-screen w-full p-6 md:p-10">
      <div className="mx-auto grid h-[calc(100vh-5rem)] max-w-7xl grid-cols-1 gap-6 md:grid-cols-[320px_1fr]">
        {/* Left panel — document info */}
       <aside className="glass flex min-h-0 flex-col gap-4 overflow-hidden rounded-3xl p-5">
          {/* Top actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={checkHealth}
              className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 text-sm font-medium transition hover:bg-white/80"
            >
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Check API Health
              </span>
              {health !== "idle" && (
                <span
                  className={`text-[11px] font-semibold ${
                    health === "ok"
                      ? "text-emerald-600"
                      : health === "down"
                        ? "text-red-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {health === "checking" ? "…" : health === "ok" ? "OK" : "DOWN"}
                </span>
              )}
            </button>
            <button
              onClick={clearChat}
              className="flex items-center gap-2 rounded-2xl bg-white/60 px-4 py-3 text-sm font-medium transition hover:bg-white/80"
            >
              <Trash2 className="h-4 w-4 text-primary" />
              Clear Chat
            </button>
          </div>

          <div className="my-1 h-px bg-white/60" />

          {/* Files list */}
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground">
              ATTACHED FILES
            </p>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {files.length === 0 ? (
                <p className="text-xs text-muted-foreground">No files yet</p>
              ) : (
                files.map((f) => (
                  <div
                    key={f.name}
                    className="group flex items-center gap-2.5 rounded-2xl bg-white/70 p-2.5"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(f.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(f.name)}
                      className="shrink-0 rounded-full p-1 text-muted-foreground opacity-0 transition hover:bg-white group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom upload — folder / multi-file upload */}
          <label
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[var(--shadow-glow)] transition hover:opacity-95"
            style={{ background: "var(--gradient-primary)" }}
          >
            <UploadCloud className="h-5 w-5" />
            <span>{isUploading ? "Uploading..." : "Upload Files"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              disabled={isUploading}
            />
          </label>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                ready ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {ready ? "Analyst ready" : "Awaiting PDF"}
          </div>
        </aside>

        {/* Right panel — chat */}
        <main className="glass flex flex-col overflow-hidden rounded-3xl">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 md:px-10">
            {messages.length === 0 && !isLoading ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-8">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-3xl font-semibold tracking-tight">Analyst is ready</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {ready ? "Ask anything about this document" : "Upload a PDF to get started"}
                </p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.map((m, i) => (
                  <Bubble key={i} msg={m} />
                ))}
                {isLoading && (
                  <div className="max-w-[80%] self-start rounded-2xl bg-white/60 px-4 py-3 text-sm text-muted-foreground">
                    <span className="inline-flex gap-1">
                      <Dot />
                      <Dot delay="150ms" />
                      <Dot delay="300ms" />
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 pb-6 md:px-10">
            <div className="glass-strong mx-auto flex max-w-3xl items-center gap-2 rounded-full py-2 pl-5 pr-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask a question about the document..."
                disabled={isLoading}
                className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                aria-label="Send"
                className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[var(--shadow-glow)] transition hover:scale-105 disabled:opacity-40 disabled:shadow-none"
                style={{ background: "var(--gradient-primary)" }}
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
      style={{ animationDelay: delay }}
    />
  );
}

function Bubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div
        className="max-w-[80%] self-end rounded-2xl px-4 py-2.5 text-sm text-white shadow-[var(--shadow-glow)]"
        style={{ background: "var(--gradient-bubble-user)" }}
      >
        {msg.content}
      </div>
    );
  }
  if (msg.role === "error") {
    return (
      <div className="max-w-[80%] self-start rounded-2xl border border-red-300/60 bg-red-50/80 px-4 py-2.5 text-sm text-red-700">
        {msg.content}
      </div>
    );
  }

  return (
    <div
      className="prose prose-sm max-w-[85%] self-start rounded-2xl bg-white/70 px-4 py-3 text-sm text-foreground
        [&_p]:mb-3 [&_p:last-child]:mb-0
        [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1.5
        [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5
        [&_li]:leading-relaxed
        [&_strong]:font-semibold [&_strong]:text-foreground
        [&_hr]:my-4 [&_hr]:border-t [&_hr]:border-black/10
        [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2
        [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2
        [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
    </div>
  );

  // return (
  //   <div className="prose prose-sm max-w-[85%] self-start rounded-2xl bg-white/70 px-4 py-3 text-sm text-foreground">
  //     <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
  //   </div>
  // );
}
