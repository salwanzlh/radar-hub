import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
        <p className="text-sm font-medium text-text-secondary">
          Generating Strategic Brief...
        </p>
      </div>
    );
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

  return (
    <div className="space-y-6">
      {/* 1. Situation Snapshot */}
      {situationSnapshot && (
        <Section label="Situation Snapshot">
          <div className="bg-surface-white rounded-xl border border-surface-100 p-5">
            <p className="text-sm text-text-secondary leading-relaxed">
              {situationSnapshot}
            </p>
          </div>
        </Section>
      )}

      {/* 2. SWOT Analysis */}
      <Section label="SWOT Analysis">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SwotQuadrant
            title="Strengths"
            items={asStringArray(swot.strengths)}
            bgClass="bg-emerald-50"
            borderClass="border-emerald-200"
            textClass="text-emerald-700"
            bulletClass="bg-emerald-500"
          />
          <SwotQuadrant
            title="Weaknesses"
            items={asStringArray(swot.weaknesses)}
            bgClass="bg-red-50"
            borderClass="border-red-200"
            textClass="text-red-700"
            bulletClass="bg-red-500"
          />
          <SwotQuadrant
            title="Opportunities"
            items={asStringArray(swot.opportunities)}
            bgClass="bg-blue-50"
            borderClass="border-blue-200"
            textClass="text-blue-700"
            bulletClass="bg-blue-500"
          />
          <SwotQuadrant
            title="Threats"
            items={asStringArray(swot.threats)}
            bgClass="bg-amber-50"
            borderClass="border-amber-200"
            textClass="text-amber-700"
            bulletClass="bg-amber-500"
          />
        </div>
      </Section>

      {/* 3. Core Strategic Tension */}
      {coreStrategicTension && (
        <Section label="Core Strategic Tension">
          <div className="bg-surface-white rounded-xl border-l-4 border-brand-accent border border-surface-100 p-5">
            <p className="text-sm font-semibold text-text-primary leading-relaxed">
              {coreStrategicTension}
            </p>
          </div>
        </Section>
      )}

      {/* 4. Strategic Play */}
      <Section label="Strategic Play">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-600 mb-3">
              Their Narrative
            </h4>
            <ul className="space-y-2">
              {asStringArray(strategicPlay.their_narrative).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <span className="text-sm text-red-700 leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
              {asStringArray(strategicPlay.their_narrative).length === 0 && (
                <li className="text-xs text-red-400 italic">No data</li>
              )}
            </ul>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-3">
              Our Counter-Narrative
            </h4>
            <ul className="space-y-2">
              {asStringArray(strategicPlay.our_counter_narrative).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="text-sm text-emerald-700 leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
              {asStringArray(strategicPlay.our_counter_narrative).length === 0 && (
                <li className="text-xs text-emerald-400 italic">No data</li>
              )}
            </ul>
          </div>
        </div>
      </Section>

      {/* 5. Positioning Direction */}
      {positioningDirection && (
        <Section label="Positioning Direction">
          <div className="bg-surface-white rounded-xl border border-surface-100 p-5">
            <p className="text-sm text-text-secondary leading-relaxed">
              {positioningDirection}
            </p>
          </div>
        </Section>
      )}

      {/* 6. Audience Sketch */}
      <Section label="Audience Sketch">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-surface-white rounded-xl border border-surface-100 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-2">
              Primary
            </h4>
            <p className="text-sm text-text-primary leading-relaxed">
              {audienceSketch.primary || "Not specified"}
            </p>
          </div>
          <div className="bg-surface-white rounded-xl border border-surface-100 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-2">
              Secondary
            </h4>
            <p className="text-sm text-text-primary leading-relaxed">
              {audienceSketch.secondary || "Not specified"}
            </p>
          </div>
        </div>
      </Section>

      {/* 7. Messaging Territory */}
      {messagingTerritory && (
        <Section label="Messaging Territory">
          <div className="bg-brand-accent/5 rounded-xl border border-brand-accent/20 p-5">
            <p className="text-sm text-text-primary leading-relaxed italic">
              &ldquo;{messagingTerritory}&rdquo;
            </p>
          </div>
        </Section>
      )}

      {/* 8. Budget Reality Check */}
      <Section label="Budget Reality Check">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-surface-white rounded-xl border border-surface-100 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-status-success mb-3">
              Can Do
            </h4>
            <ul className="space-y-2">
              {asStringArray(budgetRealityCheck.can_do).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success mt-0.5 shrink-0" />
                  <span className="text-sm text-text-secondary leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
              {asStringArray(budgetRealityCheck.can_do).length === 0 && (
                <li className="text-xs text-text-tertiary italic">No items</li>
              )}
            </ul>
          </div>
          <div className="bg-surface-white rounded-xl border border-surface-100 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-600 mb-3">
              Cannot Do
            </h4>
            <ul className="space-y-2">
              {asStringArray(budgetRealityCheck.cannot_do).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <span className="text-sm text-text-secondary leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
              {asStringArray(budgetRealityCheck.cannot_do).length === 0 && (
                <li className="text-xs text-text-tertiary italic">No items</li>
              )}
            </ul>
          </div>
        </div>
      </Section>

      {/* 9. Footer */}
      <div className="border-t border-surface-100 pt-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-medium">
            Review carefully — this guides the full plan
          </span>
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-surface-200 text-sm font-medium text-text-secondary hover:bg-surface-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Clarification
          </button>
          {isApproved ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-status-success/10 text-status-success text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Brief Approved
            </span>
          ) : (
            <button
              type="button"
              onClick={onApprove}
              disabled={isApproving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {isApproving ? "Approving..." : "Approve & Generate Plan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-0.5 h-4 bg-brand-accent rounded-full" />
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function SwotQuadrant({
  title,
  items,
  bgClass,
  borderClass,
  textClass,
  bulletClass,
}: {
  title: string;
  items: string[];
  bgClass: string;
  borderClass: string;
  textClass: string;
  bulletClass: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4", bgClass, borderClass)}>
      <h4
        className={cn(
          "text-[11px] font-bold uppercase tracking-wider mb-3",
          textClass
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
                bulletClass
              )}
            />
            <span className={cn("text-sm leading-relaxed", textClass)}>
              {item}
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className={cn("text-xs italic opacity-60", textClass)}>
            No items
          </li>
        )}
      </ul>
    </div>
  );
}
