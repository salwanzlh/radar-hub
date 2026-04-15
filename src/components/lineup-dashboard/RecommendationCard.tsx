import type { Recommendation } from "./types";
import { SEVERITY_CLASSES, PRIORITY_TO_SEVERITY, CATEGORY_ICONS } from "./constants";
import SourceText from "./SourceText";

interface Props {
  recommendation: Recommendation;
  isActive: boolean;
  isLinked: boolean;
  onClick: () => void;
}

export default function RecommendationCard({ recommendation, isActive, isLinked, onClick }: Props) {
  const severity = PRIORITY_TO_SEVERITY[recommendation.priority] ?? "yellow";
  const c = SEVERITY_CLASSES[severity] ?? SEVERITY_CLASSES.yellow;
  const bgClass = isActive ? c.bgActive : isLinked ? c.bg : "bg-surface-50";
  const borderClass = isActive ? c.border : isLinked ? c.borderSoft : "border-surface-200";

  return (
    <div
      id={`rec-${recommendation.id}`}
      role="button"
      tabIndex={0}
      aria-expanded={isActive}
      aria-label={`Recommendation: ${recommendation.recommendation}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative overflow-hidden rounded-xl border-2 p-4 cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 ${bgClass} ${borderClass} ${isActive ? "scale-[1.01] shadow-md" : ""}`}
    >
      {isActive && (
        <div className={`absolute right-0 top-0 bottom-0 w-1 ${c.dot}`} />
      )}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold text-white font-mono ${c.dot}`}>
          {recommendation.id}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-mono bg-surface-100 text-text-secondary">
          {CATEGORY_ICONS[recommendation.area]}
          {recommendation.area}
        </span>
      </div>
      <p className="text-sm font-semibold text-text-primary leading-snug">
        {recommendation.recommendation}
      </p>
      <div
        className={`overflow-hidden transition-all duration-300 ${isActive ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"}`}
      >
        <p className="text-xs text-text-secondary leading-relaxed">
          {recommendation.rationale}
        </p>
        {recommendation.supporting_data.length > 0 && (
          <div className="mt-2 pt-2 border-t border-surface-200">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Supporting Data
            </p>
            <ul className="text-[11px] text-text-tertiary space-y-0.5">
              {recommendation.supporting_data.map((s, i) => (
                <li key={i}>• <SourceText text={s} /></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
