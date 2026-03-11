import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Database,
  Newspaper,
  MessageCircle,
  DollarSign,
  BrainCircuit,
  Rss,
  MessageSquare,
  HeartPulse,
  Settings,
  ChevronDown,
  HardDrive,
  Globe,
  Radar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useSidebar } from "./SidebarContext";

// ── Data types ──────────────────────────────────────────────

interface NavLink {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  action?: never;
}

interface NavAction {
  label: string;
  icon: React.ElementType;
  action: string;
  href?: never;
  adminOnly?: boolean;
}

interface NavSubGroup {
  label: string;
  icon: React.ElementType;
  children: (NavLink | NavAction)[];
}

interface NavSection {
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  children: (NavLink | NavAction | NavSubGroup)[];
}

type NavItem = NavLink | NavSection;

function isSubGroup(item: NavLink | NavAction | NavSubGroup): item is NavSubGroup {
  return "children" in item;
}
function isAction(item: NavLink | NavAction): item is NavAction {
  return "action" in item;
}
function isNavSection(item: NavItem): item is NavSection {
  return "children" in item;
}

// ── Nav data ────────────────────────────────────────────────

const NAV_SECTIONS: NavItem[] = [
  {
    label: "Data Pipeline",
    icon: Database,
    adminOnly: true,
    children: [
      { label: "Internal", href: "/pipeline", icon: HardDrive },
      {
        label: "External",
        icon: Globe,
        children: [
          { label: "News / Article", href: "/articles", icon: Newspaper },
          { label: "Sentiment", href: "/sentiment", icon: MessageCircle },
          { label: "Price Comparison", href: "/pricing", icon: DollarSign, adminOnly: true },
        ],
      },
    ],
  },
  {
    label: "Intelligent System",
    icon: BrainCircuit,
    children: [
      { label: "Discovery Feed", href: "/analysis", icon: Rss },
      { label: "Positioning Radar", href: "/positioning-radar", icon: Radar },
      { label: "Chat (Widget)", icon: MessageSquare, action: "open-chat" },
    ],
  },
];

const BOTTOM_ITEMS: NavLink[] = [
  { label: "Health Check", href: "/health", icon: HeartPulse, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
];

// ── Tooltip ─────────────────────────────────────────────────

function Tooltip({ label }: { label: string }) {
  return (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#1c1c1c] text-white/90 text-[11px] font-medium rounded-lg opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-50 border border-white/[0.08] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.7)]">
      {label}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[#1c1c1c]" />
    </div>
  );
}

// ── Flyout for collapsed sections ───────────────────────────

function CollapsedFlyout({ section, pathname, isAdmin, onChatOpen }: {
  section: NavSection;
  pathname: string;
  isAdmin: boolean;
  onChatOpen?: () => void;
}) {
  const allLinks: (NavLink | NavAction)[] = [];
  const subGroupLabels: Map<number, string> = new Map();

  section.children.forEach((child) => {
    if (isSubGroup(child)) {
      subGroupLabels.set(allLinks.length, child.label);
      child.children.forEach((sub) => allLinks.push(sub));
    } else {
      allLinks.push(child);
    }
  });

  return (
    <div className="absolute left-full top-0 ml-3 py-2 px-1.5 bg-[#181818] rounded-xl border border-white/[0.08] shadow-[0_16px_48px_-8px_rgba(0,0,0,0.8)] opacity-0 group-hover/section:opacity-100 pointer-events-none group-hover/section:pointer-events-auto transition-all duration-200 z-50 min-w-[190px]">
      <div className="px-3 pb-1.5 mb-1 border-b border-white/[0.06]">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{section.label}</span>
      </div>
      {allLinks.map((item, idx) => {
        if (item.adminOnly && !isAdmin) return null;
        const sgLabel = subGroupLabels.get(idx);
        return (
          <div key={item.label}>
            {sgLabel && (
              <div className="px-3 pt-2.5 pb-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-brand-accent/40">{sgLabel}</span>
              </div>
            )}
            {isAction(item) ? (
              <button
                onClick={() => item.action === "open-chat" && onChatOpen?.()}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ) : (
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "text-brand-accent bg-brand-accent/[0.08]"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main sidebar ────────────────────────────────────────────

export function Sidebar({ onChatOpen }: { onChatOpen?: () => void }) {
  const { pathname } = useLocation();
  const { collapsed } = useSidebar();
  const { isAdmin } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Data Pipeline": true,
    "Intelligent System": true,
  });
  const [expandedSubGroups, setExpandedSubGroups] = useState<Record<string, boolean>>({
    "External": true,
  });

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };
  const toggleSubGroup = (label: string) => {
    setExpandedSubGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const hasActiveChild = (section: NavSection): boolean => {
    return section.children.some((child) => {
      if (isSubGroup(child)) {
        return child.children.some((sub) => !isAction(sub) && pathname.startsWith(sub.href));
      }
      return !isAction(child) && pathname.startsWith(child.href);
    });
  };

  const hasActiveSubGroup = (sg: NavSubGroup): boolean => {
    return sg.children.some((sub) => !isAction(sub) && pathname.startsWith(sub.href));
  };

  // ── Render a leaf link / action ─────────────────────────

  const renderLeaf = (item: NavLink | NavAction, depth: number) => {
    if (item.adminOnly && !isAdmin) return null;

    const isAct = isAction(item);
    const active = !isAct && pathname.startsWith(item.href);
    const pl = collapsed ? 0 : depth === 0 ? 16 : 28;

    const inner = (
      <>
        {/* Left accent rail */}
        <span
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] rounded-full transition-all duration-300",
            active
              ? "h-5 bg-brand-accent shadow-[0_0_10px_rgba(212,255,0,0.5)]"
              : "h-0 bg-transparent"
          )}
        />
        <span className={cn(
          "w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 transition-all duration-200",
          active
            ? "bg-brand-accent/[0.12] text-brand-accent"
            : "text-white/55"
        )}>
          <item.icon className="w-[14px] h-[14px]" />
        </span>
        <span
          className={cn(
            "overflow-hidden whitespace-nowrap transition-all duration-300",
            collapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[170px] opacity-100 ml-2"
          )}
        >
          {item.label}
        </span>
      </>
    );

    const cls = cn(
      "relative flex items-center rounded-lg text-[12px] font-medium transition-all duration-200 group/leaf",
      collapsed ? "justify-center py-2.5 px-2" : "py-[7px] pr-3",
      active
        ? "text-white bg-white/[0.08]"
        : "text-white/65 hover:text-white/90 hover:bg-white/[0.06]"
    );

    if (isAct) {
      return (
        <li key={item.label} className="relative group/nav">
          <button
            onClick={() => item.action === "open-chat" && onChatOpen?.()}
            className={cn(cls, "w-full")}
            style={collapsed ? {} : { paddingLeft: pl }}
          >
            {inner}
          </button>
          {collapsed && <Tooltip label={item.label} />}
        </li>
      );
    }

    return (
      <li key={item.href} className="relative group/nav">
        <Link to={item.href} className={cls} style={collapsed ? {} : { paddingLeft: pl }}>
          {inner}
        </Link>
        {collapsed && <Tooltip label={item.label} />}
      </li>
    );
  };

  // ── Render sub-group dropdown ─────────────────────────────

  const renderSubGroup = (sg: NavSubGroup) => {
    const sgExpanded = expandedSubGroups[sg.label] ?? true;
    const sgActive = hasActiveSubGroup(sg);
    const SubIcon = sg.icon;

    return (
      <li key={sg.label}>
        <button
          onClick={() => toggleSubGroup(sg.label)}
          className={cn(
            "w-full flex items-center gap-2 py-[7px] pl-4 pr-2 rounded-lg text-[12px] font-medium transition-all duration-200 mt-0.5",
            sgActive
              ? "text-white bg-white/[0.07]"
              : "text-white/70 hover:text-white/90 hover:bg-white/[0.06]"
          )}
        >
          <span className={cn(
            "w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 transition-all duration-200",
            sgActive ? "text-brand-accent/80" : "text-white/50"
          )}>
            <SubIcon className="w-[14px] h-[14px]" />
          </span>
          <span className="flex-1 text-left">{sg.label}</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-300 shrink-0",
              sgActive ? "text-white/50" : "text-white/35",
              !sgExpanded && "-rotate-90"
            )}
          />
        </button>

        {/* Dropdown content */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            sgExpanded ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="relative ml-[25px] mt-0.5 pl-2.5 border-l border-white/[0.1]">
            <ul className="space-y-[1px]">
              {sg.children.map((sub) => renderLeaf(sub, 1))}
            </ul>
          </div>
        </div>
      </li>
    );
  };

  // ── Render a section (collapsible group) ────────────────

  const renderSection = (section: NavSection) => {
    if (section.adminOnly && !isAdmin) return null;

    const expanded = expandedSections[section.label] ?? true;
    const active = hasActiveChild(section);

    return (
      <div key={section.label} className={cn("relative", collapsed && "group/section")}>
        {/* Section header */}
        <button
          onClick={() => !collapsed && toggleSection(section.label)}
          className={cn(
            "w-full flex items-center transition-all duration-200 relative",
            collapsed ? "justify-center py-3 px-2 rounded-xl" : "px-3 py-2.5 rounded-xl",
            active
              ? "text-white"
              : "text-white/70 hover:text-white/90"
          )}
        >
          {/* Ambient glow when section is active */}
          {active && (
            <div className="absolute inset-0 rounded-xl bg-brand-accent/[0.03] pointer-events-none" />
          )}
          <div
            className={cn(
              "relative w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-300",
              active
                ? "bg-brand-accent text-black shadow-[0_0_20px_rgba(212,255,0,0.2)]"
                : "bg-white/[0.08] text-current"
            )}
          >
            <section.icon className="w-4 h-4" />
          </div>
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap transition-all duration-300 flex-1 text-left text-[13px] font-semibold tracking-wide",
              collapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[160px] opacity-100 ml-3"
            )}
          >
            {section.label}
          </span>
          {!collapsed && (
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-white/40 transition-transform duration-300 shrink-0",
                !expanded && "-rotate-90"
              )}
            />
          )}
        </button>

        {/* Collapsed: flyout popover */}
        {collapsed && (
          <CollapsedFlyout
            section={section}
            pathname={pathname}
            isAdmin={isAdmin}
            onChatOpen={onChatOpen}
          />
        )}

        {/* Expanded children */}
        {!collapsed && (
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="mt-1 ml-[23px] pl-3 border-l border-white/[0.1]">
              <ul className="space-y-[1px]">
                {section.children.map((child) => {
                  if (isSubGroup(child)) return renderSubGroup(child);
                  return renderLeaf(child, 0);
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render bottom link ──────────────────────────────────

  const renderBottomLink = (item: NavLink) => {
    if (item.adminOnly && !isAdmin) return null;
    const active = pathname.startsWith(item.href);

    return (
      <li key={item.href} className="relative group/nav">
        <Link
          to={item.href}
          className={cn(
            "relative flex items-center rounded-lg text-[12px] font-medium transition-all duration-200",
            collapsed ? "justify-center py-2.5 px-2" : "px-3 py-2",
            active
              ? "text-white/90 bg-white/[0.07]"
              : "text-white/50 hover:text-white/70 hover:bg-white/[0.05]"
          )}
        >
          <item.icon className={cn("w-4 h-4 shrink-0", active && "text-brand-accent/60")} />
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap transition-all duration-300",
              collapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[180px] opacity-100 ml-2.5"
            )}
          >
            {item.label}
          </span>
        </Link>
        {collapsed && <Tooltip label={item.label} />}
      </li>
    );
  };

  // ── Shell ───────────────────────────────────────────────

  return (
    <aside
      className={cn(
        "flex flex-col h-screen fixed left-0 top-0 z-30 transition-all duration-300 ease-in-out overflow-hidden",
        "bg-[#131313] border-r border-white/[0.07]",
        collapsed ? "w-20" : "w-[272px]"
      )}
    >
      {/* ── Logo ───────────────────────────────────────── */}
      <div
        className={cn(
          "h-[68px] flex items-center shrink-0 transition-all duration-300",
          collapsed ? "justify-center px-3" : "px-6"
        )}
      >
        <div className="flex items-center">
          <div className="relative w-9 h-9 bg-brand-accent rounded-[12px] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(212,255,0,0.15)]">
            <span className="text-black font-bold text-sm tracking-tight">M</span>
          </div>
          <div
            className={cn(
              "overflow-hidden whitespace-nowrap transition-all duration-300",
              collapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[200px] opacity-100 ml-3"
            )}
          >
            <h1 className="text-white font-bold text-[17px] leading-none tracking-[0.04em]">MITRA</h1>
            <p className="text-white/40 text-[9px] leading-none mt-1.5 uppercase tracking-[0.18em] font-medium">
              Marketing Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* ── Divider ────────────────────────────────────── */}
      <div className={cn("mx-4 h-px", collapsed ? "mx-2" : "mx-5")}>
        <div className="h-full bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
      </div>

      {/* ── Main navigation ────────────────────────────── */}
      <nav className={cn(
        "flex-1 py-4 overflow-y-auto scrollbar-hide transition-all duration-300",
        collapsed ? "px-2" : "px-3"
      )}>
        <div className="space-y-3">
          {NAV_SECTIONS.map((item) =>
            isNavSection(item) ? renderSection(item) : renderLeaf(item, 0)
          )}
        </div>
      </nav>

      {/* ── Bottom items ───────────────────────────────── */}
      <div className={cn("py-2 transition-all duration-300", collapsed ? "px-2" : "px-3")}>
        <div className={cn("mx-2 mb-2 h-px", collapsed ? "mx-0" : "")}>
          <div className="h-full bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
        </div>
        <ul className="space-y-[2px]">
          {BOTTOM_ITEMS.map(renderBottomLink)}
        </ul>
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div
        className={cn(
          "overflow-hidden whitespace-nowrap transition-all duration-300",
          collapsed ? "max-h-0 opacity-0 p-0" : "max-h-16 opacity-100 px-6 pb-4 pt-1"
        )}
      >
        <p className="text-white/30 text-[10px] font-medium tracking-wide">Mitsubishi Motors Indonesia</p>
        <p className="text-white/20 text-[9px] mt-0.5 tracking-wider">Alert Management v0.1</p>
      </div>
    </aside>
  );
}
