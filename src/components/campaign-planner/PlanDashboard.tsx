import { useState, type ReactNode } from "react";
import {
  AlertTriangle, BarChart3, BookOpen, ChevronDown, ChevronRight, Clock,
  DollarSign, Lightbulb, Loader2, Megaphone, MessageSquare, Pencil,
  RotateCcw, Save, Shield, Sparkles, Target, TrendingUp, User, Users, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FADE_CSS = `@keyframes pdFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;

const TABS = [
  { key: "executive_summary", label: "Executive Summary", icon: BookOpen },
  { key: "target_audience", label: "Target Audience", icon: Users },
  { key: "strategic_framework", label: "Strategic Framework", icon: Target },
  { key: "campaign_architecture", label: "Campaign", icon: Megaphone },
  { key: "channel_content_plan", label: "Channels & Content", icon: BarChart3 },
  { key: "budget_allocation", label: "Budget", icon: DollarSign },
  { key: "kpi_measurement", label: "KPIs", icon: TrendingUp },
  { key: "timeline_roadmap", label: "Timeline", icon: Clock },
  { key: "risks_countermessages", label: "Risks", icon: Shield },
] as const;
type TabKey = (typeof TABS)[number]["key"];

interface Props {
  plan: Record<string, unknown>;
  onEditSection: (sectionKey: string, content: Record<string, unknown>) => void;
  onResetSection: (sectionKey: string) => void;
  status: string;
  isEditing: boolean;
}

/* ── safe data helpers ────────────────────────────────────── */
const s = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const nu = (v: unknown): number | null => (typeof v === "number" ? v : null);
const ar = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rc = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/* ── micro-components ─────────────────────────────────────── */
const Anim = ({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) => (
  <div className={className} style={{ animation: `pdFadeIn 0.4s ease-out ${delay}ms both` }}>{children}</div>
);

const SLabel = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-brand-accent to-brand-accent/40" />
    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">{children}</span>
  </div>
);

const Crd = ({ children, className, accent }: { children: ReactNode; className?: string; accent?: boolean }) => (
  <div className={cn(
    "bg-gradient-to-br from-surface-white to-surface-50 rounded-xl border border-surface-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-5 relative overflow-hidden",
    accent && "border-l-4 border-l-brand-accent", className,
  )}>{children}</div>
);

function Bdg({ children, variant = "neutral" }: { children: ReactNode; variant?: string }) {
  const m: Record<string, string> = {
    neutral: "bg-surface-100 text-text-tertiary ring-1 ring-surface-200",
    red: "bg-red-50 text-red-700 ring-1 ring-red-200", amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    green: "bg-green-50 text-green-700 ring-1 ring-green-200", blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    accent: "bg-brand-accent/10 text-brand-accent ring-1 ring-brand-accent/20",
    gradient: "bg-gradient-to-r from-brand-accent to-pink-500 text-white",
  };
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap", m[variant] ?? m.neutral)}>{children}</span>;
}

function sevBdg(v: unknown) {
  const t = (s(v) ?? "").toLowerCase();
  if (t.includes("high") || t.includes("tinggi")) return <Bdg variant="red">{s(v)}</Bdg>;
  if (t.includes("med") || t.includes("sedang")) return <Bdg variant="amber">{s(v)}</Bdg>;
  if (t.includes("low") || t.includes("rendah")) return <Bdg variant="green">{s(v)}</Bdg>;
  return <Bdg>{s(v) ?? "N/A"}</Bdg>;
}

function Tbl({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-surface-100">
      <table className="w-full border-collapse text-sm">
        <thead><tr className="bg-brand-accent/5">
          {headers.map((h, i) => <th key={i} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-accent border-b border-brand-accent/10 whitespace-nowrap">{h}</th>)}
        </tr></thead>
        <tbody>{rows.map((row, ri) => (
          <tr key={ri} className={cn("hover:bg-brand-accent/[0.03] transition-colors", ri % 2 === 0 ? "bg-surface-white" : "bg-surface-50/50")}>
            {row.map((cell, ci) => <td key={ci} className="px-4 py-3 text-text-secondary border-b border-surface-100 leading-relaxed">{cell}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function PBar({ label, pct }: { label: string; pct: number }) {
  const p = Math.min(100, Math.max(0, pct));
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-text-secondary truncate mr-3">{label}</span>
        <span className="text-xs font-bold text-text-primary tabular-nums">{p.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-accent to-brand-accent/60 rounded-full transition-all duration-700 ease-out" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function Fold({ title, open: init = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(init);
  return (
    <div className="border border-surface-100 rounded-xl overflow-hidden mb-2 bg-gradient-to-br from-surface-white to-surface-50">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-text-primary hover:bg-surface-50 transition-colors text-left">
        {title}
        <ChevronDown className={cn("w-4 h-4 text-text-tertiary shrink-0 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0")}>
        <div className="px-4 py-3 border-t border-surface-100">{children}</div>
      </div>
    </div>
  );
}

const RaciCell = ({ value }: { value: string }) => {
  const v = value.toUpperCase().trim();
  const m: Record<string, string> = { R: "bg-blue-100 text-blue-800 font-bold", A: "bg-red-100 text-red-800 font-bold", C: "bg-amber-100 text-amber-800 font-bold", I: "bg-surface-100 text-text-tertiary font-medium" };
  return <span className={cn("inline-flex items-center justify-center w-7 h-7 rounded-md text-[11px]", m[v] ?? "text-text-tertiary")}>{v || "-"}</span>;
};

/* ── tab renderers ────────────────────────────────────────── */
function ExecSummary({ d }: { d: Record<string, unknown> }) {
  const overview = s(d.plan_overview) ?? s(d.overview);
  const objs = ar(d.smart_objectives ?? d.objectives);
  const csf = ar(d.critical_success_factors ?? d.success_factors);
  return (
    <div className="space-y-6">
      {overview && <Anim><Crd accent><SLabel>Plan Overview</SLabel><p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{overview}</p></Crd></Anim>}
      {objs.length > 0 && <Anim delay={80}><SLabel>SMART Objectives</SLabel>
        <Tbl headers={["#", "Objective", "Metric", "Target", "Timeframe"]} rows={objs.map((o, i) => { const x = rc(o); return [<span className="font-bold text-brand-accent">{i + 1}</span>, s(x.objective) ?? s(x.description) ?? "-", s(x.metric) ?? s(x.kpi) ?? "-", <span className="font-semibold text-text-primary">{s(x.target) ?? "-"}</span>, s(x.timeframe) ?? s(x.timeline) ?? "-"]; })} />
      </Anim>}
      {csf.length > 0 && <Anim delay={160}><SLabel>Critical Success Factors</SLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{csf.map((f, i) => { const x = rc(f); return (
          <Crd key={i}><span className="absolute top-3 right-4 text-3xl font-black text-brand-accent/8 leading-none">{String(i + 1).padStart(2, "0")}</span>
            <p className="text-sm font-semibold text-text-primary mb-1">{s(x.title) ?? s(x.name) ?? `Factor ${i + 1}`}</p>
            <p className="text-xs text-text-tertiary leading-relaxed">{s(x.description) ?? s(x.detail) ?? ""}</p>
          </Crd>); })}</div>
      </Anim>}
    </div>
  );
}

function Audience({ d }: { d: Record<string, unknown> }) {
  const flds: { key: string; label: string; icon: typeof User }[] = [
    { key: "name", label: "Name", icon: User }, { key: "profile", label: "Profile", icon: Users },
    { key: "mindset", label: "Mindset", icon: Lightbulb }, { key: "key_anxiety", label: "Key Anxiety", icon: AlertTriangle },
    { key: "decision_triggers", label: "Decision Triggers", icon: Zap }, { key: "media_behavior", label: "Media Behavior", icon: BarChart3 },
    { key: "purchase_journey", label: "Purchase Journey", icon: ChevronRight },
  ];
  const pCard = (label: string, p: Record<string, unknown>, delay: number) => (
    <Anim delay={delay} className="flex-1 min-w-0">
      <Crd accent>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-accent/20 to-brand-accent/5 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-brand-accent" /></div>
          <SLabel>{label}</SLabel>
        </div>
        <div className="space-y-3">{flds.map(({ key, label: fl, icon: Icon }) => { const v = s(p[key]); if (!v) return null; return (
          <div key={key} className="bg-surface-50 rounded-lg p-3 border border-surface-100">
            <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3 h-3 text-brand-accent" /><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-accent">{fl}</span></div>
            <span className="text-xs text-text-secondary leading-relaxed">{v}</span>
          </div>); })}</div>
      </Crd>
    </Anim>
  );
  const pri = rc(d.primary ?? d.primary_persona), sec = rc(d.secondary ?? d.secondary_persona);
  const hp = Object.keys(pri).length > 0, hs = Object.keys(sec).length > 0;
  if (!hp && !hs) return <p className="text-sm text-text-tertiary text-center py-8">No target audience data available.</p>;
  return <div className="flex flex-col lg:flex-row gap-4">{hp && pCard("Primary Persona", pri, 0)}{hs && pCard("Secondary Persona", sec, 100)}</div>;
}

function Strategy({ d }: { d: Record<string, unknown> }) {
  const pos = s(d.positioning_statement ?? d.positioning);
  const og = ar(d.objectives_to_goals ?? d.objectives);
  const msg = rc(d.messaging_architecture ?? d.messaging);
  const tag = s(msg.tagline), layers = ar(msg.layers ?? msg.message_layers);
  const rtbs = ar(d.reasons_to_believe ?? d.rtbs);
  return (
    <div className="space-y-6">
      {pos && <Anim><Crd accent><SLabel>Positioning Statement</SLabel><p className="text-base font-semibold text-text-primary italic leading-relaxed">&ldquo;{pos}&rdquo;</p></Crd></Anim>}
      {og.length > 0 && <Anim delay={80}><SLabel>Objectives to Goals</SLabel><Tbl headers={["Objective", "Goal", "Metric"]} rows={og.map((o) => { const x = rc(o); return [s(x.objective) ?? "-", s(x.goal) ?? "-", s(x.metric) ?? s(x.kpi) ?? "-"]; })} /></Anim>}
      {(tag || layers.length > 0) && <Anim delay={160}><SLabel>Messaging Architecture</SLabel>
        {tag && <Crd className="mb-3"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-accent block mb-2">Tagline</span><p className="text-xl font-bold text-text-primary italic leading-snug">&ldquo;{tag}&rdquo;</p></Crd>}
        {layers.length > 0 && <Tbl headers={["Layer", "Message", "Trigger"]} rows={layers.map((l) => { const x = rc(l); return [s(x.layer) ?? s(x.name) ?? "-", s(x.message) ?? s(x.content) ?? "-", s(x.trigger) ?? "-"]; })} />}
      </Anim>}
      {rtbs.length > 0 && <Anim delay={240}><SLabel>Reasons to Believe</SLabel>
        <div className="flex flex-wrap gap-2">{rtbs.map((item, i) => {
          const text = typeof item === "string" ? item : s(rc(item).text) ?? s(rc(item).description) ?? JSON.stringify(item);
          return <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-brand-accent/8 text-brand-accent ring-1 ring-brand-accent/15">{text}</span>;
        })}</div>
      </Anim>}
    </div>
  );
}

function CampaignTab({ d }: { d: Record<string, unknown> }) {
  const bi = rc(d.big_idea ?? d.campaign_idea);
  const hero = ar(d.hero_content_pieces ?? d.hero_content);
  const rules = ar(d.tactical_rules ?? d.rules_of_engagement);
  return (
    <div className="space-y-6">
      {(s(bi.title) || s(bi.description)) && <Anim><Crd className="border-l-4 border-l-brand-accent py-6">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-accent to-brand-accent/20" />
        <SLabel>Big Idea</SLabel>
        {s(bi.title) && <p className="text-xl font-extrabold text-text-primary mb-2 leading-tight">{s(bi.title)}</p>}
        {s(bi.description) && <p className="text-sm text-text-secondary leading-relaxed">{s(bi.description)}</p>}
      </Crd></Anim>}
      {hero.length > 0 && <Anim delay={80}><SLabel>Hero Content Pieces</SLabel>{hero.map((p, i) => { const x = rc(p); return (
        <Fold key={i} title={s(x.title) ?? s(x.name) ?? `Piece ${i + 1}`} open={i === 0}>
          <div className="flex flex-wrap gap-2 mb-3">{s(x.format) && <Bdg variant="accent">{s(x.format)}</Bdg>}{s(x.platform) && <Bdg variant="blue">{s(x.platform)}</Bdg>}</div>
          {s(x.purpose ?? x.description) && <p className="text-xs text-text-secondary leading-relaxed">{s(x.purpose) ?? s(x.description)}</p>}
        </Fold>); })}</Anim>}
      {rules.length > 0 && <Anim delay={160}><SLabel>Tactical Rules</SLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{rules.map((rl, i) => { const x = rc(rl); return (
          <Crd key={i}><p className="text-sm font-semibold text-text-primary mb-1">{s(x.rule) ?? s(x.title) ?? `Rule ${i + 1}`}</p><p className="text-xs text-text-tertiary leading-relaxed">{s(x.detail) ?? s(x.description) ?? ""}</p></Crd>); })}</div>
      </Anim>}
    </div>
  );
}

function Channels({ d }: { d: Record<string, unknown> }) {
  const cr = ar(d.channel_roles ?? d.channels), pil = ar(d.content_pillars ?? d.pillars), cal = ar(d.content_calendar ?? d.calendar);
  return (
    <div className="space-y-6">
      {cr.length > 0 && <Anim><SLabel>Channel Roles</SLabel><Tbl headers={["Channel", "Role", "Content Type", "Cadence"]} rows={cr.map((c) => { const x = rc(c); return [<span className="font-semibold text-text-primary">{s(x.channel) ?? "-"}</span>, s(x.role) ?? "-", s(x.content_type) ?? s(x.format) ?? "-", s(x.cadence) ?? s(x.frequency) ?? "-"]; })} /></Anim>}
      {pil.length > 0 && <Anim delay={80}><SLabel>Content Pillars</SLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{pil.map((p, i) => { const x = rc(p); const pct = nu(x.percentage) ?? nu(x.pct) ?? 0; const R = 28, C = 2 * Math.PI * R, off = C - (C * Math.min(100, pct)) / 100; return (
          <Crd key={i}><div className="flex items-start gap-4">
            <svg width="64" height="64" className="shrink-0 -rotate-90"><circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" className="stroke-surface-100" /><circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" className="stroke-brand-accent" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 0.8s ease-out" }} /><text x="32" y="32" textAnchor="middle" dominantBaseline="central" className="fill-text-primary text-[11px] font-bold" transform="rotate(90,32,32)">{pct}%</text></svg>
            <div className="min-w-0"><p className="text-sm font-semibold text-text-primary mb-1">{s(x.name) ?? s(x.pillar) ?? `Pillar ${i + 1}`}</p><p className="text-xs text-text-tertiary leading-relaxed">{s(x.description) ?? s(x.detail) ?? ""}</p></div>
          </div></Crd>); })}</div>
      </Anim>}
      {cal.length > 0 && <Anim delay={160}><SLabel>Content Calendar</SLabel><div className="space-y-3">{cal.map((c, i) => { const x = rc(c); return (
        <Crd key={i} accent><div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 shrink-0"><Bdg variant="accent">{s(x.phase) ?? `Phase ${i + 1}`}</Bdg>{(s(x.weeks) ?? s(x.period)) && <span className="text-[10px] font-medium text-text-tertiary">{s(x.weeks) ?? s(x.period)}</span>}</div>
          <div className="min-w-0">{s(x.focus) && <p className="text-sm font-semibold text-text-primary">{s(x.focus)}</p>}{(s(x.key_content) ?? s(x.content)) && <p className="text-xs text-text-tertiary">{s(x.key_content) ?? s(x.content)}</p>}</div>
        </div></Crd>); })}</div></Anim>}
    </div>
  );
}

function BudgetTab({ d }: { d: Record<string, unknown> }) {
  const total = s(d.total_budget) ?? s(d.total), cats = ar(d.categories ?? d.allocation);
  const ph = ar(d.spend_phasing ?? d.phasing), just = ar(d.justification ?? d.rationale);
  return (
    <div className="space-y-6">
      {total && <Anim><Crd className="pt-6"><div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-accent to-brand-accent/40 rounded-t-xl" /><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary block mb-1">Total Budget</span><span className="text-2xl font-extrabold text-text-primary leading-tight">{total}</span></Crd></Anim>}
      {cats.length > 0 && <Anim delay={80}><SLabel>Budget Allocation</SLabel><Crd>{cats.map((c, i) => { const x = rc(c); const det = s(x.detail) ?? s(x.description); return <PBar key={i} label={`${s(x.category) ?? s(x.name) ?? `Category ${i + 1}`}${det ? ` -- ${det}` : ""}`} pct={nu(x.percentage) ?? nu(x.pct) ?? 0} />; })}</Crd></Anim>}
      {ph.length > 0 && <Anim delay={160}><SLabel>Spend Phasing</SLabel><Tbl headers={["Phase", "Weeks", "Spend", "Focus"]} rows={ph.map((p) => { const x = rc(p); return [s(x.phase) ?? "-", s(x.weeks) ?? s(x.period) ?? "-", <span className="font-semibold text-text-primary">{s(x.spend) ?? s(x.amount) ?? "-"}</span>, s(x.focus) ?? "-"]; })} /></Anim>}
      {just.length > 0 && <Anim delay={240}><SLabel>Budget Justification</SLabel><Crd><ul className="space-y-3">{just.map((j, i) => { const x = rc(j); const al = s(x.allocation) ?? s(x.category), re = s(x.reason) ?? s(x.rationale); return (
        <li key={i} className="flex items-start gap-3 text-sm text-text-secondary border-b border-surface-100 pb-3 last:border-0 last:pb-0"><span className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5 shrink-0" /><div>{al && <span className="font-semibold text-brand-accent">{al}</span>}{al && re && " -- "}{re}{!al && !re && JSON.stringify(j)}</div></li>); })}</ul></Crd></Anim>}
    </div>
  );
}

function Kpis({ d }: { d: Record<string, unknown> }) {
  const kpis = ar(d.kpi_dashboard ?? d.kpis ?? d.metrics), trigs = ar(d.optimization_triggers ?? d.triggers);
  const grouped: Record<string, { items: Record<string, unknown>[]; idx: number }> = {};
  let gIdx = 0;
  kpis.forEach((k) => { const x = rc(k); const obj = s(x.objective) ?? "General"; if (!grouped[obj]) grouped[obj] = { items: [], idx: gIdx++ }; grouped[obj].items.push(x); });
  const gColors = ["bg-blue-50", "bg-amber-50", "bg-green-50", "bg-purple-50", "bg-rose-50"];
  return (
    <div className="space-y-6">
      {kpis.length > 0 && <Anim><SLabel>KPI Dashboard</SLabel>
        <div className="overflow-x-auto rounded-lg border border-surface-100"><table className="w-full border-collapse text-sm">
          <thead><tr className="bg-brand-accent/5">{["Objective", "KPI", "Target", "Tool", "Cadence"].map((h) => <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-accent border-b border-brand-accent/10 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{Object.entries(grouped).map(([obj, { items, idx }]) => items.map((x, ri) => (
            <tr key={`${obj}-${ri}`} className={cn("hover:bg-brand-accent/[0.03] transition-colors", gColors[idx % gColors.length])}>
              {ri === 0 && <td rowSpan={items.length} className="px-4 py-3 font-semibold text-text-primary border-b border-surface-100 align-top">{obj}</td>}
              <td className="px-4 py-3 text-text-secondary border-b border-surface-100">{s(x.kpi) ?? s(x.metric) ?? "-"}</td>
              <td className="px-4 py-3 text-text-secondary border-b border-surface-100 font-semibold">{s(x.target) ?? "-"}</td>
              <td className="px-4 py-3 text-text-secondary border-b border-surface-100">{s(x.tool) ?? "-"}</td>
              <td className="px-4 py-3 text-text-secondary border-b border-surface-100">{s(x.cadence) ?? s(x.frequency) ?? "-"}</td>
            </tr>)))}</tbody>
        </table></div>
      </Anim>}
      {trigs.length > 0 && <Anim delay={80}><SLabel>Optimization Triggers</SLabel><div className="space-y-3">{trigs.map((t, i) => { const x = rc(t); return (
        <Crd key={i} className="border-l-4 border-l-amber-400"><div className="flex items-start gap-3"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><div><p className="text-sm font-semibold text-text-primary mb-0.5">{s(x.signal) ?? s(x.trigger) ?? "-"}</p><p className="text-xs text-text-tertiary leading-relaxed">{s(x.action) ?? s(x.response) ?? "-"}</p></div></div></Crd>); })}</div></Anim>}
    </div>
  );
}

function TimelineTab({ d }: { d: Record<string, unknown> }) {
  const phases = ar(d.phases ?? d.timeline), raci = ar(d.raci_matrix ?? d.raci);
  return (
    <div className="space-y-6">
      {phases.length > 0 && <Anim><SLabel>Phase Timeline</SLabel><div className="relative">
        <div className="hidden lg:block absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-accent via-brand-accent/40 to-transparent" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{phases.map((p, i) => { const x = rc(p); const items = ar(x.items ?? x.activities ?? x.tasks); return (
          <Anim key={i} delay={i * 60}><Crd>
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-accent to-brand-accent/30" />
            <div className="flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span><p className="text-sm font-bold text-text-primary truncate">{s(x.phase) ?? s(x.name) ?? `Phase ${i + 1}`}</p></div>
            {(s(x.weeks) ?? s(x.period)) && <p className="text-[11px] text-text-tertiary mb-2">{s(x.weeks) ?? s(x.period)}</p>}
            {items.length > 0 && <ul className="space-y-1.5">{items.map((it, j) => <li key={j} className="flex items-start gap-2 text-xs text-text-secondary"><ChevronRight className="w-3 h-3 text-brand-accent mt-0.5 shrink-0" />{typeof it === "string" ? it : s(rc(it).task) ?? s(rc(it).description) ?? JSON.stringify(it)}</li>)}</ul>}
          </Crd></Anim>); })}</div>
      </div></Anim>}
      {raci.length > 0 && (() => { const first = rc(raci[0]); const roles = Object.keys(first).filter((k) => k !== "task" && k !== "activity"); return (
        <Anim delay={phases.length * 60 + 80}><SLabel>RACI Matrix</SLabel>
          <div className="overflow-x-auto rounded-lg border border-surface-100"><table className="w-full border-collapse text-sm">
            <thead><tr className="bg-brand-accent/5"><th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-accent border-b border-brand-accent/10">Task</th>{roles.map((k) => <th key={k} className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-accent border-b border-brand-accent/10 whitespace-nowrap">{k.replace(/_/g, " ")}</th>)}</tr></thead>
            <tbody>{raci.map((row, ri) => { const x = rc(row); return (
              <tr key={ri} className={cn("hover:bg-brand-accent/[0.03]", ri % 2 === 0 ? "bg-surface-white" : "bg-surface-50/50")}>
                <td className="px-4 py-3 text-text-secondary border-b border-surface-100 font-medium">{s(x.task) ?? s(x.activity) ?? "-"}</td>
                {roles.map((k) => <td key={k} className="px-4 py-3 border-b border-surface-100 text-center"><RaciCell value={s(x[k]) ?? "-"} /></td>)}
              </tr>); })}</tbody>
          </table></div>
          <p className="text-[10px] text-text-tertiary mt-2 tracking-wide"><span className="font-bold text-blue-600">R</span> = Responsible &middot; <span className="font-bold text-red-600">A</span> = Accountable &middot; <span className="font-bold text-amber-600">C</span> = Consulted &middot; <span className="font-bold text-text-tertiary">I</span> = Informed</p>
        </Anim>); })()}
    </div>
  );
}

function RisksTab({ d }: { d: Record<string, unknown> }) {
  const risks = ar(d.risk_register ?? d.risks), tp = ar(d.dealer_talking_points ?? d.talking_points ?? d.countermessages);
  return (
    <div className="space-y-6">
      {risks.length > 0 && <Anim><SLabel>Risk Register</SLabel><Tbl headers={["Risk", "Likelihood", "Impact", "Mitigation"]} rows={risks.map((rk) => { const x = rc(rk); return [s(x.risk) ?? s(x.description) ?? "-", sevBdg(x.likelihood), sevBdg(x.impact), s(x.mitigation) ?? s(x.response) ?? "-"]; })} /></Anim>}
      {tp.length > 0 && <Anim delay={80}><SLabel>Dealer Talking Points</SLabel><div className="space-y-3">{tp.map((t, i) => { const x = rc(t); return (
        <Crd key={i} accent><div className="flex items-start gap-3"><MessageSquare className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" /><div><p className="text-sm font-semibold text-text-primary mb-1">{s(x.objection) ?? s(x.question) ?? `Point ${i + 1}`}</p><p className="text-xs text-text-secondary leading-relaxed">{s(x.response) ?? s(x.answer) ?? ""}</p></div></div></Crd>); })}</div></Anim>}
    </div>
  );
}

/* ── JSON editor ──────────────────────────────────────────── */
function JsonEditor({ value, onSave, onCancel, isSaving }: { value: Record<string, unknown>; onSave: (v: Record<string, unknown>) => void; onCancel: () => void; isSaving: boolean }) {
  const [raw, setRaw] = useState(() => JSON.stringify(value, null, 2));
  const [err, setErr] = useState<string | null>(null);
  const save = () => { try { const p = JSON.parse(raw); if (typeof p !== "object" || p === null || Array.isArray(p)) { setErr("Root must be a JSON object."); return; } setErr(null); onSave(p as Record<string, unknown>); } catch (e) { setErr((e as Error).message); } };
  return (
    <Anim><div className="space-y-3 bg-gradient-to-br from-surface-white to-surface-50 rounded-xl border border-surface-100 p-4 shadow-sm">
      <textarea value={raw} onChange={(e) => { setRaw(e.target.value); setErr(null); }} rows={18} spellCheck={false} className={cn("w-full px-4 py-3 text-xs font-mono leading-relaxed rounded-lg resize-y", "bg-[#1e1e2e] text-[#cdd6f4] border border-surface-200", "focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent")} />
      {err && <p className="text-xs text-red-600 font-medium">Parse error: {err}</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={save} disabled={isSaving} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-accent text-text-inverse hover:bg-brand-accent-hover disabled:opacity-60 transition-colors">{isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save Changes</button>
        <button type="button" onClick={onCancel} disabled={isSaving} className="px-4 py-2 text-xs font-medium rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 disabled:opacity-60 transition-colors">Cancel</button>
      </div>
    </div></Anim>
  );
}

/* ── main ─────────────────────────────────────────────────── */
const TAB_RENDERER: Record<TabKey, React.FC<{ d: Record<string, unknown> }>> = {
  executive_summary: ExecSummary, target_audience: Audience, strategic_framework: Strategy,
  campaign_architecture: CampaignTab, channel_content_plan: Channels, budget_allocation: BudgetTab,
  kpi_measurement: Kpis, timeline_roadmap: TimelineTab, risks_countermessages: RisksTab,
};

export default function PlanDashboard({ plan, onEditSection, onResetSection, status, isEditing }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("executive_summary");
  const [editingTab, setEditingTab] = useState<TabKey | null>(null);

  if (status === "generating") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-accent to-brand-accent/40 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-text-inverse animate-spin" />
        </div>
        <div className="text-center"><p className="text-sm font-semibold text-text-primary mb-1">Generating Marketing Plan</p><p className="text-xs text-text-tertiary">Analyzing inputs and crafting strategy...</p></div>
      </div>
    );
  }

  const data = rc(plan[activeTab]);
  const readOnly = activeTab === "executive_summary";
  const editing = editingTab === activeTab;
  const Renderer = TAB_RENDERER[activeTab];

  return (
    <div className="space-y-5">
      <style>{FADE_CSS}</style>

      {/* pill tab bar */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 p-1 bg-surface-50 rounded-xl border border-surface-100">
          {TABS.map((tab) => { const active = tab.key === activeTab; const Icon = tab.icon; return (
            <button key={tab.key} type="button" onClick={() => { setActiveTab(tab.key); setEditingTab(null); }}
              className={cn("flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap shrink-0",
                active ? "bg-brand-accent text-text-inverse shadow-sm font-semibold" : "text-text-tertiary hover:text-text-secondary hover:bg-surface-100")}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>); })}
        </div>
      </div>

      {/* action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">{TABS.find((t) => t.key === activeTab)?.label}</h3>
          {readOnly && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-brand-accent to-pink-500 text-white"><Sparkles className="w-3 h-3" />Auto-generated</span>}
        </div>
        {!readOnly && !editing && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditingTab(activeTab)} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 hover:border-surface-300 transition-colors"><Pencil className="w-3.5 h-3.5" />Edit</button>
            <button type="button" onClick={() => { if (confirm(`Reset "${TABS.find((t) => t.key === activeTab)?.label}" to the original AI draft? Your edits will be lost.`)) onResetSection(activeTab); }} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-text-tertiary hover:bg-surface-50 hover:text-text-secondary transition-colors" title="Reset to AI Draft"><RotateCcw className="w-3.5 h-3.5" />Reset</button>
          </div>)}
        {editing && <button type="button" onClick={() => setEditingTab(null)} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-text-tertiary hover:bg-surface-50 transition-colors"><X className="w-3.5 h-3.5" />Cancel</button>}
      </div>

      {/* content with fade transition */}
      <div key={activeTab} className="min-h-[200px]" style={{ animation: "pdFadeIn 0.3s ease-out" }}>
        {editing ? <JsonEditor value={data} onSave={(v) => { onEditSection(activeTab, v); setEditingTab(null); }} onCancel={() => setEditingTab(null)} isSaving={isEditing} /> : <Renderer d={data} />}
      </div>
    </div>
  );
}
