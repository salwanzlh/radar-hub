import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, Loader2, ArrowRight, ExternalLink, XCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const SEVERITY_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  red: {
    bg: "bg-gradient-to-r from-red-600 to-red-500",
    text: "text-white",
    ring: "ring-red-500/30",
  },
  yellow: {
    bg: "bg-gradient-to-r from-amber-600 to-amber-500",
    text: "text-white",
    ring: "ring-amber-500/30",
  },
  green: {
    bg: "bg-gradient-to-r from-green-600 to-green-500",
    text: "text-white",
    ring: "ring-green-500/30",
  },
};

const FLOW_STEPS = ["Situation", "Clarify", "Summary", "Plan"] as const;

interface Props {
  finding: Record<string, unknown>;
  lineupReportId: string;
  onClose: () => void;
  existingPlanId: string | null;
}

export default function GeneratePlanModal({
  finding,
  lineupReportId,
  onClose,
  existingPlanId,
}: Props) {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const severity = String(finding.severity ?? "yellow").toLowerCase();
  const category = String(finding.category ?? "");
  const headline = String(finding.headline ?? "");
  const evidence = String(finding.evidence ?? "");
  const impactOnProduct = String(finding.impact_on_product ?? "");
  const sources = Array.isArray(finding.sources) ? (finding.sources as string[]) : [];

  async function handleStartPlanning() {
    setIsCreating(true);
    setError(null);
    try {
      const result = await api.marketingPlanner.create({
        lineup_report_id: lineupReportId,
        finding_id: finding.id as number,
      });
      navigate(`/marketing-planner/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setIsCreating(false);
    }
  }

  const priorityCfg = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.yellow;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Generate Marketing Plan"
    >
      <div
        className={cn(
          "bg-surface-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] flex flex-col overflow-hidden",
          "animate-modal-enter"
        )}
      >
        {/* Gradient top bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-brand-accent to-red-600 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 shrink-0">
          <h2 className="text-base font-bold text-text-primary">
            Generate Marketing Plan
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Key Finding preview card */}
          <div className="relative rounded-xl bg-gradient-to-r from-surface-50 to-surface-white overflow-hidden">
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent rounded-l-xl" />
            <div className="pl-5 pr-4 py-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1",
                    priorityCfg.bg,
                    priorityCfg.text,
                    priorityCfg.ring
                  )}
                >
                  {severity}
                </span>
                {category && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-surface-100 text-text-secondary">
                    {category}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-text-primary leading-snug">
                {headline}
              </p>
              {evidence && (
                <p className="text-xs text-text-secondary leading-relaxed mt-2">
                  {evidence}
                </p>
              )}
              {impactOnProduct && (
                <p className="text-xs text-text-secondary leading-relaxed italic mt-2">
                  Impact: {impactOnProduct}
                </p>
              )}
            </div>
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2.5">
                Sources
              </p>
              <ol className="space-y-1.5 text-xs text-text-secondary">
                {sources.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-surface-100 flex items-center justify-center text-[10px] font-bold text-text-tertiary shrink-0 mt-px">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Flow steps - visual mini-stepper */}
          <div className="rounded-xl bg-brand-accent/5 border border-brand-accent/15 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              Planning Flow
            </p>
            <div className="flex items-center justify-between">
              {FLOW_STEPS.map((step, i) => (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold",
                        "bg-brand-accent/15 text-brand-accent"
                      )}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[10px] font-semibold text-text-secondary">
                      {step}
                    </span>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <div className="w-8 sm:w-12 h-px bg-brand-accent/20 mx-1 -mt-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Existing plan notice */}
          {existingPlanId && (
            <div className="rounded-xl bg-status-warning-light border-l-4 border-status-warning p-4">
              <p className="text-xs text-text-primary font-medium mb-2">
                A plan already exists for this finding.
              </p>
              <button
                onClick={() => navigate(`/marketing-planner/${existingPlanId}`)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View Existing Plan
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-status-error-light border border-status-error/20 p-4 flex items-start gap-3">
              <XCircle className="w-4 h-4 text-status-error shrink-0 mt-0.5" />
              <p className="text-xs text-status-error">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "px-5 py-2.5 text-sm font-medium rounded-xl",
              "border border-surface-200 text-text-secondary",
              "hover:bg-surface-100 transition-colors"
            )}
          >
            Cancel
          </button>
          {!existingPlanId && (
            <button
              type="button"
              onClick={handleStartPlanning}
              disabled={isCreating}
              className={cn(
                "px-6 py-2.5 text-sm font-semibold rounded-xl",
                "bg-gradient-to-r from-brand-accent to-red-600 text-text-inverse",
                "shadow-lg hover:shadow-xl",
                "disabled:opacity-60 transition-all duration-200",
                "flex items-center gap-2"
              )}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating plan...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Start Planning
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
