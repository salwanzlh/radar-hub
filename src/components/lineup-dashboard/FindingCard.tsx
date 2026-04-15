import type { Finding } from "./types";
import { SEVERITY_CLASSES } from "./constants";
import SourceText from "./SourceText";

interface Props {
  finding: Finding;
  isActive: boolean;
  isLinked: boolean;
  onClick: () => void;
}

export default function FindingCard({ finding, isActive, isLinked, onClick }: Props) {
  const c = SEVERITY_CLASSES[finding.severity] ?? SEVERITY_CLASSES.yellow;
  const bgClass = isActive ? c.bgActive : isLinked ? c.bg : "bg-surface-50";
  const borderClass = isActive ? c.border : isLinked ? c.borderSoft : "border-surface-200";

  return (
    <div
      id={`finding-${finding.id}`}
      role="button"
      tabIndex={0}
      aria-expanded={isActive}
      aria-label={`Finding: ${finding.headline}`}
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
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.dot}`} />
      )}
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${c.tag}`}>
          {finding.category}
        </span>
      </div>
      <p className="text-sm font-semibold text-text-primary leading-snug">
        {finding.headline}
      </p>
      <div
        className={`overflow-hidden transition-all duration-300 ${isActive ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"}`}
      >
        <p className="text-xs text-text-secondary leading-relaxed mb-2">
          {finding.evidence}
        </p>
        {finding.impact_on_product && (
          <p className="text-xs text-text-secondary leading-relaxed italic mb-2">
            Impact: {finding.impact_on_product}
          </p>
        )}
        {finding.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-surface-200">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Sources
            </p>
            <ul className="text-[11px] text-text-tertiary space-y-0.5">
              {finding.sources.map((s, i) => (
                <li key={i}>• <SourceText text={s} /></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
