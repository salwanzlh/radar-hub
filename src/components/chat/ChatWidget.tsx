import { useState, useRef, useEffect, useCallback, type ComponentPropsWithoutRef } from "react";
import { BrainCircuit, X, SquarePen, Send, Loader2, Copy, Check } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { api, type ChatMessage } from "@/lib/api-client";

const markdownComponents: Components = {
  h2({ children }: ComponentPropsWithoutRef<"h2">) {
    return <h2 className="text-xs font-bold uppercase tracking-wide text-text-primary mt-3 mb-1.5">{children}</h2>;
  },
  h3({ children }: ComponentPropsWithoutRef<"h3">) {
    return <h3 className="text-sm font-semibold text-text-primary mt-2.5 mb-1">{children}</h3>;
  },
  p({ children }: ComponentPropsWithoutRef<"p">) {
    return <p className="text-sm text-text-secondary leading-relaxed mb-2">{children}</p>;
  },
  strong({ children }: ComponentPropsWithoutRef<"strong">) {
    return <strong className="font-semibold text-text-primary">{children}</strong>;
  },
  a({ children, href }: ComponentPropsWithoutRef<"a">) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">{children}</a>;
  },
  ul({ children }: ComponentPropsWithoutRef<"ul">) {
    return <ul className="text-sm text-text-secondary mb-2 space-y-0.5 list-disc list-outside ml-4">{children}</ul>;
  },
  ol({ children }: ComponentPropsWithoutRef<"ol">) {
    return <ol className="text-sm text-text-secondary mb-2 space-y-0.5 list-decimal list-outside ml-4">{children}</ol>;
  },
  li({ children }: ComponentPropsWithoutRef<"li">) {
    return <li className="leading-relaxed">{children}</li>;
  },
  hr() {
    return <hr className="my-2 border-none h-px bg-surface-200" />;
  },
  blockquote({ children }: ComponentPropsWithoutRef<"blockquote">) {
    return <blockquote className="border-l-2 border-brand-accent/40 pl-3 my-2 text-xs text-text-tertiary">{children}</blockquote>;
  },
  code({ children, className }: ComponentPropsWithoutRef<"code">) {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className="block bg-surface-200 rounded-lg px-3 py-2 text-xs text-text-primary overflow-x-auto my-2 whitespace-pre-wrap">{children}</code>;
    }
    return <code className="bg-surface-200 rounded px-1 py-0.5 text-xs text-text-primary">{children}</code>;
  },
  pre({ children }: ComponentPropsWithoutRef<"pre">) {
    return <pre className="my-2">{children}</pre>;
  },
  table({ children }: ComponentPropsWithoutRef<"table">) {
    return (
      <div className="overflow-x-auto my-2 rounded-lg border border-surface-200">
        <table className="w-full text-xs">{children}</table>
      </div>
    );
  },
  thead({ children }: ComponentPropsWithoutRef<"thead">) {
    return <thead className="bg-surface-200 text-text-primary">{children}</thead>;
  },
  tbody({ children }: ComponentPropsWithoutRef<"tbody">) {
    return <tbody className="divide-y divide-surface-200">{children}</tbody>;
  },
  tr({ children }: ComponentPropsWithoutRef<"tr">) {
    return <tr className="hover:bg-surface-100/50">{children}</tr>;
  },
  th({ children }: ComponentPropsWithoutRef<"th">) {
    return <th className="px-2.5 py-1.5 text-left font-semibold whitespace-nowrap">{children}</th>;
  },
  td({ children }: ComponentPropsWithoutRef<"td">) {
    return <td className="px-2.5 py-1.5 text-text-secondary">{children}</td>;
  },
};

type ChatMode = "quick" | "advisor";

interface DisplayMessage extends ChatMessage {
  id: string;
}

const QUICK_PROMPTS = [
  "Berita terbaru tentang Xpander?",
  "Berapa sentimen positif minggu ini?",
  "Ada berita kompetitor hari ini?",
];

const ADVISOR_PROMPTS = [
  "Analisis posisi pasar EV Mitsubishi vs kompetitor",
  "Rekomendasi strategi berdasarkan tren sentimen bulan ini",
  "Evaluasi dampak berita terkini terhadap brand perception",
];

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-surface-200 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export const CHAT_PANEL_WIDTH = 400;

interface ChatWidgetProps {
  open: boolean;
  onToggle: () => void;
}

export function ChatWidget({ open, onToggle }: ChatWidgetProps) {
  const [mode, setMode] = useState<ChatMode>("quick");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: DisplayMessage = {
        id: nextId(),
        role: "user",
        content: text.trim(),
      };
      const assistantMsg: DisplayMessage = {
        id: nextId(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsStreaming(true);

      try {
        const chatMessages: ChatMessage[] = [
          ...messages.map(({ role, content }) => ({ role, content })),
          { role: userMsg.role, content: userMsg.content },
        ];

        const stream = api.chat.stream(chatMessages, mode);
        for await (const chunk of stream) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        }
      } catch (err) {
        const errorText =
          err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: `**Error:** ${errorText}` }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, mode, isStreaming]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const suggestedPrompts = mode === "quick" ? QUICK_PROMPTS : ADVISOR_PROMPTS;

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-screen z-40 flex flex-col bg-surface-50 border-l border-surface-200 transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}
      style={{ width: CHAT_PANEL_WIDTH }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[72px] border-b border-surface-200 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-accent/15 flex items-center justify-center">
            <BrainCircuit className="w-4 h-4 text-brand-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary leading-none">MITRA AI</h2>
            <p className="text-[10px] text-text-tertiary mt-0.5">Marketing Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg hover:bg-surface-100 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="New chat"
            title="New chat"
          >
            <SquarePen className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-surface-100 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 px-4 py-2.5 border-b border-surface-200 shrink-0">
        <button
          onClick={() => setMode("quick")}
          className={cn(
            "flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors cursor-pointer",
            mode === "quick"
              ? "bg-brand-accent text-black"
              : "bg-surface-100 text-text-secondary hover:text-text-primary"
          )}
        >
          Quick Q&A
        </button>
        <button
          onClick={() => setMode("advisor")}
          className={cn(
            "flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors cursor-pointer",
            mode === "advisor"
              ? "bg-brand-accent text-black"
              : "bg-surface-100 text-text-secondary hover:text-text-primary"
          )}
        >
          Professional Advisor
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-2">
            <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
              <BrainCircuit className="w-7 h-7 text-text-tertiary" />
            </div>
            <div>
              <p className="text-text-secondary text-sm font-medium mb-1">
                {mode === "quick"
                  ? "Tanyakan seputar berita dan data MITRA"
                  : "Dapatkan analisis dan rekomendasi strategis"}
              </p>
              <p className="text-text-tertiary text-xs leading-relaxed">
                {mode === "quick"
                  ? "Jawaban cepat berdasarkan data terkini"
                  : "Insight mendalam untuk pengambilan keputusan"}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-1">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-xs text-text-secondary bg-surface-100 hover:bg-surface-200 border border-surface-200 rounded-xl px-3.5 py-2.5 transition-colors cursor-pointer leading-relaxed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  /* User message - right aligned, minimal */
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-brand-accent text-black rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Assistant message - full width with avatar */
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-brand-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                      <BrainCircuit className="w-3.5 h-3.5 text-brand-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-text-primary">MITRA AI</span>
                      <div className="mt-1">
                        {msg.content ? (
                          <>
                            <div className="max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content}</ReactMarkdown>
                            </div>
                            {/* Action bar */}
                            {!isStreaming && (
                              <div className="flex items-center gap-0.5 mt-2">
                                <CopyButton text={msg.content} />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-text-tertiary py-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-xs animate-pulse">Menganalisis data...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-surface-200 px-4 py-3 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan sesuatu..."
            rows={1}
            className="flex-1 resize-none bg-surface-100 text-text-primary placeholder:text-text-tertiary text-sm rounded-xl px-3.5 py-2.5 border border-surface-200 focus:outline-none focus:border-brand-accent/50 max-h-28 overflow-y-auto"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer",
              input.trim() && !isStreaming
                ? "bg-brand-accent text-black hover:opacity-90"
                : "bg-surface-100 text-text-tertiary cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
