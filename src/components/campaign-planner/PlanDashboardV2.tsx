import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import {
  AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Calendar, CheckCircle2, Circle,
  DollarSign, Loader2, Megaphone, MessageSquare, RotateCcw, Shield,
  Target, TrendingUp, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FADE_CSS = `@keyframes pdFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;

const TABS = [
  { key: "overview",            label: "Overview",             icon: Target },
  { key: "audience_messaging",  label: "Audience & Messaging", icon: Users },
  { key: "channels_tactics",    label: "Channels & Tactics",   icon: Megaphone },
  { key: "budget_timeline",     label: "Budget & Timeline",    icon: DollarSign },
  { key: "kpis_measurement",    label: "KPIs & Measurement",   icon: TrendingUp },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

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

// ── Safe-data helpers ────────────────────────────────────────────────
const s = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;
const nu = (v: unknown): number | null => (typeof v === "number" ? v : null);
const ar = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rc = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const parseDeadlineDays = (v: unknown): number | null => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = v.match(/(\d+)\s*(day|d)/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
};

// ── Micro-components ─────────────────────────────────────────────────
const SLabel = ({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "pink" }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className={cn(
      "w-1 h-4 rounded-full bg-gradient-to-b",
      tone === "pink" ? "from-rose-500 to-rose-300" : "from-brand-accent to-brand-accent/40",
    )} />
    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">{children}</span>
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: IconType; title: string; subtitle?: string }) => (
  <div className="flex items-baseline gap-3 pb-2 border-b border-surface-100">
    <Icon className="w-4 h-4 text-brand-accent self-center" />
    <h3 className="text-sm font-bold uppercase tracking-wide text-text-primary">{title}</h3>
    {subtitle && <span className="text-xs text-text-tertiary">{subtitle}</span>}
  </div>
);

// ── Key Visual card — 2-column (hero image + campaign panel) ─────────
function KeyVisualCard({
  keyVisual,
  campaignName,
  campaignTagline,
  onRegenerate,
  isRegenerating,
}: {
  keyVisual: Props["keyVisual"];
  campaignName: string | null;
  campaignTagline: string | null;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  const hasImage = keyVisual?.image_base64;
  const hasError = keyVisual?.error;
  const hasCampaign = campaignName || campaignTagline;

  return (
    <div className="bg-surface-white rounded-xl border border-surface-100 overflow-hidden">
      <div className="px-5 pt-4">
        <SLabel>Key Visual</SLabel>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        {/* Hero image — left (3/5) */}
        <div className="lg:col-span-3 p-5 pt-0">
          <div className="relative group rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-700 min-h-[180px] flex items-center justify-center">
            {hasImage ? (
              <>
                <img
                  src={`data:image/${keyVisual?.format || "png"};base64,${keyVisual?.image_base64}`}
                  alt="Campaign Key Visual"
                  className="w-full h-full object-cover"
                />
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 hover:bg-black/80 disabled:opacity-50"
                  >
                    {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    {isRegenerating ? "Generating..." : "Regenerate"}
                  </button>
                )}
              </>
            ) : hasError ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center px-4">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <p className="text-sm text-slate-200">{keyVisual?.error}</p>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="px-4 py-2 rounded-lg bg-brand-accent text-white text-xs font-semibold hover:bg-brand-accent/90 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Retry
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="text-slate-400 text-xs tracking-widest italic">AI-generated hero</span>
                <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Campaign panel — right (2/5), pink */}
        <div className="lg:col-span-2 p-5 pt-0">
          <div className="h-full min-h-[180px] rounded-lg p-5 bg-gradient-to-br from-rose-100 to-rose-50 border border-rose-200 flex flex-col justify-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-500 mb-3">Campaign</div>
            {campaignName ? (
              <p className="text-2xl font-extrabold text-rose-900 leading-tight tracking-tight mb-2">
                &ldquo;{campaignName}&rdquo;
              </p>
            ) : (
              <p className="text-lg italic text-rose-400 mb-2">Campaign name pending</p>
            )}
            {campaignTagline ? (
              <p className="text-sm text-rose-700 leading-relaxed italic">{campaignTagline}</p>
            ) : (
              !hasCampaign && (
                <p className="text-xs text-rose-400">Regenerate the plan to produce the campaign hero copy.</p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Main dashboard
// ════════════════════════════════════════════════════════════════════
export default function PlanDashboardV2({
  plan,
  onEditSection: _onEditSection,
  onResetSection: _onResetSection,
  status,
  isEditing: _isEditing,
  keyVisual,
  onRegenerateKv,
  isRegeneratingKv,
}: Props) {
  const [active, setActive] = useState<TabKey>("overview");

  const messaging = rc(plan.messaging_content_strategy);
  const campaignName = s(messaging.campaign_name);
  const campaignTagline = s(messaging.campaign_tagline);

  // Skeleton while plan is being (re)generated — UX priority over showing stale data.
  // Also kicks in on first-load if plan object is completely empty.
  const planIsEmpty = Object.keys(plan).length === 0;
  if (status === "generating" || planIsEmpty) {
    return <PlanSkeleton />;
  }

  return (
    <div className="space-y-6">
      <style>{FADE_CSS}</style>

      {keyVisual !== undefined && (
        <KeyVisualCard
          keyVisual={keyVisual}
          campaignName={campaignName}
          campaignTagline={campaignTagline}
          onRegenerate={onRegenerateKv}
          isRegenerating={isRegeneratingKv}
        />
      )}

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

      <div style={{ animation: "pdFadeIn 0.4s ease-out both" }}>
        {active === "overview" && <OverviewTab plan={plan} />}
        {active === "audience_messaging" && <AudienceMessagingTab plan={plan} />}
        {active === "channels_tactics" && <ChannelsTab section={rc(plan.channels_tactics)} />}
        {active === "budget_timeline" && <BudgetTimelineTab plan={plan} />}
        {active === "kpis_measurement" && <KpisTab section={rc(plan.kpis_measurement)} />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB: OVERVIEW
// ════════════════════════════════════════════════════════════════════
function OverviewTab({ plan }: { plan: Record<string, unknown> }) {
  const obj = rc(plan.objectives_smart);
  const swot = rc(plan.swot_competitive);
  const highLevelGoal = s(obj.high_level_goal);
  const whyNow = s(obj.why_now);
  const kpis = ar(obj.kpi_highlights) as Array<Record<string, unknown>>;
  const objectives = ar(obj.smart_objectives) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-8">
      {/* High-Level Goals + Why Now (side by side if both present) */}
      {(highLevelGoal || whyNow) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {highLevelGoal && (
            <div className="lg:col-span-2 bg-rose-50/70 rounded-xl p-5 border border-rose-200">
              <SLabel tone="pink">High-Level Goals</SLabel>
              <p className="text-base font-bold text-text-primary leading-relaxed">
                {highLevelGoal}
              </p>
            </div>
          )}
          {whyNow && (
            <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
              <SLabel>Why Now</SLabel>
              <p className="text-sm text-text-secondary leading-relaxed">{whyNow}</p>
            </div>
          )}
        </div>
      )}

      {/* KPI highlight cards */}
      <section className="space-y-4">
        <SectionHeader icon={Target} title="Headline KPIs" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <KpiCard key={i} kpi={kpi} />
          ))}
        </div>
      </section>

      {/* SMART Objectives checklist */}
      {objectives.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={CheckCircle2} title="Plan Objectives" />
          <div className="bg-surface-white rounded-xl border border-surface-100 divide-y divide-surface-100">
            {objectives.map((o, i) => (
              <ObjectiveRow key={i} obj={o} />
            ))}
          </div>
        </section>
      )}

      {/* SWOT count cards */}
      <section className="space-y-4">
        <SectionHeader icon={Shield} title="SWOT & Competitive" />
        <SwotCountCards swot={swot} />
        {s(swot.competitive_context) && (
          <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
            <SLabel>Competitive Context</SLabel>
            <p className="text-sm text-text-secondary leading-relaxed">
              {s(swot.competitive_context)}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Record<string, unknown> }) {
  const value = s(kpi.value);
  const label = s(kpi.label);
  const target = s(kpi.target);
  const trend = (s(kpi.trend) || "").toLowerCase();
  const delta = (s(kpi.delta) || "").toLowerCase();

  const TrendIcon = trend === "down" ? ArrowDown : trend === "up" ? ArrowUp : trend === "flat" ? ArrowRight : null;
  const trendClass =
    trend === "down" ? "text-red-500" :
    trend === "up" ? "text-green-500" :
    trend === "flat" ? "text-text-tertiary" : "";

  const deltaLabel = delta === "neg" ? "warn" : delta || null;
  const deltaColor =
    delta === "neg" ? "bg-red-100 text-red-700" :
    delta === "warn" ? "bg-amber-100 text-amber-700" :
    delta === "pos" ? "bg-green-100 text-green-700" : "bg-surface-100 text-text-secondary";

  return (
    <div className="bg-surface-white rounded-xl p-4 border border-surface-100 shadow-sm flex flex-col justify-between min-h-[120px]">
      <div className="flex items-start justify-between gap-2">
        <div className="text-2xl font-bold text-text-primary tabular-nums leading-none">
          {value ?? "—"}
        </div>
        {TrendIcon && <TrendIcon className={cn("w-4 h-4 flex-shrink-0", trendClass)} />}
      </div>
      <div>
        <div className="text-[11px] text-text-tertiary leading-tight mt-2 line-clamp-3">{label ?? ""}</div>
        <div className="flex items-center justify-between gap-2 mt-2">
          {target && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">
              target: {target}
            </span>
          )}
          {deltaLabel && (
            <span className={cn("inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase", deltaColor)}>
              {deltaLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ObjectiveRow({ obj }: { obj: Record<string, unknown> }) {
  const objective = s(obj.objective);
  const target = s(obj.target);
  const metric = s(obj.metric);
  const timeframe = s(obj.timeframe);
  const days = parseDeadlineDays(obj.deadline_days) ?? parseDeadlineDays(obj.timeframe);

  return (
    <div className="flex items-start gap-3 p-4">
      <Circle className="w-4 h-4 text-brand-accent/40 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary">{objective ?? "—"}</div>
        {(metric || target) && (
          <div className="text-xs text-text-tertiary mt-1">
            {metric && <><span className="font-medium">Metric:</span> {metric}</>}
            {metric && target && <span> · </span>}
            {target && <><span className="font-medium">Target:</span> {target}</>}
          </div>
        )}
      </div>
      {days ? (
        <span className="text-xs font-semibold text-brand-accent bg-brand-accent/10 rounded-full px-3 py-1 flex-shrink-0">
          {days}d
        </span>
      ) : timeframe ? (
        <span className="text-xs text-text-tertiary italic flex-shrink-0">{timeframe}</span>
      ) : null}
    </div>
  );
}

function SwotCountCards({ swot }: { swot: Record<string, unknown> }) {
  const quadrants = [
    { key: "strengths",     label: "Strengths",     color: "bg-green-50 border-green-200 text-green-900", bar: "bg-green-400" },
    { key: "weaknesses",    label: "Weaknesses",    color: "bg-rose-50 border-rose-200 text-rose-900",     bar: "bg-rose-400" },
    { key: "opportunities", label: "Opportunities", color: "bg-blue-50 border-blue-200 text-blue-900",    bar: "bg-blue-400" },
    { key: "threats",       label: "Threats",       color: "bg-amber-50 border-amber-200 text-amber-900", bar: "bg-amber-400" },
  ] as const;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
      {quadrants.map((q) => {
        const items = ar(swot[q.key]);
        return (
          <div key={q.key} className={cn("rounded-xl border p-4 h-full", q.color)}>
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider">{q.label}</div>
              <div className="text-lg font-extrabold">· {items.length}</div>
            </div>
            <div className="mt-2 flex gap-1">
              {items.slice(0, Math.min(items.length, 5)).map((_, i) => (
                <div key={i} className={cn("h-1.5 flex-1 rounded-full", q.bar)} />
              ))}
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs mt-3 leading-relaxed">
              {items.map((it, i) => (<li key={i}>{s(it) ?? ""}</li>))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB: AUDIENCE & MESSAGING
// ════════════════════════════════════════════════════════════════════
function AudienceMessagingTab({ plan }: { plan: Record<string, unknown> }) {
  const aud = rc(plan.target_audience);
  const swot = rc(plan.swot_competitive);
  const messaging = rc(plan.messaging_content_strategy);

  const primary = rc(aud.primary);
  const secondary = ar(aud.secondary) as Array<Record<string, unknown>>;
  const tone = ar(messaging.tone);
  // Prefer pillar_matrix; fall back to pairing message_pillars with dealer_talking_points
  const pillarMatrix = ar(messaging.pillar_matrix) as Array<Record<string, unknown>>;
  const fallbackPillars = ar(messaging.message_pillars) as Array<Record<string, unknown>>;
  const fallbackQuotes = ar(messaging.dealer_talking_points) as Array<Record<string, unknown>>;
  const hasPillarMatrix = pillarMatrix.length > 0;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* LEFT column: Who We're Talking To + Competitive Context */}
      <div className="space-y-4">
        <SectionHeader icon={Users} title="Who We're Talking To" />
        <AudiencePersonaCard persona={primary} role="Primary" />
        {secondary.map((p, i) => (
          <AudiencePersonaCard key={i} persona={p} role="Secondary" />
        ))}
        {s(swot.competitive_context) && (
          <div className="bg-surface-50 rounded-xl p-4 border border-surface-100 border-dashed">
            <SLabel>Competitive Context</SLabel>
            <p className="text-xs text-text-secondary leading-relaxed">{s(swot.competitive_context)}</p>
          </div>
        )}
      </div>

      {/* RIGHT column: Core Message + Tone + Pillar Matrix */}
      <div className="space-y-4">
        <SectionHeader icon={MessageSquare} title="Core Message" />
        <div className="bg-gradient-to-br from-rose-100/70 to-rose-50 rounded-xl p-5 border border-rose-200">
          <SLabel tone="pink">Core Message</SLabel>
          <p className="text-base font-semibold text-text-primary mt-1 leading-relaxed italic">
            {s(messaging.core_message) ?? "—"}
          </p>
        </div>
        {tone.length > 0 && (
          <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
            <SLabel>Tone</SLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              {tone.map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                >
                  {s(t) ?? ""}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <SectionHeader icon={Shield} title="Pillar → Pain → Proof → Quote" />
        </div>
        <div className="bg-surface-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50">
                <tr>
                  <th className="text-left py-3 px-3 font-bold text-[10px] uppercase tracking-wider text-text-tertiary">Pillar</th>
                  <th className="text-left py-3 px-3 font-bold text-[10px] uppercase tracking-wider text-text-tertiary">Pain</th>
                  <th className="text-left py-3 px-3 font-bold text-[10px] uppercase tracking-wider text-text-tertiary">Proof</th>
                  <th className="text-left py-3 px-3 font-bold text-[10px] uppercase tracking-wider text-text-tertiary">Quote</th>
                </tr>
              </thead>
              <tbody>
                {hasPillarMatrix
                  ? pillarMatrix.map((row, i) => <PillarRow key={i} row={row} />)
                  : fallbackPillars.map((row, i) => {
                      const quote = fallbackQuotes[i];
                      return (
                        <PillarRow
                          key={i}
                          row={{
                            pillar: row.pillar,
                            pain: row.what_to_say,
                            proof: "",
                            quote: quote ? s((quote as Record<string, unknown>).script) : "",
                          }}
                        />
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function AudiencePersonaCard({ persona, role }: { persona: Record<string, unknown>; role: string }) {
  // Prefer new structured fields; fall back to older ones
  const name = s(persona.name);
  const segment = s(persona.segment) || s(persona.profile);
  const mindset = s(persona.mindset);
  const pain = s(persona.pain) || s(persona.key_anxiety);
  const trigger = s(persona.decision_trigger) || s(persona.decision_triggers);
  const where = s(persona.where) || s(persona.media_behavior);
  const description = s(persona.description); // old secondary fallback

  const roleColor = role.toLowerCase() === "primary"
    ? "bg-rose-100 text-rose-700"
    : "bg-surface-100 text-text-secondary";

  return (
    <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", roleColor)}>
          {role}
        </span>
      </div>
      <h4 className="text-lg font-extrabold text-text-primary leading-tight mb-1">{name ?? "—"}</h4>
      {segment && <p className="text-xs text-text-tertiary italic mb-3">{segment}</p>}

      {/* If we only have legacy description, show it */}
      {description && !mindset && !pain && (
        <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
      )}

      <div className="space-y-2 text-sm">
        {mindset && <KVRow label="Mindset" value={mindset} italic />}
        {pain && <KVRow label="Pain" value={pain} />}
        {trigger && <KVRow label="Trigger" value={trigger} />}
        {where && <KVRow label="Where" value={where} />}
      </div>
    </div>
  );
}

function KVRow({ label, value, italic }: { label: string; value: string; italic?: boolean }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="font-semibold text-text-primary w-16 flex-shrink-0">{label}</span>
      <span className={cn("text-text-secondary", italic && "italic")}>{value}</span>
    </div>
  );
}

function PillarRow({ row }: { row: Record<string, unknown> }) {
  const pillar = s(row.pillar);
  const pain = s(row.pain);
  const proof = s(row.proof);
  const quote = s(row.quote);
  return (
    <tr className="border-b border-surface-100 last:border-b-0 text-xs">
      <td className="py-3 px-3 font-semibold text-text-primary align-top whitespace-normal">{pillar ?? "—"}</td>
      <td className="py-3 px-3 text-text-secondary align-top whitespace-normal">{pain ?? "—"}</td>
      <td className="py-3 px-3 align-top whitespace-normal">
        {proof ? (
          <span className="inline-block font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5 leading-tight">
            {proof}
          </span>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="py-3 px-3 text-text-secondary italic align-top whitespace-normal leading-snug">
        {quote ? `"${quote}"` : "—"}
      </td>
    </tr>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB: CHANNELS & TACTICS
// ════════════════════════════════════════════════════════════════════
function ChannelsTab({ section }: { section: Record<string, unknown> }) {
  const channels = ar(section.channels) as Array<Record<string, unknown>>;
  const pipeline = rc(section.content_pipeline);
  const slaList = ar(section.response_sla_by_pain_point) as Array<Record<string, unknown>>;
  const rules = ar(section.tactical_rules) as Array<Record<string, unknown>>;
  const fallbackAssets = ar(section.content_assets) as Array<Record<string, unknown>>;

  // If pipeline is empty, bucket content_assets by deadline keyword
  const hasPipeline = ar(pipeline.week1_launch).length + ar(pipeline.week2_sustain).length + ar(pipeline.always_on).length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Channels column (left 2/5) */}
      <div className="lg:col-span-2 space-y-4">
        <SectionHeader icon={Megaphone} title="Channels" />
        <div className="space-y-3">
          {channels.map((c, i) => (
            <div key={i} className="bg-surface-white rounded-xl p-4 border border-surface-100">
              <div className="text-sm font-bold text-text-primary">{s(c.channel_group) ?? "—"}</div>
              {s(c.purpose) && (
                <div className="text-xs text-text-tertiary mt-1">{s(c.purpose)}</div>
              )}
              {ar(c.items).length > 0 && (
                <ul className="list-disc list-inside text-xs text-text-secondary mt-2 space-y-0.5">
                  {ar(c.items).slice(0, 3).map((it, j) => (<li key={j}>{s(it) ?? ""}</li>))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {rules.length > 0 && (
          <>
            <SectionHeader icon={Shield} title="Tactical Rules" />
            <div className="bg-surface-white rounded-xl p-4 border border-surface-100 space-y-3">
              {rules.map((r, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-accent text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{s(r.rule) ?? "—"}</div>
                    {s(r.detail) && <div className="text-xs text-text-tertiary mt-0.5">{s(r.detail)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content Pipeline + SLA column (right 3/5) */}
      <div className="lg:col-span-3 space-y-6">
        <section className="space-y-4">
          <SectionHeader icon={Calendar} title="Content Pipeline · 2 Weeks" />
          {hasPipeline ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <PipelineColumn
                title="Week 1 · Launch"
                bgClass="bg-amber-50 border-amber-200"
                badgeClass="bg-amber-500 text-white"
                items={ar(pipeline.week1_launch) as Array<Record<string, unknown>>}
              />
              <PipelineColumn
                title="Week 2 · Sustain"
                bgClass="bg-yellow-50 border-yellow-200"
                badgeClass="bg-yellow-500 text-white"
                items={ar(pipeline.week2_sustain) as Array<Record<string, unknown>>}
              />
              <PipelineColumn
                title="Always-On"
                bgClass="bg-green-50 border-green-200"
                badgeClass="bg-green-500 text-white"
                items={ar(pipeline.always_on) as Array<Record<string, unknown>>}
              />
            </div>
          ) : (
            /* Fallback: show content_assets as a table */
            <div className="bg-surface-white rounded-xl p-4 border border-surface-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-text-tertiary">
                    <th className="py-2">Asset</th><th className="py-2">Purpose</th><th className="py-2">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {fallbackAssets.map((a, i) => (
                    <tr key={i} className="border-t border-surface-100">
                      <td className="py-2 font-medium text-text-primary">{s(a.asset) ?? "—"}</td>
                      <td className="py-2 text-text-secondary">{s(a.purpose) ?? "—"}</td>
                      <td className="py-2 text-text-tertiary">{s(a.deadline) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {slaList.length > 0 && (
          <section className="space-y-4">
            <SectionHeader icon={TrendingUp} title="Response SLA by Pain-Point" />
            <div className="bg-surface-white rounded-xl p-5 border border-surface-100 space-y-3">
              {slaList.map((sla, i) => (
                <SLABar key={i} sla={sla} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function PipelineColumn({
  title, bgClass, badgeClass, items,
}: {
  title: string; bgClass: string; badgeClass: string; items: Array<Record<string, unknown>>;
}) {
  return (
    <div className={cn("rounded-xl p-3 border", bgClass)}>
      <div className={cn("inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-3", badgeClass)}>
        {title}
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-xs text-text-tertiary italic text-center py-4">No items</div>
        ) : items.map((it, i) => (
          <div key={i} className="bg-white rounded-lg p-3 border border-surface-100">
            <div className="text-sm font-semibold text-text-primary leading-tight">{s(it.title) ?? "—"}</div>
            <div className="flex items-center justify-between gap-2 mt-2 text-[11px]">
              <span className="text-text-tertiary font-medium">{s(it.channel_tag) ?? ""}</span>
              <span className="text-text-secondary italic">{s(it.day_range) ?? ""}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SLABar({ sla }: { sla: Record<string, unknown> }) {
  const pain = s(sla.pain_point);
  const hours = nu(sla.sla_hours);
  const priority = (s(sla.priority) || "blue").toLowerCase();
  const barColor =
    priority === "red" ? "bg-red-500" :
    priority === "amber" ? "bg-amber-500" :
    priority === "green" ? "bg-green-500" :
    "bg-blue-500";
  // Map hours to percentage width (e.g., 2h = 30%, 4h = 60%, 8h = 100%)
  const pct = hours ? Math.min(100, Math.max(10, (hours / 8) * 100)) : 30;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-text-secondary font-medium">{pain ?? "—"}</span>
        <span className="text-text-primary font-semibold">{hours != null ? `${hours}h max` : "—"}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB: BUDGET & TIMELINE
// ════════════════════════════════════════════════════════════════════
function BudgetTimelineTab({ plan }: { plan: Record<string, unknown> }) {
  const section = rc(plan.budget_timeline);
  const roadmap = rc(plan.implementation_roadmap);
  const allocation = ar(section.budget_allocation) as Array<Record<string, unknown>>;
  const phases = ar(section.phases) as Array<Record<string, unknown>>;
  const workstreams = ar(roadmap.workstreams) as Array<Record<string, unknown>>;
  const steps = ar(roadmap.strategic_recommendation_steps) as Array<Record<string, unknown>>;
  const [activePhase, setActivePhase] = useState(0);
  const total = s(section.total_budget_short) || s(section.total_budget);

  return (
    <div className="space-y-8">
      {/* Budget + Timeline top row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
          <SLabel>Budget Allocation</SLabel>
          {total && (
            <div className="text-sm text-text-secondary mb-4">
              Total: <span className="font-bold text-text-primary">{total}</span>
            </div>
          )}
          <div className="space-y-3">
            {allocation.map((a, i) => {
              const pct = nu(a.percentage) ?? 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary font-medium">{s(a.category) ?? "—"}</span>
                    <span className="text-text-primary font-semibold">
                      {pct}% · {s(a.amount) ?? "—"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                    <div
                      className="h-full bg-brand-accent rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
          <SLabel>Implementation Timeline</SLabel>
          <div className="flex flex-wrap gap-2 mt-1 mb-4">
            {phases.map((p, i) => (
              <button
                key={i}
                onClick={() => setActivePhase(i)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                  activePhase === i
                    ? "bg-brand-accent text-white border-brand-accent"
                    : "bg-surface-white text-text-secondary border-surface-200 hover:bg-surface-100",
                )}
              >
                {s(p.phase) ?? `Phase ${i + 1}`}
              </button>
            ))}
          </div>
          {phases[activePhase] && (
            <div>
              {s(phases[activePhase].focus) && (
                <div className="text-xs text-text-tertiary mb-2 italic">
                  {s(phases[activePhase].focus)}
                </div>
              )}
              <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
                {ar(phases[activePhase].items).map((it, i) => (<li key={i}>{s(it) ?? ""}</li>))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Workstreams table */}
      {workstreams.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={Calendar} title="Workstreams & Deadlines" />
          <div className="bg-surface-white rounded-xl p-5 border border-surface-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-text-tertiary border-b border-surface-100">
                  <th className="py-2 px-3">Workstream</th>
                  <th className="py-2 px-3">Owner</th>
                  <th className="py-2 px-3">Deliverable</th>
                  <th className="py-2 px-3">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {workstreams.map((w, i) => (
                  <tr key={i} className="border-b border-surface-100/50 last:border-b-0">
                    <td className="py-2 px-3 font-semibold text-text-primary">{s(w.workstream) ?? "—"}</td>
                    <td className="py-2 px-3 text-text-secondary">{s(w.owner) ?? "—"}</td>
                    <td className="py-2 px-3 text-text-secondary">{s(w.deliverable) ?? "—"}</td>
                    <td className="py-2 px-3 text-text-tertiary italic">{s(w.deadline) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Strategic recommendation steps — horizontal */}
      {steps.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={TrendingUp} title="Strategic Recommendation Steps" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {steps.map((st, i) => (
              <div
                key={i}
                className="bg-surface-white rounded-xl p-4 border border-surface-100 min-h-[110px] relative"
              >
                <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                  {nu(st.step_number) ?? i + 1}
                </div>
                <div className="pl-10">
                  <div className="text-sm font-bold text-text-primary leading-tight">{s(st.title) ?? "—"}</div>
                  <div className="text-[11px] text-text-tertiary mt-1 leading-snug">{s(st.description) ?? ""}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB: KPIs & MEASUREMENT
// ════════════════════════════════════════════════════════════════════
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

  // Map cadence by frequency name to ensure 4-card layout order even if LLM varies
  const cadenceByFreq = (freq: string) => cadence.find((c) => (s(c.frequency) || "").toLowerCase() === freq.toLowerCase());
  const cadenceOrdered = [
    { freq: "Daily",     data: cadenceByFreq("Daily"),     color: "bg-red-50 border-red-200 text-red-900" },
    { freq: "Weekly",    data: cadenceByFreq("Weekly"),    color: "bg-amber-50 border-amber-200 text-amber-900" },
    { freq: "Bi-weekly", data: cadenceByFreq("Bi-weekly"), color: "bg-blue-50 border-blue-200 text-blue-900" },
    { freq: "Monthly",   data: cadenceByFreq("Monthly"),   color: "bg-green-50 border-green-200 text-green-900" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
          <SLabel>Success Metrics</SLabel>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-text-tertiary">Area</th>
                  <th className="text-left py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-text-tertiary">Metric</th>
                  <th className="text-left py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-text-tertiary">Target</th>
                </tr>
              </thead>
              <tbody>
                {kpiTable.map((k, i) => (
                  <tr key={i} className="border-b border-surface-100/50 last:border-b-0">
                    <td className="py-2 px-3 font-semibold text-text-primary">{s(k.kpi_area) ?? "—"}</td>
                    <td className="py-2 px-3 text-text-secondary">{s(k.metric) ?? "—"}</td>
                    <td className="py-2 px-3 text-text-primary font-medium">{s(k.target) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
          <SLabel>Progress to Watch</SLabel>
          <div className="space-y-3 mt-2">
            {progress.map((p, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary font-medium">{s(p.label) ?? "—"}</span>
                  <span className="text-text-primary font-semibold">{s(p.target_label) ?? "—"}</span>
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

      <section className="space-y-4">
        <SectionHeader icon={Calendar} title="Measurement Cadence" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cadenceOrdered.map((c) => (
            <div key={c.freq} className={cn("rounded-xl p-4 border", c.color)}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2">{c.freq}</div>
              {c.data ? (
                <ul className="space-y-1.5 text-xs leading-relaxed">
                  {ar(c.data.items).map((it, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="flex-shrink-0">·</span>
                      <span>{s(it) ?? ""}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs italic opacity-50">No cadence set</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PLAN SKELETON — shown while plan is being (re)generated
// ════════════════════════════════════════════════════════════════════
const SKELETON_MESSAGES = [
  "Analyzing findings and recommendations…",
  "Drafting strategic objectives…",
  "Mapping audience personas…",
  "Building messaging pillars…",
  "Scheduling content pipeline…",
  "Allocating budget across phases…",
  "Defining KPIs and cadence…",
  "Rendering the final plan…",
];

function PlanSkeleton() {
  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % SKELETON_MESSAGES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6 animate-pulse">
      {/* Generating banner */}
      <div className="flex items-center gap-4 bg-gradient-to-r from-rose-50 to-surface-50 rounded-xl p-5 border border-rose-200 animate-none">
        <Loader2 className="w-6 h-6 text-brand-accent animate-spin flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-bold text-text-primary">Generating your marketing plan…</div>
          <div className="text-xs text-text-tertiary mt-0.5 transition-opacity">
            {SKELETON_MESSAGES[messageIndex]}
          </div>
        </div>
        <div className="text-xs text-text-tertiary italic hidden md:block">Typically 1–2 minutes</div>
      </div>

      {/* Key Visual skeleton */}
      <div className="bg-surface-white rounded-xl border border-surface-100 overflow-hidden p-5">
        <div className="h-3 w-20 rounded bg-surface-100 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-lg bg-gradient-to-br from-slate-200 to-slate-100 min-h-[180px]" />
          <div className="lg:col-span-2 rounded-lg bg-rose-100/60 min-h-[180px] p-5">
            <div className="h-3 w-20 rounded bg-rose-200 mb-3" />
            <div className="h-6 w-3/4 rounded bg-rose-200 mb-2" />
            <div className="h-3 w-full rounded bg-rose-200/60 mb-1" />
            <div className="h-3 w-5/6 rounded bg-rose-200/60" />
          </div>
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="flex flex-wrap gap-2 border-b border-surface-100 pb-3">
        {[80, 150, 130, 130, 140].map((w, i) => (
          <div key={i} className="h-9 rounded-lg bg-surface-100" style={{ width: `${w}px` }} />
        ))}
      </div>

      {/* Overview tab skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl p-5 border border-rose-200 bg-rose-50/70 space-y-3">
          <div className="h-3 w-28 rounded bg-rose-200" />
          <div className="h-4 w-full rounded bg-rose-200/60" />
          <div className="h-4 w-5/6 rounded bg-rose-200/60" />
        </div>
        <div className="rounded-xl p-5 border border-surface-100 bg-surface-white space-y-3">
          <div className="h-3 w-16 rounded bg-surface-100" />
          <div className="h-3 w-full rounded bg-surface-100" />
          <div className="h-3 w-3/4 rounded bg-surface-100" />
        </div>
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-white rounded-xl p-4 border border-surface-100 min-h-[120px] space-y-3">
            <div className="h-8 w-16 rounded bg-surface-100" />
            <div className="h-3 w-full rounded bg-surface-100" />
            <div className="h-3 w-2/3 rounded bg-surface-100" />
          </div>
        ))}
      </div>

      {/* Objectives list skeleton */}
      <div className="bg-surface-white rounded-xl border border-surface-100 divide-y divide-surface-100">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="w-4 h-4 rounded-full bg-surface-100 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-surface-100" />
              <div className="h-3 w-1/2 rounded bg-surface-100" />
            </div>
            <div className="h-6 w-12 rounded-full bg-surface-100 flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* SWOT count cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          "bg-green-50 border-green-200",
          "bg-rose-50 border-rose-200",
          "bg-blue-50 border-blue-200",
          "bg-amber-50 border-amber-200",
        ].map((color, i) => (
          <div key={i} className={cn("rounded-xl p-4 border min-h-[140px] space-y-3", color)}>
            <div className="h-3 w-20 rounded bg-surface-100/80" />
            <div className="flex gap-1 mt-2">
              <div className="h-1.5 flex-1 rounded-full bg-surface-100/60" />
              <div className="h-1.5 flex-1 rounded-full bg-surface-100/60" />
              <div className="h-1.5 flex-1 rounded-full bg-surface-100/60" />
            </div>
            <div className="h-3 w-full rounded bg-surface-100/60" />
            <div className="h-3 w-5/6 rounded bg-surface-100/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
