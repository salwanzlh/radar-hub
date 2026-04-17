import { useState, type ReactNode } from "react";
import {
  Calendar, DollarSign, Lightbulb, Megaphone, MessageSquare,
  Shield, Target, TrendingUp, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FADE_CSS = `@keyframes pdFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;

const TABS = [
  { key: "objectives_smart",           label: "Objectives",        icon: Target },
  { key: "target_audience",            label: "Audience",          icon: Users },
  { key: "value_proposition",          label: "Value Prop",        icon: Lightbulb },
  { key: "channels_tactics",           label: "Channels",          icon: Megaphone },
  { key: "budget_timeline",            label: "Budget & Timeline", icon: DollarSign },
  { key: "kpis_measurement",           label: "KPIs",              icon: TrendingUp },
  { key: "swot_competitive",           label: "SWOT",              icon: Shield },
  { key: "messaging_content_strategy", label: "Messaging",         icon: MessageSquare },
  { key: "implementation_roadmap",     label: "Roadmap",           icon: Calendar },
] as const;
type TabKey = (typeof TABS)[number]["key"];

interface Props {
  plan: Record<string, unknown>;
  onEditSection: (sectionKey: string, content: Record<string, unknown>) => void;
  onResetSection: (sectionKey: string) => void;
  status: string;
  isEditing: boolean;
  keyVisual?: {
    image_base64?: string | null;
    format?: string | null;
    error?: string | null;
    generated_at?: string | null;
  } | null;
  onRegenerateKv?: () => void;
  isRegeneratingKv?: boolean;
}

// Safe-data helpers
const s = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;
const nu = (v: unknown): number | null => (typeof v === "number" ? v : null);
const ar = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rc = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

// Shared micro-components
const SLabel = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-brand-accent to-brand-accent/40" />
    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">{children}</span>
  </div>
);

export default function PlanDashboardV2({
  plan,
  onEditSection: _onEditSection,
  onResetSection: _onResetSection,
  status: _status,
  isEditing: _isEditing,
  keyVisual: _keyVisual,
  onRegenerateKv: _onRegenerateKv,
  isRegeneratingKv: _isRegeneratingKv,
}: Props) {
  const [active, setActive] = useState<TabKey>("objectives_smart");

  return (
    <div className="space-y-6">
      <style>{FADE_CSS}</style>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2 border-b border-surface-100 pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
              active === t.key
                ? "bg-brand-accent text-text-inverse"
                : "text-text-secondary hover:bg-surface-100",
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ animation: `pdFadeIn 0.4s ease-out both` }}>
        {active === "objectives_smart"           && <ObjectivesTab section={rc(plan.objectives_smart)} />}
        {active === "target_audience"            && <AudienceTab section={rc(plan.target_audience)} />}
        {active === "value_proposition"          && <ValuePropTab section={rc(plan.value_proposition)} />}
        {active === "channels_tactics"           && <ChannelsTab section={rc(plan.channels_tactics)} />}
        {active === "budget_timeline"            && <BudgetTimelineTab section={rc(plan.budget_timeline)} />}
        {active === "kpis_measurement"           && <KpisTab section={rc(plan.kpis_measurement)} />}
        {active === "swot_competitive"           && <SwotTab section={rc(plan.swot_competitive)} />}
        {active === "messaging_content_strategy" && <MessagingTab section={rc(plan.messaging_content_strategy)} />}
        {active === "implementation_roadmap"     && <RoadmapTab section={rc(plan.implementation_roadmap)} />}
      </div>
    </div>
  );
}

/* ─── Tab 1: Objectives (SMART) ─────────────────────────────────────── */

function ObjectivesTab({ section }: { section: Record<string, unknown> }) {
  const kpiHighlights = ar(section.kpi_highlights) as Array<Record<string, unknown>>;
  const smartObjectives = ar(section.smart_objectives) as Array<Record<string, unknown>>;

  const deltaClass = (d: unknown) => {
    const t = (s(d) ?? "").toLowerCase();
    if (t === "neg") return "bg-red-100 text-red-700";
    if (t === "warn") return "bg-amber-100 text-amber-700";
    return "bg-green-100 text-green-700";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiHighlights.map((kpi, i) => (
          <div key={i} className="bg-surface-white rounded-xl p-4 border border-surface-100 shadow-sm">
            <div className="text-3xl font-bold text-text-primary tabular-nums">{s(kpi.value) ?? "\u2014"}</div>
            <div className="text-xs text-text-tertiary mt-1">{s(kpi.label) ?? ""}</div>
            {s(kpi.delta) && (
              <span className={cn(
                "inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase",
                deltaClass(kpi.delta),
              )}>
                {s(kpi.delta)}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>SMART Objectives</SLabel>
        <ul className="space-y-3 mt-2">
          {smartObjectives.map((obj, i) => (
            <li key={i} className="border-l-2 border-brand-accent/30 pl-3">
              <div className="text-sm font-semibold text-text-primary">{s(obj.objective) ?? ""}</div>
              <div className="text-xs text-text-secondary mt-1">
                <span className="font-medium">Metric:</span> {s(obj.metric) ?? "\u2014"}{" \u2022 "}
                <span className="font-medium">Target:</span> {s(obj.target) ?? "\u2014"}{" \u2022 "}
                <span className="font-medium">Timeframe:</span> {s(obj.timeframe) ?? "\u2014"}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── Tab 2: Target Audience ────────────────────────────────────────── */

function AudienceTab({ section }: { section: Record<string, unknown> }) {
  const primary = rc(section.primary);
  const secondary = ar(section.secondary) as Array<Record<string, unknown>>;
  const bars = ar(section.mindset_risk_bars) as Array<Record<string, unknown>>;

  const barColor = (sev: unknown) => {
    const t = (s(sev) ?? "").toLowerCase();
    if (t.includes("high")) return "bg-red-500";
    if (t.includes("medium")) return "bg-amber-500";
    return "bg-green-500";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Primary Audience</SLabel>
        <h4 className="text-lg font-bold text-text-primary mt-2">{s(primary.name) ?? "\u2014"}</h4>
        <div className="space-y-2 mt-3 text-sm text-text-secondary">
          <p><span className="font-medium text-text-primary">Profile:</span> {s(primary.profile) ?? "\u2014"}</p>
          <p><span className="font-medium text-text-primary">Mindset:</span> <em>&quot;{s(primary.mindset) ?? "\u2014"}&quot;</em></p>
          <p><span className="font-medium text-text-primary">Key anxiety:</span> {s(primary.key_anxiety) ?? "\u2014"}</p>
          <p><span className="font-medium text-text-primary">Decision triggers:</span> {s(primary.decision_triggers) ?? "\u2014"}</p>
          <p><span className="font-medium text-text-primary">Media behavior:</span> {s(primary.media_behavior) ?? "\u2014"}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
          <SLabel>Secondary Audiences</SLabel>
          <ul className="space-y-2 mt-2 text-sm">
            {secondary.map((a, i) => (
              <li key={i}>
                <span className="font-medium text-text-primary">{s(a.name) ?? "\u2014"}:</span>{" "}
                <span className="text-text-secondary">{s(a.description) ?? "\u2014"}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
          <SLabel>Mindset &amp; Risk</SLabel>
          <div className="space-y-3 mt-3">
            {bars.map((b, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">{s(b.label) ?? "\u2014"}</span>
                  <span className="text-text-primary font-medium">{s(b.severity) ?? "\u2014"}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", barColor(b.severity))}
                    style={{ width: `${Math.min(100, Math.max(0, nu(b.percentage) ?? 0))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab 3: Value Proposition ──────────────────────────────────────── */

function ValuePropTab({ section }: { section: Record<string, unknown> }) {
  const pillars = ar(section.reframing_pillars);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-brand-accent/10 to-surface-50 rounded-xl p-6 border border-brand-accent/20">
        <SLabel>Core Statement</SLabel>
        <p className="text-base font-semibold text-text-primary mt-2 leading-relaxed">
          {s(section.core_statement) ?? "\u2014"}
        </p>
      </div>

      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Reframing Pillars</SLabel>
        <ul className="list-disc list-inside space-y-1 mt-3 text-sm text-text-secondary">
          {pillars.map((p, i) => (<li key={i}>{s(p) ?? ""}</li>))}
        </ul>
      </div>

      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Positioning Statement</SLabel>
        <p className="text-sm text-text-primary italic mt-2 leading-relaxed">
          {s(section.positioning_statement) ?? "\u2014"}
        </p>
      </div>
    </div>
  );
}

/* ─── Tab 4: Channels & Tactics ─────────────────────────────────────── */

function ChannelsTab({ section }: { section: Record<string, unknown> }) {
  const channels = ar(section.channels) as Array<Record<string, unknown>>;
  const assets = ar(section.content_assets) as Array<Record<string, unknown>>;
  const rules = ar(section.tactical_rules) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((g, i) => (
          <div key={i} className="bg-surface-white rounded-xl p-5 border border-surface-100">
            <SLabel>{s(g.channel_group) ?? "\u2014"}</SLabel>
            <ul className="list-disc list-inside space-y-1 mt-3 text-sm text-text-secondary">
              {ar(g.items).map((item, j) => (<li key={j}>{s(item) ?? ""}</li>))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Content Assets (Next 2 Weeks)</SLabel>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left py-2 px-3 font-medium text-text-tertiary">Asset</th>
                <th className="text-left py-2 px-3 font-medium text-text-tertiary">Purpose</th>
                <th className="text-left py-2 px-3 font-medium text-text-tertiary">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a, i) => (
                <tr key={i} className="border-b border-surface-100/50">
                  <td className="py-2 px-3 font-medium text-text-primary">{s(a.asset) ?? "\u2014"}</td>
                  <td className="py-2 px-3 text-text-secondary">{s(a.purpose) ?? "\u2014"}</td>
                  <td className="py-2 px-3 text-text-tertiary">{s(a.deadline) ?? "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Tactical Rules</SLabel>
        <ul className="space-y-3 mt-3">
          {rules.map((r, i) => (
            <li key={i} className="border-l-2 border-brand-accent/30 pl-3">
              <div className="text-sm font-semibold text-text-primary">{s(r.rule) ?? "\u2014"}</div>
              <div className="text-xs text-text-secondary mt-1">{s(r.detail) ?? "\u2014"}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── Tab 5: Budget & Timeline ──────────────────────────────────────── */

function BudgetTimelineTab({ section }: { section: Record<string, unknown> }) {
  const allocation = ar(section.budget_allocation) as Array<Record<string, unknown>>;
  const phases = ar(section.phases) as Array<Record<string, unknown>>;
  const [activePhase, setActivePhase] = useState<number>(0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Budget Allocation</SLabel>
        <div className="mt-2 mb-4 text-sm text-text-secondary">
          Total: <span className="font-semibold text-text-primary">{s(section.total_budget) ?? "\u2014"}</span>
        </div>
        <div className="space-y-3">
          {allocation.map((a, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">{s(a.category) ?? "\u2014"}</span>
                <span className="text-text-primary font-medium">
                  {nu(a.percentage) ?? 0}%{" \u00b7 "}{s(a.amount) ?? "\u2014"}
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                <div
                  className="h-full bg-brand-accent rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, nu(a.percentage) ?? 0))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Implementation Timeline</SLabel>
        <div className="flex flex-wrap gap-2 mt-3 mb-4">
          {phases.map((p, i) => (
            <button
              key={i}
              onClick={() => setActivePhase(i)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                activePhase === i
                  ? "bg-brand-accent text-text-inverse border-brand-accent"
                  : "bg-surface-white text-text-secondary border-surface-200 hover:bg-surface-100",
              )}
            >
              {s(p.phase) ?? `Phase ${i + 1}`}
            </button>
          ))}
        </div>
        {phases[activePhase] && (
          <div>
            <div className="text-xs text-text-tertiary mb-2">{s(phases[activePhase].focus) ?? ""}</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
              {ar(phases[activePhase].items).map((item, j) => (<li key={j}>{s(item) ?? ""}</li>))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab 6: KPIs & Measurement ─────────────────────────────────────── */

function KpisTab({ section }: { section: Record<string, unknown> }) {
  const kpiTable = ar(section.kpi_table) as Array<Record<string, unknown>>;
  const progress = ar(section.progress_bars) as Array<Record<string, unknown>>;
  const cadence = ar(section.cadence) as Array<Record<string, unknown>>;

  const barColor = (c: unknown) => {
    const t = (s(c) ?? "blue").toLowerCase();
    if (t === "red") return "bg-red-500";
    if (t === "amber") return "bg-amber-500";
    if (t === "green") return "bg-green-500";
    return "bg-blue-500";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
          <SLabel>Success Metrics</SLabel>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left py-2 px-3 font-medium text-text-tertiary">Area</th>
                  <th className="text-left py-2 px-3 font-medium text-text-tertiary">Metric</th>
                  <th className="text-left py-2 px-3 font-medium text-text-tertiary">Target</th>
                </tr>
              </thead>
              <tbody>
                {kpiTable.map((k, i) => (
                  <tr key={i} className="border-b border-surface-100/50">
                    <td className="py-2 px-3 font-medium text-text-primary">{s(k.kpi_area) ?? "\u2014"}</td>
                    <td className="py-2 px-3 text-text-secondary">{s(k.metric) ?? "\u2014"}</td>
                    <td className="py-2 px-3 text-text-tertiary">{s(k.target) ?? "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
          <SLabel>Progress to Watch</SLabel>
          <div className="space-y-3 mt-3">
            {progress.map((p, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">{s(p.label) ?? "\u2014"}</span>
                  <span className="text-text-primary font-medium">{s(p.target_label) ?? "\u2014"}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", barColor(p.color))}
                    style={{ width: `${Math.min(100, Math.max(0, nu(p.percentage) ?? 0))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Measurement Cadence</SLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          {cadence.map((c, i) => (
            <div key={i}>
              <div className="text-sm font-semibold text-text-primary">{s(c.frequency) ?? "\u2014"}</div>
              <ul className="list-disc list-inside text-xs text-text-secondary mt-1 space-y-0.5">
                {ar(c.items).map((it, j) => (<li key={j}>{s(it) ?? ""}</li>))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Tab 7: SWOT & Competitive View ────────────────────────────────── */

function SwotTab({ section }: { section: Record<string, unknown> }) {
  const quadrants = [
    { key: "strengths",     label: "Strengths",     bg: "bg-green-50 border-green-200" },
    { key: "weaknesses",    label: "Weaknesses",    bg: "bg-red-50 border-red-200" },
    { key: "opportunities", label: "Opportunities", bg: "bg-blue-50 border-blue-200" },
    { key: "threats",       label: "Threats",       bg: "bg-amber-50 border-amber-200" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quadrants.map((q) => {
          const items = ar(section[q.key]);
          return (
            <div key={q.key} className={cn("rounded-xl p-5 border", q.bg)}>
              <h4 className="text-sm font-bold text-text-primary mb-2">{q.label}</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
                {items.map((it, i) => (<li key={i}>{s(it) ?? ""}</li>))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Competitive Context</SLabel>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {s(section.competitive_context) ?? "\u2014"}
        </p>
      </div>
    </div>
  );
}

/* ─── Tab 8: Messaging & Content Strategy ───────────────────────────── */

function MessagingTab({ section }: { section: Record<string, unknown> }) {
  const tone = ar(section.tone);
  const avoid = ar(section.avoid);
  const pillars = ar(section.message_pillars) as Array<Record<string, unknown>>;
  const talkingPoints = ar(section.dealer_talking_points) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-brand-accent/10 to-surface-50 rounded-xl p-6 border border-brand-accent/20">
        <SLabel>Core Message</SLabel>
        <p className="text-base font-semibold text-text-primary mt-2 leading-relaxed">
          &quot;{s(section.core_message) ?? "\u2014"}&quot;
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
          <SLabel>Tone</SLabel>
          <div className="flex flex-wrap gap-2 mt-3">
            {tone.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-accent/10 text-brand-accent ring-1 ring-brand-accent/20"
              >
                {s(t) ?? ""}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
          <SLabel>Avoid</SLabel>
          <ul className="list-disc list-inside space-y-1 mt-3 text-sm text-text-secondary">
            {avoid.map((a, i) => (<li key={i}>{s(a) ?? ""}</li>))}
          </ul>
        </div>
      </div>

      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Message Pillars</SLabel>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left py-2 px-3 font-medium text-text-tertiary">Pillar</th>
                <th className="text-left py-2 px-3 font-medium text-text-tertiary">What to Say</th>
              </tr>
            </thead>
            <tbody>
              {pillars.map((p, i) => (
                <tr key={i} className="border-b border-surface-100/50">
                  <td className="py-2 px-3 font-medium text-text-primary">{s(p.pillar) ?? "\u2014"}</td>
                  <td className="py-2 px-3 text-text-secondary">{s(p.what_to_say) ?? "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Dealer Talking Points</SLabel>
        <div className="space-y-3 mt-3">
          {talkingPoints.map((tp, i) => (
            <div key={i} className="border-l-2 border-brand-accent/30 pl-3">
              <div className="text-xs font-semibold text-brand-accent uppercase tracking-wider">
                {s(tp.stage) ?? "\u2014"}
              </div>
              <p className="text-sm text-text-secondary mt-1 italic">
                &quot;{s(tp.script) ?? "\u2014"}&quot;
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Tab 9: Implementation Roadmap ─────────────────────────────────── */

function RoadmapTab({ section }: { section: Record<string, unknown> }) {
  const workstreams = ar(section.workstreams) as Array<Record<string, unknown>>;
  const steps = ar(section.strategic_recommendation_steps) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Workstreams &amp; Deadlines</SLabel>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left py-2 px-3 font-medium text-text-tertiary">Workstream</th>
                <th className="text-left py-2 px-3 font-medium text-text-tertiary">Owner</th>
                <th className="text-left py-2 px-3 font-medium text-text-tertiary">Deliverable</th>
                <th className="text-left py-2 px-3 font-medium text-text-tertiary">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {workstreams.map((w, i) => (
                <tr key={i} className="border-b border-surface-100/50">
                  <td className="py-2 px-3 font-medium text-text-primary">{s(w.workstream) ?? "\u2014"}</td>
                  <td className="py-2 px-3 text-text-secondary">{s(w.owner) ?? "\u2014"}</td>
                  <td className="py-2 px-3 text-text-secondary">{s(w.deliverable) ?? "\u2014"}</td>
                  <td className="py-2 px-3 text-text-tertiary">{s(w.deadline) ?? "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
        <SLabel>Strategic Recommendation Steps</SLabel>
        <ol className="mt-3 space-y-3">
          {steps.map((st, i) => (
            <li key={i} className="flex gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-text-primary text-text-inverse flex items-center justify-center text-xs font-bold">
                {nu(st.step_number) ?? i + 1}
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">{s(st.title) ?? "\u2014"}</div>
                <div className="text-xs text-text-secondary mt-0.5">{s(st.description) ?? "\u2014"}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
