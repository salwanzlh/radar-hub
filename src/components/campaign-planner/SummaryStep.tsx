import { useState } from "react";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Target,
  Users,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Keyframes injected once via <style> ─── */
const KEYFRAMES_CSS = `
@keyframes summaryFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes skeletonPulse {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 0.8; }
}
`;

function fadeIn(delayMs: number): React.CSSProperties {
  return {
    animation: "summaryFadeIn 0.4s ease-out forwards",
    animationDelay: `${delayMs}ms`,
    opacity: 0,
  };
}

/* ─── Data interfaces (matches summary_agent.py JSON SCHEMA) ─── */

interface RecapData {
  primary_option_label: string;
  primary_option_title: string;
  secondary_option_label: string | null;
  secondary_option_title: string | null;
  lever_text: string;
  quick_summary: string;
}

interface ObjectiveData {
  metric_text: string;
  is_estimate: boolean;
  baseline: string | null;
  baseline_disclaimer: string | null;
}

interface KeyMessagePillar {
  pillar_title: string;
  bullets: string[];
}

interface BudgetGuardrail {
  base_amount: string;
  additional_from_secondary: string | null;
  total_amount: string;
  over_budget: boolean;
  over_note: string | null;
}

interface TimelineMilestone {
  label: string;
  position_pct: number;
}

interface TimelineGuardrail {
  duration: string;
  milestones: TimelineMilestone[];
}

interface AudienceGuardrail {
  segment: string;
  cross_shop_competitors: string[];
  source_note: string;
}

interface GuardrailData {
  budget: BudgetGuardrail;
  timeline: TimelineGuardrail;
  audience: AudienceGuardrail;
}

type ReadinessStatus = "ready" | "gap" | "unknown" | "ready_conditional";

interface ReadinessItem {
  c: string;
  must_be_true: string;
  status: ReadinessStatus;
  owner: string | null;
  deadline: string | null;
  detail: string;
  confidence_flag: string | null;
}

interface Props {
  summaryBrief: {
    content: Record<string, unknown>;
    approved_at: string | null;
  } | null;
  status: string;
  onApprove: () => void;
  onBack: () => void;
  isApproving: boolean;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === "string");
}

const KEY_MESSAGE_COLORS = ["bg-teal-700", "bg-purple-700", "bg-slate-700"];

const READINESS_BADGE: Record<ReadinessStatus, { label: string; className: string }> = {
  ready: { label: "Ready", className: "bg-status-success/10 text-status-success border border-status-success/20" },
  ready_conditional: {
    label: "Ready — bersyarat",
    className: "bg-status-success/10 text-status-success border border-status-success/20",
  },
  gap: { label: "Gap", className: "bg-amber-500/10 text-amber-600 border border-amber-500/20" },
  unknown: {
    label: "Belum diketahui",
    className: "bg-surface-100 text-text-tertiary border border-surface-200",
  },
};

/* ─── Main Component ─── */

export default function SummaryStep({
  summaryBrief,
  status,
  onApprove,
  onBack,
  isApproving,
}: Props) {
  const hasContent =
    summaryBrief?.content &&
    Object.keys(summaryBrief.content).length > 0;
  const isLoading =
    (!summaryBrief || !hasContent) && status === "summarizing";
  const isApproved = !!summaryBrief?.approved_at;

  const [objectiveConfirmed, setObjectiveConfirmed] = useState(false);
  const [objectiveText, setObjectiveText] = useState<string | null>(null);

  if (isLoading) {
    return <SkeletonLoading />;
  }

  if (!summaryBrief || !hasContent) {
    return null;
  }

  const c = summaryBrief.content;

  const recap = (c.recap as RecapData | undefined) ?? {
    primary_option_label: "",
    primary_option_title: "",
    secondary_option_label: null,
    secondary_option_title: null,
    lever_text: "",
    quick_summary: "",
  };
  const objective = (c.objective as ObjectiveData | undefined) ?? {
    metric_text: "",
    is_estimate: false,
    baseline: null,
    baseline_disclaimer: null,
  };
  const keyMessages = Array.isArray(c.key_messages)
    ? (c.key_messages as KeyMessagePillar[])
    : [];
  const guardrail = (c.guardrail as GuardrailData | undefined) ?? {
    budget: { base_amount: "", additional_from_secondary: null, total_amount: "", over_budget: false, over_note: null },
    timeline: { duration: "", milestones: [] },
    audience: { segment: "", cross_shop_competitors: [], source_note: "" },
  };
  const readiness = Array.isArray(c.readiness) ? (c.readiness as ReadinessItem[]) : [];
  const deferredToTactics = asStringArray(c.deferred_to_tactics);

  const canApprove = isApproved || objectiveConfirmed;

  let sectionIndex = 0;
  const nextDelay = () => (sectionIndex++) * 50;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />

      <div className="space-y-8">
        {/* 1. Recap — quote from Strategic Recommendation, not a new argument */}
        {(recap.primary_option_title || recap.quick_summary) && (
          <div
            style={fadeIn(nextDelay())}
            className="relative rounded-xl p-6 bg-slate-900 text-white overflow-hidden"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-pink-200 mb-3">
              Dikutip dari Strategic Recommendation
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {recap.primary_option_title && (
                <span className="text-[10.5px] font-bold px-3 py-1 rounded-full bg-pink-200 text-slate-900">
                  {recap.primary_option_label ? `${recap.primary_option_label} — ` : ""}
                  {recap.primary_option_title}
                </span>
              )}
              {recap.secondary_option_title && (
                <span className="text-[10.5px] font-bold px-3 py-1 rounded-full bg-slate-700 text-surface-100">
                  + elemen Sekunder dari{" "}
                  {recap.secondary_option_label ? `${recap.secondary_option_label}: ` : ""}
                  {recap.secondary_option_title}
                </span>
              )}
            </div>
            {recap.lever_text && (
              <p className="text-sm leading-relaxed text-surface-100">
                <b className="text-white">Lever:</b> {recap.lever_text}
              </p>
            )}
            {recap.quick_summary && (
              <p className="text-[12.5px] italic leading-relaxed text-surface-200 mt-3 pt-3 border-t border-slate-700">
                {recap.quick_summary}
              </p>
            )}
          </div>
        )}

        {/* 2. Objective — single SMART campaign-level target, gated */}
        <div style={fadeIn(nextDelay())}>
          <SectionHeader icon={Target} label="Objective" />
          <div className="rounded-xl p-5 bg-amber-500/10 border border-amber-500/20">
            {objective.is_estimate && (
              <span className="inline-block text-[10px] font-bold text-amber-700 bg-surface-white border border-amber-500/30 rounded-full px-2.5 py-0.5 mb-2">
                ⚠ Estimasi AI
              </span>
            )}
            <input
              type="text"
              value={objectiveText ?? objective.metric_text}
              onChange={(e) => setObjectiveText(e.target.value)}
              disabled={isApproved}
              className={cn(
                "w-full text-lg font-bold text-text-primary",
                "border border-surface-300 rounded-lg px-3 py-2.5 mb-3 mt-1",
                "bg-surface-white disabled:opacity-70 disabled:cursor-not-allowed"
              )}
            />
            {(objective.baseline || objective.baseline_disclaimer) && (
              <div className="text-[11.5px] text-text-secondary bg-surface-white border border-surface-200 rounded-lg px-3 py-2 mb-3 leading-relaxed">
                {objective.baseline && (
                  <span>
                    <b className="text-text-primary">Baseline:</b> {objective.baseline}
                  </span>
                )}
                {objective.baseline_disclaimer && (
                  <span className={objective.baseline ? "block mt-1" : ""}>
                    ⚠ <b className="text-text-primary">Perlu dikonfirmasi:</b>{" "}
                    {objective.baseline_disclaimer}
                  </span>
                )}
              </div>
            )}
            {!isApproved && (
              <label className="flex items-center gap-2 text-[11.5px] font-semibold text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={objectiveConfirmed}
                  onChange={(e) => setObjectiveConfirmed(e.target.checked)}
                  className="w-3.5 h-3.5 accent-brand-accent"
                />
                Saya konfirmasi angka ini
              </label>
            )}
          </div>
        </div>

        {/* 3. Key Messages — channel-agnostic pillars */}
        {keyMessages.length > 0 && (
          <div style={fadeIn(nextDelay())}>
            <SectionHeader icon={MessageSquare} label="Key Messages" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {keyMessages.map((pillar, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl p-4 text-white",
                    KEY_MESSAGE_COLORS[i % KEY_MESSAGE_COLORS.length]
                  )}
                >
                  <div className="text-sm font-bold mb-2">{pillar.pillar_title}</div>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs leading-relaxed opacity-95">
                    {asStringArray(pillar.bullets).map((bullet, j) => (
                      <li key={j}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Guardrail for Tactics — constraints, not the tactics themselves */}
        <div style={fadeIn(nextDelay())}>
          <SectionHeader icon={Shield} label="Guardrail untuk Tactics" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Budget */}
            <div
              className={cn(
                "rounded-xl p-4 bg-surface-white border",
                guardrail.budget.over_budget ? "border-amber-500/40" : "border-surface-200"
              )}
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-1.5">
                Budget Envelope
              </div>
              <div
                className={cn(
                  "text-base font-bold mb-1",
                  guardrail.budget.over_budget ? "text-amber-600" : "text-text-primary"
                )}
              >
                {guardrail.budget.total_amount || guardrail.budget.base_amount}
              </div>
              <div className="text-[11px] text-text-secondary leading-relaxed">
                {guardrail.budget.base_amount}
                {guardrail.budget.additional_from_secondary &&
                  ` + ${guardrail.budget.additional_from_secondary} elemen Sekunder`}
                {guardrail.budget.over_budget && guardrail.budget.over_note && (
                  <span className="block mt-1 text-amber-600 font-medium">
                    ⚠ {guardrail.budget.over_note} — perlu approval deviasi
                  </span>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-xl p-4 bg-surface-white border border-surface-200">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-1.5">
                Timeline Envelope
              </div>
              <div className="text-base font-bold text-text-primary mb-2">
                {guardrail.timeline.duration}
              </div>
              {guardrail.timeline.milestones.length > 0 && (
                <>
                  <div className="relative h-[3px] bg-surface-200 rounded-full my-2">
                    <div className="absolute inset-0 bg-status-info rounded-full" />
                    {guardrail.timeline.milestones.map((m, i) => (
                      <div
                        key={i}
                        className="absolute top-1/2 w-[7px] h-[7px] rounded-full bg-status-info border-[1.5px] border-white -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${m.position_pct}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-text-tertiary">
                    {guardrail.timeline.milestones.map((m, i) => (
                      <span key={i}>{m.label}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Audience */}
            <div className="rounded-xl p-4 bg-surface-white border border-surface-200">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-1.5">
                Audience (dipersempit)
              </div>
              <div className="text-base font-bold text-text-primary mb-1">
                {guardrail.audience.segment}
              </div>
              <div className="text-[11px] text-text-secondary leading-relaxed">
                {guardrail.audience.cross_shop_competitors.length > 0 && (
                  <span>
                    Cross-shop vs {guardrail.audience.cross_shop_competitors.join(", ")}
                    {guardrail.audience.source_note ? " — " : ""}
                  </span>
                )}
                {guardrail.audience.source_note}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Readiness — pre-mortem across the 5 Cs */}
        {readiness.length > 0 && (
          <div style={fadeIn(nextDelay())}>
            <SectionHeader icon={Users} label="Kesiapan Realisasi" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {readiness.map((item, i) => {
                const badge = READINESS_BADGE[item.status] ?? READINESS_BADGE.unknown;
                const showDetailBox = item.status !== "ready" && !!item.detail;
                const boxClass =
                  item.status === "gap"
                    ? "border border-dashed border-amber-500/40 bg-amber-500/5 text-amber-700"
                    : item.status === "ready_conditional"
                    ? "border border-dashed border-status-success/30 bg-status-success/5 text-text-secondary"
                    : "border border-dashed border-surface-300 bg-surface-100 text-text-secondary";

                return (
                  <div
                    key={i}
                    className="rounded-xl p-4 bg-surface-white border border-surface-200"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-brand-accent">
                        {item.c}
                      </span>
                      <span
                        className={cn(
                          "text-[9.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-xs text-text-primary leading-relaxed mb-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-text-tertiary mb-0.5">
                        Yang harus benar
                      </span>
                      {item.must_be_true}
                    </div>
                    {showDetailBox && (
                      <div className={cn("text-[11px] leading-relaxed rounded-lg px-2.5 py-2", boxClass)}>
                        {item.detail}
                        {(item.owner || item.deadline) && (
                          <span className="block mt-1">
                            {item.owner && <>Owner: {item.owner}</>}
                            {item.owner && item.deadline && " · "}
                            {item.deadline && <>Sebelum: {item.deadline}</>}
                          </span>
                        )}
                        {item.confidence_flag && (
                          <span className="block mt-1 font-medium">
                            ⚠ {item.confidence_flag}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Deferred to Tactics */}
        {deferredToTactics.length > 0 && (
          <div style={fadeIn(nextDelay())}>
            <div className="rounded-xl p-4 bg-status-info/10 border border-status-info/20">
              <div className="text-[11.5px] font-bold text-status-info mb-2">
                Belum diputuskan di step ini — akan ditentukan di Tactics &amp; Action
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-text-secondary leading-relaxed">
                {deferredToTactics.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 7. Footer */}
        <div
          style={fadeIn(nextDelay())}
          className={cn(
            "sticky bottom-0 z-20",
            "border-t border-surface-200 pt-5 pb-2 space-y-4",
            "bg-surface-50/80 backdrop-blur-md -mx-1 px-1"
          )}
        >
          {!isApproved && (
            <div
              className={cn(
                "flex items-center gap-3",
                "bg-amber-500/10 border border-amber-500/20",
                "rounded-lg px-5 py-3"
              )}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-medium text-amber-700">
                Konfirmasi hanya diperlukan di kartu Objective — review carefully, brief ini menjadi acuan Tactics & Action
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className={cn(
                "inline-flex items-center gap-2",
                "px-5 py-3 rounded-lg",
                "border border-surface-300",
                "text-sm font-medium text-text-secondary",
                "hover:bg-surface-100 transition-colors"
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {isApproved ? (
              <span
                className={cn(
                  "inline-flex items-center gap-2",
                  "px-6 py-3 rounded-lg",
                  "bg-status-success/10 text-status-success",
                  "text-sm font-bold"
                )}
              >
                <CheckCircle2 className="w-4.5 h-4.5" />
                Brief Approved
              </span>
            ) : (
              <button
                type="button"
                onClick={onApprove}
                disabled={isApproving || !canApprove}
                className={cn(
                  "inline-flex items-center gap-2",
                  "px-7 py-3 rounded-lg",
                  "text-white text-sm font-bold",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                )}
                style={{
                  background: "linear-gradient(to right, var(--color-brand-accent), #dc2626)",
                }}
              >
                {isApproving ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-4.5 h-4.5" />
                )}
                {isApproving ? "Approving..." : "Lanjut ke Tactics & Action"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Section Header ─── */

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-5 rounded-full bg-brand-accent" />
      <Icon className="w-4 h-4 text-brand-accent" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
        {label}
      </span>
    </div>
  );
}

/* ─── Skeleton Loading State ─── */

function SkeletonLoading() {
  const pulseStyle = (delay: number): React.CSSProperties => ({
    animation: `skeletonPulse 1.5s ease-in-out infinite`,
    animationDelay: `${delay}ms`,
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />
      <div className="space-y-6 py-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 text-brand-accent animate-spin" />
          <p className="text-sm font-medium text-text-secondary">
            Generating Strategy Brief...
          </p>
        </div>

        {/* Skeleton card 1 — recap, dark full width */}
        <div
          className="rounded-xl bg-slate-900/10 border border-surface-200 h-28"
          style={pulseStyle(0)}
        />

        {/* Skeleton card 2 — objective */}
        <div
          className="rounded-xl bg-surface-100 border border-surface-200 h-24"
          style={pulseStyle(150)}
        />

        {/* Skeleton card 3 — key messages, 3 cols */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-surface-100 border border-surface-200 h-28" style={pulseStyle(300)} />
          <div className="rounded-xl bg-surface-100 border border-surface-200 h-28" style={pulseStyle(450)} />
          <div className="rounded-xl bg-surface-100 border border-surface-200 h-28" style={pulseStyle(600)} />
        </div>

        {/* Skeleton card 4 — readiness grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-surface-100 border border-surface-200 h-24" style={pulseStyle(750)} />
          <div className="rounded-xl bg-surface-100 border border-surface-200 h-24" style={pulseStyle(900)} />
          <div className="rounded-xl bg-surface-100 border border-surface-200 h-24" style={pulseStyle(1050)} />
        </div>
      </div>
    </>
  );
}
