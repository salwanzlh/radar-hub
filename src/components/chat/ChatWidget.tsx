import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Trash2, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { api, type ChatMessage } from "@/lib/api-client";

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

export function ChatWidget() {
  const [open, setOpen] = useState(false);
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

  // Floating button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brand-accent text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col bg-surface-50 border border-surface-200 rounded-2xl shadow-2xl overflow-hidden"
      style={{ width: 420, height: 620 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 bg-surface-100">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-brand-accent" />
          <span className="text-text-primary font-semibold text-sm">MITRA AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 px-4 py-2 border-b border-surface-200">
        <button
          onClick={() => setMode("quick")}
          className={cn(
            "flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors cursor-pointer",
            mode === "quick"
              ? "bg-brand-accent text-black"
              : "bg-surface-200 text-text-secondary hover:text-text-primary"
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
              : "bg-surface-200 text-text-secondary hover:text-text-primary"
          )}
        >
          Professional Advisor
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <MessageCircle className="w-10 h-10 text-text-tertiary" />
            <div>
              <p className="text-text-secondary text-sm font-medium mb-1">
                {mode === "quick"
                  ? "Tanyakan seputar berita dan data MITRA"
                  : "Dapatkan analisis dan rekomendasi strategis"}
              </p>
              <p className="text-text-tertiary text-xs">
                {mode === "quick"
                  ? "Jawaban cepat berdasarkan data terkini"
                  : "Insight mendalam untuk pengambilan keputusan"}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-xs text-text-secondary bg-surface-100 hover:bg-surface-200 border border-surface-200 rounded-lg px-3 py-2 transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-brand-accent text-black"
                      : "bg-surface-100 text-text-primary"
                  )}
                >
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
                    )
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 px-4 py-3 border-t border-surface-200"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik pertanyaan..."
          rows={1}
          className="flex-1 resize-none bg-surface-100 text-text-primary placeholder:text-text-tertiary text-sm rounded-lg px-3 py-2 border border-surface-200 focus:outline-none focus:border-brand-accent max-h-24 overflow-y-auto"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className={cn(
            "p-2 rounded-lg transition-colors cursor-pointer",
            input.trim() && !isStreaming
              ? "bg-brand-accent text-black hover:opacity-90"
              : "bg-surface-200 text-text-tertiary cursor-not-allowed"
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
  );
}
