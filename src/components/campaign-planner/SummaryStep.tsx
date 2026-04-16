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
  TrendingUp,
  TrendingDown,
  XCircle,
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

/* ─── Data interfaces ─── */

interface SwotData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface StrategicPlayData {
  their_narrative: string[];
  our_counter_narrative: string[];
}

interface AudienceSketchData {
  primary: string;
  secondary: string;
}

interface BudgetRealityCheckData {
  can_do: string[];
  cannot_do: string[];
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

  if (isLoading) {
    return <SkeletonLoading />;
  }

  if (!summaryBrief || !hasContent) {
    return null;
  }

  const c = summaryBrief.content;

  const situationSnapshot = (c.situation_snapshot as string) ?? "";
  const swot = (c.swot as SwotData | undefined) ?? {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
  };
  const coreStrategicTension = (c.core_strategic_tension as string) ?? "";
  const strategicPlay = (c.strategic_play as StrategicPlayData | undefined) ?? {
    their_narrative: [],
    our_counter_narrative: [],
  };
  const positioningDirection = (c.positioning_direction as string) ?? "";
  const audienceSketch = (c.audience_sketch as AudienceSketchData | undefined) ?? {
    primary: "",
    secondary: "",
  };
  const messagingTerritory = (c.messaging_territory as string) ?? "";
  const budgetRealityCheck = (c.budget_reality_check as BudgetRealityCheckData | undefined) ?? {
    can_do: [],
    cannot_do: [],
  };

  let sectionIndex = 0;
  const nextDelay = () => (sectionIndex++) * 50;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />

      <div className="space-y-8">
        {/* 1. Situation Snapshot */}
        {situationSnapshot && (
          <div style={fadeIn(nextDelay())}>
            <SectionHeader icon={Shield} label="Situation Snapshot" />
            <div
              className={cn(
                "relative rounded-xl p-6",
                "bg-surface-white border border-surface-200",
                "overflow-hidden"
              )}
            >
              {/* Gradient left border accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{
                  background:
                    "linear-gradient(to bottom, var(--color-brand-accent), #ec4899)",
                }}
              />
              <p className="text-base italic text-text-secondary leading-relaxed pl-4">
                &ldquo;{situationSnapshot}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* 2. SWOT Analysis */}
        <div style={fadeIn(nextDelay())}>
          <SectionHeader icon={Target} label="SWOT Analysis" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SwotQuadrant
              title="Strengths"
              items={asStringArray(swot.strengths)}
              gradientFrom="#059669"
              gradientTo="#34d399"
              dotClass="bg-emerald-500"
              textClass="text-emerald-800"
              labelClass="text-emerald-600"
            />
            <SwotQuadrant
              title="Weaknesses"
              items={asStringArray(swot.weaknesses)}
              gradientFrom="#dc2626"
              gradientTo="#f87171"
              dotClass="bg-red-500"
              textClass="text-red-800"
              labelClass="text-red-600"
            />
            <SwotQuadrant
              title="Opportunities"
              items={asStringArray(swot.opportunities)}
              gradientFrom="#2563eb"
              gradientTo="#60a5fa"
              dotClass="bg-blue-500"
              textClass="text-blue-800"
              labelClass="text-blue-600"
            />
            <SwotQuadrant
              title="Threats"
              items={asStringArray(swot.threats)}
              gradientFrom="#d97706"
              gradientTo="#fbbf24"
              dotClass="bg-amber-500"
              textClass="text-amber-800"
              labelClass="text-amber-600"
            />
          </div>
        </div>

        {/* 3. Core Strategic Tension */}
        {coreStrategicTension && (
          <div style={fadeIn(nextDelay())}>
            <SectionHeader icon={TrendingUp} label="Core Strategic Tension" />
            <div
              className={cn(
                "relative rounded-xl p-8",
                "bg-slate-900 text-white",
                "text-center overflow-hidden"
              )}
            >
              <p className="text-lg font-bold leading-relaxed">
                {coreStrategicTension}
              </p>
              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[3px]"
                style={{
                  background:
                    "linear-gradient(to right, var(--color-brand-accent), #ec4899)",
                }}
              />
            </div>
          </div>
        )}

        {/* 4. Strategic Play */}
        <div style={fadeIn(nextDelay())}>
          <SectionHeader icon={Shield} label="Strategic Play" />
          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Their Narrative — left column */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-1">
                Their Narrative
              </h4>
              {asStringArray(strategicPlay.their_narrative).length > 0 ? (
                asStringArray(strategicPlay.their_narrative).map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "relative rounded-lg p-4 pl-5",
                      "bg-red-50 border border-red-200"
                    )}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg bg-red-500" />
                    <p className="text-sm text-red-800 leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-red-400 italic">No data</p>
              )}
            </div>

            {/* VS Badge — centered between columns */}
            <div className="hidden sm:flex absolute inset-0 items-center justify-center pointer-events-none z-10">
              <div
                className={cn(
                  "w-10 h-10 rounded-full",
                  "bg-surface-200 border-2 border-surface-300",
                  "flex items-center justify-center",
                  "text-[11px] font-black tracking-wider text-text-primary"
                )}
              >
                VS
              </div>
            </div>

            {/* Our Counter-Narrative — right column */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
                Our Counter-Narrative
              </h4>
              {asStringArray(strategicPlay.our_counter_narrative).length > 0 ? (
                asStringArray(strategicPlay.our_counter_narrative).map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "relative rounded-lg p-4 pl-5",
                      "bg-emerald-50 border border-emerald-200"
                    )}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg bg-emerald-500" />
                    <p className="text-sm text-emerald-800 leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-emerald-400 italic">No data</p>
              )}
            </div>
          </div>
        </div>

        {/* 5. Positioning Direction */}
        {positioningDirection && (
          <div style={fadeIn(nextDelay())}>
            <SectionHeader icon={TrendingUp} label="Positioning Direction" />
            <div
              className={cn(
                "relative rounded-xl p-6",
                "bg-surface-white border border-surface-200",
                "overflow-hidden"
              )}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-brand-accent" />
              <p className="text-base text-text-primary leading-relaxed pl-4 font-medium">
                {positioningDirection}
              </p>
            </div>
          </div>
        )}

        {/* 6. Audience Sketch */}
        <div style={fadeIn(nextDelay())}>
          <SectionHeader icon={Users} label="Audience Sketch" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Primary */}
            <div
              className={cn(
                "relative rounded-xl p-5 overflow-hidden",
                "bg-surface-white border-2 border-brand-accent/30"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center",
                    "bg-brand-accent/10"
                  )}
                >
                  <Users className="w-4 h-4 text-brand-accent" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">
                  Primary Audience
                </span>
              </div>
              <p className="text-sm text-text-primary leading-relaxed">
                {audienceSketch.primary || "Not specified"}
              </p>
            </div>
            {/* Secondary */}
            <div
              className={cn(
                "relative rounded-xl p-5 overflow-hidden",
                "bg-surface-white border border-surface-200"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center",
                    "bg-surface-100"
                  )}
                >
                  <Users className="w-4 h-4 text-text-tertiary" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                  Secondary Audience
                </span>
              </div>
              <p className="text-sm text-text-primary leading-relaxed">
                {audienceSketch.secondary || "Not specified"}
              </p>
            </div>
          </div>
        </div>

        {/* 7. Messaging Territory */}
        {messagingTerritory && (
          <div style={fadeIn(nextDelay())}>
            <SectionHeader icon={MessageSquare} label="Messaging Territory" />
            <div
              className="relative rounded-xl p-8 text-center overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand-accent), #ec4899)",
              }}
            >
              <p className="text-lg italic font-semibold text-black leading-relaxed max-w-2xl mx-auto">
                &ldquo;{messagingTerritory}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* 8. Budget Reality Check */}
        <div style={fadeIn(nextDelay())}>
          <SectionHeader icon={TrendingDown} label="Budget Reality Check" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Can Do */}
            <div
              className={cn(
                "rounded-xl p-5",
                "bg-surface-white border border-surface-200"
              )}
            >
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-status-success mb-4">
                Can Do
              </h4>
              <ul className="space-y-3">
                {asStringArray(budgetRealityCheck.can_do).map((item, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-3 rounded-lg p-3",
                      "bg-status-success/5"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4 text-status-success mt-0.5 shrink-0" />
                    <span className="text-sm text-text-secondary leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
                {asStringArray(budgetRealityCheck.can_do).length === 0 && (
                  <li className="text-xs text-text-tertiary italic">
                    No items
                  </li>
                )}
              </ul>
            </div>
            {/* Cannot Do */}
            <div
              className={cn(
                "rounded-xl p-5",
                "bg-surface-white border border-surface-200"
              )}
            >
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-status-error mb-4">
                Cannot Do
              </h4>
              <ul className="space-y-3">
                {asStringArray(budgetRealityCheck.cannot_do).map((item, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-3 rounded-lg p-3",
                      "bg-status-error/5"
                    )}
                  >
                    <XCircle className="w-4 h-4 text-status-error mt-0.5 shrink-0" />
                    <span className="text-sm text-text-secondary leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
                {asStringArray(budgetRealityCheck.cannot_do).length === 0 && (
                  <li className="text-xs text-text-tertiary italic">
                    No items
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* 9. Footer */}
        <div
          style={fadeIn(nextDelay())}
          className={cn(
            "sticky bottom-0 z-20",
            "border-t border-surface-200 pt-5 pb-2 space-y-4",
            "bg-surface-50/80 backdrop-blur-md -mx-1 px-1"
          )}
        >
          {/* Warning banner */}
          <div
            className={cn(
              "flex items-center gap-3",
              "bg-amber-500/10 border border-amber-500/20",
              "rounded-lg px-5 py-3"
            )}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-medium text-amber-400">
              Review carefully — this strategic brief guides the full campaign plan
            </span>
          </div>

          {/* Action buttons */}
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
                disabled={isApproving}
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
                {isApproving ? "Approving..." : "Approve & Generate Plan"}
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

/* ─── SWOT Quadrant (Glass-effect card) ─── */

function SwotQuadrant({
  title,
  items,
  gradientFrom,
  gradientTo,
  dotClass,
  textClass,
  labelClass,
}: {
  title: string;
  items: string[];
  gradientFrom: string;
  gradientTo: string;
  dotClass: string;
  textClass: string;
  labelClass: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden",
        "bg-surface-white/60 backdrop-blur-sm",
        "border border-surface-200"
      )}
    >
      {/* Colored top bar gradient */}
      <div
        className="h-[3px]"
        style={{
          background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
        }}
      />
      <div className="p-4">
        <h4
          className={cn(
            "text-[10px] font-bold uppercase tracking-widest mb-3",
            labelClass
          )}
        >
          {title}
        </h4>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                  dotClass
                )}
              />
              <span className={cn("text-sm leading-relaxed", textClass)}>
                {item}
              </span>
            </li>
          ))}
          {items.length === 0 && (
            <li className={cn("text-xs italic opacity-50", textClass)}>
              No items
            </li>
          )}
        </ul>
      </div>
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
            Generating Strategic Brief...
          </p>
        </div>

        {/* Skeleton card 1 — large */}
        <div
          className="rounded-xl bg-surface-100 border border-surface-200 h-28"
          style={pulseStyle(0)}
        />

        {/* Skeleton card 2 — 2x2 grid */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className="rounded-xl bg-surface-100 border border-surface-200 h-32"
            style={pulseStyle(150)}
          />
          <div
            className="rounded-xl bg-surface-100 border border-surface-200 h-32"
            style={pulseStyle(300)}
          />
          <div
            className="rounded-xl bg-surface-100 border border-surface-200 h-32"
            style={pulseStyle(450)}
          />
          <div
            className="rounded-xl bg-surface-100 border border-surface-200 h-32"
            style={pulseStyle(600)}
          />
        </div>

        {/* Skeleton card 3 — full width dark */}
        <div
          className="rounded-xl bg-slate-900 border border-surface-200 h-20"
          style={pulseStyle(750)}
        />

        {/* Skeleton card 4 — two columns */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className="rounded-xl bg-surface-100 border border-surface-200 h-24"
            style={pulseStyle(900)}
          />
          <div
            className="rounded-xl bg-surface-100 border border-surface-200 h-24"
            style={pulseStyle(1050)}
          />
        </div>
      </div>
    </>
  );
}
