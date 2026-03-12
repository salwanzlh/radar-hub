import { useState } from "react";
import { Outlet } from "react-router-dom";
import { BrainCircuit, ChevronsLeft } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ErrorBoundary } from "./ErrorBoundary";
import { useSidebar } from "./SidebarContext";
import { ChatWidget, CHAT_PANEL_DEFAULT_WIDTH } from "../chat/ChatWidget";
import { cn } from "@/lib/utils";

export function LayoutShell() {
  const { collapsed, toggle } = useSidebar();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(CHAT_PANEL_DEFAULT_WIDTH);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onChatOpen={() => setChatOpen(true)} />

      {/* Floating toggle button — sits at the sidebar edge, half in / half out */}
      <button
        onClick={toggle}
        className="fixed top-5 z-40 w-7 h-7 bg-surface-white rounded-full shadow-md border border-surface-200 flex items-center justify-center hover:scale-110 hover:shadow-lg hover:border-brand-accent transition-all duration-300 ease-in-out group cursor-pointer"
        style={{ left: collapsed ? 66 : 260 }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronsLeft
          className={cn(
            "w-3.5 h-3.5 text-text-tertiary group-hover:text-brand-accent transition-transform duration-300",
            collapsed && "rotate-180",
          )}
        />
      </button>

      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          marginLeft: collapsed ? 80 : 270,
          marginRight: chatOpen ? chatWidth : 0,
        }}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Chat toggle button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-brand-accent text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer"
          aria-label="Open AI Assistant"
        >
          <BrainCircuit className="w-5 h-5" />
        </button>
      )}

      <ChatWidget
        open={chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
        width={chatWidth}
        onWidthChange={setChatWidth}
      />
    </div>
  );
}
