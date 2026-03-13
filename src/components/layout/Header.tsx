import { useLocation } from "react-router-dom";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/articles": "News Articles",
  "/analysis": "AI Analysis & Reports",
  "/sentiment": "Sentiment Analysis",
  "/health": "Health Evaluation",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path) && path !== "/") return title;
  }
  return "RadarHub";
}

export function Header() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const title = getPageTitle(pathname);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="h-[72px] bg-surface-white/80 backdrop-blur-sm border-b border-surface-200 flex items-center justify-between px-8">
      <div>
        <h2 className="text-xl font-semibold text-text-primary tracking-tight">{title}</h2>
        <p className="text-xs text-text-tertiary mt-0.5">{today}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <User className="w-4 h-4" />
          <span>{user?.full_name || "User"}</span>
          {user && (
            <span className="text-xs text-text-tertiary bg-surface-100 px-2 py-0.5 rounded-full">
              {user.role}
            </span>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl hover:bg-surface-100 text-text-secondary hover:text-brand-accent transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>
        <button
          onClick={logout}
          className="p-2.5 rounded-xl hover:bg-surface-100 text-text-secondary hover:text-status-error transition-colors"
          title="Logout"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
}
