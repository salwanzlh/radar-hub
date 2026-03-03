import { Link, useLocation } from "react-router-dom";
import { Newspaper, BrainCircuit, MessageCircle, HeartPulse, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";

const NAV_ITEMS = [
  { label: "Sentiment", href: "/sentiment", icon: MessageCircle },
  { label: "News Articles", href: "/articles", icon: Newspaper },
  { label: "AI Analysis", href: "/analysis", icon: BrainCircuit },
  { label: "Health Check", href: "/health", icon: HeartPulse },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { collapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "bg-brand-charcoal flex flex-col h-screen fixed left-0 top-0 z-30 transition-all duration-300 ease-in-out overflow-hidden border-r border-white/[0.06]",
        collapsed ? "w-20" : "w-[280px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "h-[72px] flex items-center border-b border-white/8 shrink-0 transition-all duration-300",
          collapsed ? "justify-center px-3" : "px-7"
        )}
      >
        <div className="flex items-center">
          <div className="w-9 h-9 bg-brand-accent rounded-[14px] flex items-center justify-center shrink-0">
            <span className="text-black font-bold text-sm">M</span>
          </div>
          <div
            className={cn(
              "overflow-hidden whitespace-nowrap transition-all duration-300",
              collapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[200px] opacity-100 ml-3"
            )}
          >
            <h1 className="text-white font-semibold text-lg leading-none tracking-wide">MITRA</h1>
            <p className="text-white/40 text-[10px] leading-none mt-1 uppercase tracking-widest">Marketing Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 py-6 transition-all duration-300", collapsed ? "px-2" : "px-4")}>
        <ul className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <li key={item.href} className="relative group/nav">
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden",
                    collapsed ? "justify-center py-3 px-2" : "px-4 py-3",
                    isActive
                      ? "bg-brand-accent/15 text-white"
                      : "text-white/50 hover:bg-white/5 hover:text-white/70"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-colors",
                      isActive
                        ? "bg-brand-accent text-black"
                        : "bg-transparent text-current"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span
                    className={cn(
                      "overflow-hidden whitespace-nowrap transition-all duration-300",
                      collapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[200px] opacity-100 ml-3"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>

                {/* Tooltip — visible on hover when sidebar is collapsed */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-brand-charcoal text-white text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-50">
                    {item.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-brand-charcoal" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div
        className={cn(
          "border-t border-white/6 overflow-hidden whitespace-nowrap transition-all duration-300",
          collapsed ? "max-h-0 opacity-0 p-0 border-t-0" : "max-h-20 opacity-100 p-5"
        )}
      >
        <p className="text-white/30 text-xs">Mitsubishi Motors Indonesia</p>
        <p className="text-white/20 text-[10px] mt-0.5">Alert Management v0.1</p>
      </div>
    </aside>
  );
}
