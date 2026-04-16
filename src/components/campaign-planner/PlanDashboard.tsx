import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Pencil, RotateCcw, Save, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "executive_summary", label: "Executive Summary" },
  { key: "target_audience", label: "Target Audience" },
  { key: "strategic_framework", label: "Strategic Framework" },
  { key: "campaign_architecture", label: "Campaign" },
  { key: "channel_content_plan", label: "Channels & Content" },
  { key: "budget_allocation", label: "Budget" },
  { key: "kpi_measurement", label: "KPIs" },
  { key: "timeline_roadmap", label: "Timeline" },
  { key: "risks_countermessages", label: "Risks" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface Props {
  plan: Record<string, unknown>;
  onEditSection: (sectionKey: string, content: Record<string, unknown>) => void;
  onResetSection: (sectionKey: string) => void;
  status: string;
  isEditing: boolean;
}

/* ── safe data access ──────────────────────────────────────── */
const s = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const n = (v: unknown): number | null => (typeof v === "number" ? v : null);
const a = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const r = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/* ── micro-components ──────────────────────────────────────── */
const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-0.5 h-4 bg-brand-accent rounded-full" />
    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">{children}</span>
  </div>
);

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-surface-white rounded-xl border border-surface-100 p-5", className)}>{children}</div>
);

function Badge({ children, variant = "neutral" }: { children: React.ReactNode; variant?: string }) {
  const map: Record<string, string> = {
    neutral: "bg-surface-100 text-text-tertiary",
    red: "bg-red-50 text-red-600 border border-red-200",
    amber: "bg-amber-50 text-amber-600 border border-amber-200",
    green: "bg-green-50 text-green-700 border border-green-200",
    accent: "bg-brand-accent/10 text-brand-accent",
  };
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap", map[variant] ?? map.neutral)}>
      {children}
    </span>
  );
}

function sevBadge(v: unknown) {
  const t = (s(v) ?? "").toLowerCase();
  if (t.includes("high")) return <Badge variant="red">{s(v)}</Badge>;
  if (t.includes("med")) return <Badge variant="amber">{s(v)}</Badge>;
  if (t.includes("low")) return <Badge variant="green">{s(v)}</Badge>;
  return <Badge>{s(v) ?? "N/A"}</Badge>;
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-accent border-b border-brand-accent/20 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-surface-50" : "bg-surface-white"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2.5 text-text-secondary border-b border-surface-100 leading-relaxed">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Bar({ label, pct }: { label: string; pct: number }) {
  const p = Math.min(100, Math.max(0, pct));
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs font-semibold text-text-primary">{p.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
        <div className="h-full bg-brand-accent rounded-full transition-all duration-500" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function Fold({ title, open: init = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(init);
  return (
    <div className="border border-surface-100 rounded-xl overflow-hidden mb-2">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-text-primary bg-surface-50 hover:bg-surface-100 transition-colors text-left">
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-text-tertiary shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-tertiary shrink-0" />}
      </button>
      {open && <div className="px-4 py-3 bg-surface-white border-t border-surface-100">{children}</div>}
    </div>
  );
}

/* ── tab renderers ─────────────────────────────────────────── */

function ExecSummary({ d }: { d: Record<string, unknown> }) {
  const overview = s(d.plan_overview) ?? s(d.overview);
  const objs = a(d.smart_objectives ?? d.objectives);
  const csf = a(d.critical_success_factors ?? d.success_factors);
  return (
    <div className="space-y-6">
      {overview && <Card><Label>Plan Overview</Label><p className="text-sm text-text-secondary leading-relaxed">{overview}</p></Card>}
      {objs.length > 0 && (<><Label>SMART Objectives</Label><Table headers={["#", "Objective", "Metric", "Target", "Timeframe"]} rows={objs.map((o, i) => { const x = r(o); return [i + 1, s(x.objective) ?? s(x.description) ?? "-", s(x.metric) ?? s(x.kpi) ?? "-", s(x.target) ?? "-", s(x.timeframe) ?? s(x.timeline) ?? "-"]; })} /></>)}
      {csf.length > 0 && (
        <><Label>Critical Success Factors</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {csf.map((f, i) => { const x = r(f); return (
              <Card key={i} className="relative overflow-hidden">
                <span className="absolute top-2 right-3 text-2xl font-extrabold text-brand-accent/10">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-sm font-semibold text-text-primary mb-1">{s(x.title) ?? s(x.name) ?? `Factor ${i + 1}`}</p>
                <p className="text-xs text-text-tertiary leading-relaxed">{s(x.description) ?? s(x.detail) ?? ""}</p>
              </Card>); })}
          </div></>
      )}
    </div>
  );
}

function Audience({ d }: { d: Record<string, unknown> }) {
  const fields = ["name", "profile", "mindset", "key_anxiety", "decision_triggers", "media_behavior", "purchase_journey"] as const;
  const persona = (label: string, p: Record<string, unknown>) => (
    <Card>
      <Label>{label}</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map((f) => { const v = s(p[f]); if (!v) return null; return (
          <div key={f} className="bg-surface-50 rounded-lg p-3 border border-surface-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-accent block mb-1">{f.replace(/_/g, " ")}</span>
            <span className="text-xs text-text-secondary leading-relaxed">{v}</span>
          </div>); })}
      </div>
    </Card>
  );
  const pri = r(d.primary ?? d.primary_persona);
  const sec = r(d.secondary ?? d.secondary_persona);
  const hp = Object.keys(pri).length > 0, hs = Object.keys(sec).length > 0;
  return <div className="space-y-6">{hp && persona("Primary Persona", pri)}{hs && persona("Secondary Persona", sec)}{!hp && !hs && <p className="text-sm text-text-tertiary text-center py-8">No target audience data available.</p>}</div>;
}

function Strategy({ d }: { d: Record<string, unknown> }) {
  const pos = s(d.positioning_statement ?? d.positioning);
  const og = a(d.objectives_to_goals ?? d.objectives);
  const msg = r(d.messaging_architecture ?? d.messaging);
  const tag = s(msg.tagline); const layers = a(msg.layers ?? msg.message_layers);
  const rtbs = a(d.reasons_to_believe ?? d.rtbs);
  return (
    <div className="space-y-6">
      {pos && <Card><Label>Positioning Statement</Label><p className="text-sm font-semibold text-text-primary italic leading-relaxed">"{pos}"</p></Card>}
      {og.length > 0 && (<><Label>Objectives to Goals</Label><Table headers={["Objective", "Goal", "Metric"]} rows={og.map((o) => { const x = r(o); return [s(x.objective) ?? "-", s(x.goal) ?? "-", s(x.metric) ?? s(x.kpi) ?? "-"]; })} /></>)}
      {(tag || layers.length > 0) && (
        <><Label>Messaging Architecture</Label>
          {tag && <Card className="mb-3"><span className="text-[10px] font-bold uppercase tracking-wider text-brand-accent block mb-1">Tagline</span><p className="text-base font-semibold text-text-primary italic">"{tag}"</p></Card>}
          {layers.length > 0 && <Table headers={["Layer", "Message", "Trigger"]} rows={layers.map((l) => { const x = r(l); return [s(x.layer) ?? s(x.name) ?? "-", s(x.message) ?? s(x.content) ?? "-", s(x.trigger) ?? "-"]; })} />}
        </>
      )}
      {rtbs.length > 0 && (<><Label>Reasons to Believe</Label><ul className="space-y-1.5">{rtbs.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-text-secondary"><span className="text-brand-accent mt-0.5 shrink-0">&bull;</span>{typeof item === "string" ? item : s(r(item).text) ?? s(r(item).description) ?? JSON.stringify(item)}</li>)}</ul></>)}
    </div>
  );
}

function Campaign({ d }: { d: Record<string, unknown> }) {
  const bi = r(d.big_idea ?? d.campaign_idea);
  const hero = a(d.hero_content_pieces ?? d.hero_content);
  const rules = a(d.tactical_rules ?? d.rules_of_engagement);
  return (
    <div className="space-y-6">
      {(s(bi.title) || s(bi.description)) && (
        <Card><Label>Big Idea</Label>
          {s(bi.title) && <p className="text-lg font-bold text-text-primary mb-1">{s(bi.title)}</p>}
          {s(bi.description) && <p className="text-sm text-text-secondary leading-relaxed">{s(bi.description)}</p>}
        </Card>)}
      {hero.length > 0 && (<><Label>Hero Content Pieces</Label>{hero.map((p, i) => { const x = r(p); return (
        <Fold key={i} title={s(x.title) ?? s(x.name) ?? `Piece ${i + 1}`} open={i === 0}>
          <div className="flex flex-wrap gap-2 mb-2">{s(x.format) && <Badge variant="accent">{s(x.format)}</Badge>}{s(x.platform) && <Badge>{s(x.platform)}</Badge>}</div>
          {s(x.purpose ?? x.description) && <p className="text-xs text-text-secondary leading-relaxed">{s(x.purpose) ?? s(x.description)}</p>}
        </Fold>); })}</>)}
      {rules.length > 0 && (<><Label>Tactical Rules</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{rules.map((rl, i) => { const x = r(rl); return <Card key={i}><p className="text-sm font-semibold text-text-primary mb-1">{s(x.rule) ?? s(x.title) ?? `Rule ${i + 1}`}</p><p className="text-xs text-text-tertiary leading-relaxed">{s(x.detail) ?? s(x.description) ?? ""}</p></Card>; })}</div></>)}
    </div>
  );
}

function Channels({ d }: { d: Record<string, unknown> }) {
  const cr = a(d.channel_roles ?? d.channels);
  const pil = a(d.content_pillars ?? d.pillars);
  const cal = a(d.content_calendar ?? d.calendar);
  return (
    <div className="space-y-6">
      {cr.length > 0 && (<><Label>Channel Roles</Label><Table headers={["Channel", "Role", "Content Type", "Cadence"]} rows={cr.map((c) => { const x = r(c); return [s(x.channel) ?? "-", s(x.role) ?? "-", s(x.content_type) ?? s(x.format) ?? "-", s(x.cadence) ?? s(x.frequency) ?? "-"]; })} /></>)}
      {pil.length > 0 && (<><Label>Content Pillars</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{pil.map((p, i) => { const x = r(p); const pct = n(x.percentage) ?? n(x.pct) ?? 0; return (
        <Card key={i} className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-accent" />
          <div className="flex justify-between items-baseline mb-1"><p className="text-sm font-semibold text-text-primary">{s(x.name) ?? s(x.pillar) ?? `Pillar ${i + 1}`}</p><span className="text-lg font-extrabold text-brand-accent">{pct}%</span></div>
          <p className="text-xs text-text-tertiary leading-relaxed mb-2">{s(x.description) ?? s(x.detail) ?? ""}</p>
          <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden"><div className="h-full bg-brand-accent rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%` }} /></div>
        </Card>); })}</div></>)}
      {cal.length > 0 && (<><Label>Content Calendar</Label><Table headers={["Phase", "Weeks", "Focus", "Key Content"]} rows={cal.map((c) => { const x = r(c); return [s(x.phase) ?? "-", s(x.weeks) ?? s(x.period) ?? "-", s(x.focus) ?? "-", s(x.key_content) ?? s(x.content) ?? "-"]; })} /></>)}
    </div>
  );
}

function Budget({ d }: { d: Record<string, unknown> }) {
  const total = s(d.total_budget) ?? s(d.total);
  const cats = a(d.categories ?? d.allocation);
  const ph = a(d.spend_phasing ?? d.phasing);
  const just = a(d.justification ?? d.rationale);
  return (
    <div className="space-y-6">
      {total && <Card className="relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-accent" /><span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block mb-1">Total Budget</span><span className="text-2xl font-extrabold text-text-primary">{total}</span></Card>}
      {cats.length > 0 && (<><Label>Budget Allocation</Label>{cats.map((c, i) => { const x = r(c); return <Bar key={i} label={`${s(x.category) ?? s(x.name) ?? `Cat ${i + 1}`}${s(x.detail) ?? s(x.description) ? ` -- ${s(x.detail) ?? s(x.description)}` : ""}`} pct={n(x.percentage) ?? n(x.pct) ?? 0} />; })}</>)}
      {ph.length > 0 && (<><Label>Spend Phasing</Label><Table headers={["Phase", "Weeks", "Spend", "Focus"]} rows={ph.map((p) => { const x = r(p); return [s(x.phase) ?? "-", s(x.weeks) ?? s(x.period) ?? "-", s(x.spend) ?? s(x.amount) ?? "-", s(x.focus) ?? "-"]; })} /></>)}
      {just.length > 0 && (<><Label>Budget Justification</Label><ul className="space-y-2">{just.map((j, i) => { const x = r(j); const al = s(x.allocation) ?? s(x.category); const re = s(x.reason) ?? s(x.rationale); return <li key={i} className="text-sm text-text-secondary border-b border-surface-100 pb-2 last:border-0">{al && <span className="font-semibold text-brand-accent">{al}</span>}{al && re && " -- "}{re}{!al && !re && JSON.stringify(j)}</li>; })}</ul></>)}
    </div>
  );
}

function Kpis({ d }: { d: Record<string, unknown> }) {
  const kpis = a(d.kpi_dashboard ?? d.kpis ?? d.metrics);
  const trigs = a(d.optimization_triggers ?? d.triggers);
  return (
    <div className="space-y-6">
      {kpis.length > 0 && (<><Label>KPI Dashboard</Label><Table headers={["Objective", "KPI", "Target", "Tool", "Cadence"]} rows={kpis.map((k) => { const x = r(k); return [s(x.objective) ?? "-", s(x.kpi) ?? s(x.metric) ?? "-", s(x.target) ?? "-", s(x.tool) ?? "-", s(x.cadence) ?? s(x.frequency) ?? "-"]; })} /></>)}
      {trigs.length > 0 && (<><Label>Optimization Triggers</Label><Table headers={["Signal", "Action"]} rows={trigs.map((t) => { const x = r(t); return [s(x.signal) ?? s(x.trigger) ?? "-", s(x.action) ?? s(x.response) ?? "-"]; })} /></>)}
    </div>
  );
}

function Timeline({ d }: { d: Record<string, unknown> }) {
  const phases = a(d.phases ?? d.timeline);
  const raci = a(d.raci_matrix ?? d.raci);
  return (
    <div className="space-y-6">
      {phases.length > 0 && (<><Label>Phase Timeline</Label><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{phases.map((p, i) => { const x = r(p); const items = a(x.items ?? x.activities ?? x.tasks); return (
        <Card key={i} className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-accent" />
          <p className="text-sm font-bold text-text-primary">{s(x.phase) ?? s(x.name) ?? `Phase ${i + 1}`}</p>
          <p className="text-[11px] text-text-tertiary mb-2">{s(x.weeks) ?? s(x.period) ?? ""}</p>
          {items.length > 0 && <ul className="space-y-1">{items.map((it, j) => <li key={j} className="flex items-start gap-1.5 text-xs text-text-secondary"><span className="text-brand-accent mt-px shrink-0">&#8250;</span>{typeof it === "string" ? it : s(r(it).task) ?? s(r(it).description) ?? JSON.stringify(it)}</li>)}</ul>}
        </Card>); })}</div></>)}
      {raci.length > 0 && (() => { const first = r(raci[0]); const roles = Object.keys(first).filter((k) => k !== "task" && k !== "activity"); return (<><Label>RACI Matrix</Label><Table headers={["Task", ...roles.map((k) => k.replace(/_/g, " "))]} rows={raci.map((row) => { const x = r(row); return [s(x.task) ?? s(x.activity) ?? "-", ...roles.map((k) => s(x[k]) ?? "-")]; })} /><p className="text-[11px] text-text-tertiary mt-2">R = Responsible, A = Accountable, C = Consulted, I = Informed</p></>); })()}
    </div>
  );
}

function Risks({ d }: { d: Record<string, unknown> }) {
  const risks = a(d.risk_register ?? d.risks);
  const tp = a(d.dealer_talking_points ?? d.talking_points ?? d.countermessages);
  return (
    <div className="space-y-6">
      {risks.length > 0 && (<><Label>Risk Register</Label><Table headers={["Risk", "Likelihood", "Impact", "Mitigation"]} rows={risks.map((rk) => { const x = r(rk); return [s(x.risk) ?? s(x.description) ?? "-", sevBadge(x.likelihood), sevBadge(x.impact), s(x.mitigation) ?? s(x.response) ?? "-"]; })} /></>)}
      {tp.length > 0 && (<><Label>Dealer Talking Points</Label><div className="space-y-3">{tp.map((t, i) => { const x = r(t); return <Card key={i}><p className="text-sm font-semibold text-text-primary mb-1">{s(x.objection) ?? s(x.question) ?? `Point ${i + 1}`}</p><p className="text-xs text-text-secondary leading-relaxed">{s(x.response) ?? s(x.answer) ?? ""}</p></Card>; })}</div></>)}
    </div>
  );
}

/* ── JSON editor ───────────────────────────────────────────── */

function JsonEditor({ value, onSave, onCancel, isSaving }: { value: Record<string, unknown>; onSave: (v: Record<string, unknown>) => void; onCancel: () => void; isSaving: boolean }) {
  const [raw, setRaw] = useState(() => JSON.stringify(value, null, 2));
  const [err, setErr] = useState<string | null>(null);
  const save = () => { try { const p = JSON.parse(raw); if (typeof p !== "object" || p === null || Array.isArray(p)) { setErr("Root must be a JSON object."); return; } setErr(null); onSave(p as Record<string, unknown>); } catch (e) { setErr((e as Error).message); } };
  return (
    <div className="space-y-3">
      <textarea value={raw} onChange={(e) => { setRaw(e.target.value); setErr(null); }} rows={18} className="w-full px-4 py-3 text-xs font-mono text-text-primary bg-surface-white border border-surface-200 rounded-xl focus:outline-none focus:border-brand-accent resize-y" spellCheck={false} />
      {err && <p className="text-xs text-red-600">Parse error: {err}</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={save} disabled={isSaving} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-accent text-text-inverse hover:bg-brand-accent-hover disabled:opacity-60 transition-colors">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save</button>
        <button type="button" onClick={onCancel} disabled={isSaving} className="px-4 py-2 text-xs font-medium rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 disabled:opacity-60 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

/* ── main ──────────────────────────────────────────────────── */

const TAB_RENDERER: Record<TabKey, React.FC<{ d: Record<string, unknown> }>> = {
  executive_summary: ExecSummary, target_audience: Audience, strategic_framework: Strategy,
  campaign_architecture: Campaign, channel_content_plan: Channels, budget_allocation: Budget,
  kpi_measurement: Kpis, timeline_roadmap: Timeline, risks_countermessages: Risks,
};

export default function PlanDashboard({ plan, onEditSection, onResetSection, status, isEditing }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("executive_summary");
  const [editingTab, setEditingTab] = useState<TabKey | null>(null);

  if (status === "generating") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
        <p className="text-sm font-medium text-text-secondary">Generating Marketing Plan...</p>
      </div>
    );
  }

  const data = r(plan[activeTab]);
  const readOnly = activeTab === "executive_summary";
  const editing = editingTab === activeTab;
  const Renderer = TAB_RENDERER[activeTab];

  return (
    <div className="space-y-4">
      {/* tab bar */}
      <div className="border-b border-surface-100 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1">
          {TABS.map((tab) => { const active = tab.key === activeTab; return (
            <button key={tab.key} type="button" onClick={() => { setActiveTab(tab.key); setEditingTab(null); }}
              className={cn("relative px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all duration-200 whitespace-nowrap shrink-0", active ? "bg-surface-100 text-text-primary font-semibold" : "text-text-tertiary hover:text-text-secondary hover:bg-surface-50")}>
              {tab.label}
              {active && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-accent rounded-full" />}
            </button>); })}
        </div>
      </div>

      {/* action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">{TABS.find((t) => t.key === activeTab)?.label}</h3>
          {readOnly && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-100 text-text-tertiary"><ShieldCheck className="w-3 h-3" />Auto-generated</span>}
        </div>
        {!readOnly && !editing && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditingTab(activeTab)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 transition-colors"><Pencil className="w-3 h-3" />Edit</button>
            <button type="button" onClick={() => { if (confirm(`Reset "${TABS.find((t) => t.key === activeTab)?.label}" to the original AI draft? Your edits will be lost.`)) onResetSection(activeTab); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-text-tertiary hover:bg-surface-50 hover:text-text-secondary transition-colors" title="Reset to AI Draft"><RotateCcw className="w-3 h-3" />Reset to AI Draft</button>
          </div>
        )}
        {editing && <button type="button" onClick={() => setEditingTab(null)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-text-tertiary hover:bg-surface-50 transition-colors"><X className="w-3 h-3" />Cancel Edit</button>}
      </div>

      {/* content */}
      <div className="min-h-[200px]">
        {editing ? <JsonEditor value={data} onSave={(v) => { onEditSection(activeTab, v); setEditingTab(null); }} onCancel={() => setEditingTab(null)} isSaving={isEditing} /> : <Renderer d={data} />}
      </div>
    </div>
  );
}
