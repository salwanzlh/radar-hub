import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, ArrowRight, ExternalLink } from "lucide-react";
import { api } from "@/lib/api-client";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-status-error/10 text-status-error",
  medium: "bg-status-warning/10 text-status-warning",
  low: "bg-status-success/10 text-status-success",
};

const SEVERITY_DOT_COLORS: Record<string, string> = {
  red: "bg-status-error",
  yellow: "bg-status-warning",
  green: "bg-status-success",
};

interface Props {
  recommendation: Record<string, unknown>;
  linkedFindings: Record<string, unknown>[];
  lineupReportId: string;
  onClose: () => void;
  existingPlanId: string | null;
}

export default function GeneratePlanModal({
  recommendation,
  linkedFindings,
  lineupReportId,
  onClose,
  existingPlanId,
}: Props) {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priority = String(recommendation.priority ?? "medium").toLowerCase();
  const area = String(recommendation.area ?? "");
  const recText = String(recommendation.recommendation ?? "");
  const supportingData = Array.isArray(recommendation.supporting_data)
    ? (recommendation.supporting_data as string[])
    : [];

  async function handleStartPlanning() {
    setIsCreating(true);
    setError(null);
    try {
      const result = await api.campaignPlan.create({
        lineup_report_id: lineupReportId,
        recommendation_id: recommendation.id as number,
      });
      navigate(`/campaign-planner/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Generate Marketing Plan"
    >
      <div className="bg-surface-white rounded-2xl shadow-dropdown w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            Generate Marketing Plan
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Recommendation card */}
          <div className="rounded-xl border border-surface-200 p-4 bg-surface-50">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium}`}
              >
                {priority}
              </span>
              {area && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-surface-100 text-text-secondary">
                  {area}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-text-primary leading-snug">
              {recText}
            </p>
          </div>

          {/* Linked Findings */}
          {linkedFindings.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                Linked Findings
              </p>
              <ul className="space-y-1.5">
                {linkedFindings.map((f, i) => {
                  const severity = String(
                    (f as Record<string, unknown>).severity ?? "yellow"
                  );
                  const headline = String(
                    (f as Record<string, unknown>).headline ?? ""
                  );
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                      <span
                        className={`mt-1 w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT_COLORS[severity] ?? SEVERITY_DOT_COLORS.yellow}`}
                      />
                      <span className="leading-relaxed">{headline}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Supporting Data */}
          {supportingData.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                Supporting Data
              </p>
              <ul className="space-y-1 text-xs text-text-secondary">
                {supportingData.map((s, i) => (
                  <li key={i} className="leading-relaxed">
                    &bull; {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Flow explanation */}
          <div className="rounded-xl bg-brand-accent/5 border border-brand-accent/20 p-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              You'll go through:{" "}
              <span className="font-semibold text-text-primary">
                Audit
              </span>{" "}
              &rarr;{" "}
              <span className="font-semibold text-text-primary">
                Clarification
              </span>{" "}
              &rarr;{" "}
              <span className="font-semibold text-text-primary">
                Summary
              </span>{" "}
              &rarr;{" "}
              <span className="font-semibold text-text-primary">
                Plan
              </span>
            </p>
          </div>

          {/* Existing plan notice */}
          {existingPlanId && (
            <div className="rounded-xl bg-status-warning/5 border border-status-warning/20 p-3">
              <p className="text-xs text-status-warning font-medium mb-2">
                A plan already exists for this recommendation.
              </p>
              <button
                onClick={() => navigate(`/campaign-planner/${existingPlanId}`)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-accent hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View Existing Plan
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-status-error/5 border border-status-error/20 p-3">
              <p className="text-xs text-status-error">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors text-text-secondary"
          >
            Cancel
          </button>
          {!existingPlanId && (
            <button
              type="button"
              onClick={handleStartPlanning}
              disabled={isCreating}
              className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
            >
              {isCreating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              Start Planning
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
