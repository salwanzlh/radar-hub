import { useState } from "react";
import type { LineupDashboardProps } from "./types";
import FindingCard from "./FindingCard";

export default function LineupDashboard({
  findings,
  productName,
  dateFrom,
  dateTo,
  lineupReportId,
}: LineupDashboardProps) {
  const [activeFindingId, setActiveFindingId] = useState<number | null>(null);

  function handleFindingClick(id: number) {
    setActiveFindingId((current) => (current === id ? null : id));
  }

  const hasFindings = findings.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-surface-200 pb-4">
        <h2 className="text-lg font-bold text-text-primary">
          {productName} Impact Assessment
        </h2>
        <p className="text-xs text-text-tertiary font-mono mt-1">
          {dateFrom} — {dateTo}
        </p>
        <p className="text-xs text-text-secondary mt-2">
          Click any finding to expand details and generate a marketing plan from it.
        </p>
      </div>

      {/* Key Findings */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-4 rounded bg-status-error" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary font-mono">
            Key Findings
          </h3>
        </div>
        <div className="flex flex-col gap-2">
          {hasFindings ? (
            findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                isActive={activeFindingId === finding.id}
                isLinked={false}
                onClick={() => handleFindingClick(finding.id)}
                lineupReportId={lineupReportId}
              />
            ))
          ) : (
            <p className="text-sm text-text-tertiary py-8 text-center">
              No findings available for this report.
            </p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-surface-200">
        {[
          { color: "bg-status-error", label: "Critical" },
          { color: "bg-status-warning", label: "Moderate" },
          { color: "bg-status-success", label: "Positive" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />
            <span className="text-[10px] font-mono text-text-tertiary font-medium">
              {l.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
