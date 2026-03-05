import { Outlet } from "react-router-dom";
import { ChevronsLeft } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ErrorBoundary } from "./ErrorBoundary";
import { useSidebar } from "./SidebarContext";
import { ChatWidget } from "../chat/ChatWidget";
import { cn } from "@/lib/utils";

export function LayoutShell() {
  const { collapsed, toggle } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* Floating toggle button — sits at the sidebar edge, half in / half out */}
      <button
        onClick={toggle}
        className="fixed top-5 z-40 w-7 h-7 bg-surface-white rounded-full shadow-md border border-surface-200 flex items-center justify-center hover:scale-110 hover:shadow-lg hover:border-brand-accent transition-all duration-300 ease-in-out group cursor-pointer"
        style={{ left: collapsed ? 66 : 266 }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronsLeft
          className={cn(
            "w-3.5 h-3.5 text-text-tertiary group-hover:text-brand-accent transition-transform duration-300",
            collapsed && "rotate-180"
          )}
        />
      </button>

      <div
        className="flex-1 flex flex-col overflow-hidden transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: collapsed ? 80 : 280 }}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ChatWidget />
    </div>
  );
}
