import { useLocation } from "react-router-dom";
import { Bell } from "lucide-react";

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
  return "MITRA";
}

export function Header() {
  const { pathname } = useLocation();
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
        <button className="p-2.5 rounded-xl hover:bg-surface-100 text-text-secondary transition-colors">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
