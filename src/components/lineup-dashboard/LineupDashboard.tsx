import { useState, useMemo } from "react";
import type { LineupDashboardProps } from "./types";
import FindingCard from "./FindingCard";
import RecommendationCard from "./RecommendationCard";
import ConnectorLine from "./ConnectorLine";
import { PRIORITY_TO_SEVERITY } from "./constants";

const CONTAINER_ID = "lineup-dashboard-scroll-container";

export default function LineupDashboard({
  findings,
  recommendations,
  productName,
  dateFrom,
  dateTo,
  lineupReportId,
}: LineupDashboardProps) {
  // Each column has its own active card, independent of the other.
  // User can open a finding detail AND a recommendation detail at the same time.
  // Click the active card again to collapse just that side.
  const [activeFindingId, setActiveFindingId] = useState<number | null>(null);
  const [activeRecommendationId, setActiveRecommendationId] = useState<number | null>(null);

  function handleFindingClick(id: number) {
    setActiveFindingId((current) => (current === id ? null : id));
  }

  function handleRecommendationClick(id: number) {
    setActiveRecommendationId((current) => (current === id ? null : id));
  }

  const linkedRecommendationIds = useMemo(() => {
    if (activeFindingId === null) return new Set<number>();
    return new Set(
      recommendations
        .filter((r) => r.finding_ids.includes(activeFindingId))
        .map((r) => r.id)
    );
  }, [activeFindingId, recommendations]);

  const linkedFindingIds = useMemo(() => {
    if (activeRecommendationId === null) return new Set<number>();
    const rec = recommendations.find((r) => r.id === activeRecommendationId);
    if (!rec) return new Set<number>();
    return new Set(rec.finding_ids);
  }, [activeRecommendationId, recommendations]);

  const activeConnectors = useMemo(() => {
    const out: Array<{ fromId: number; toId: number; severity: "red" | "yellow" | "green"; isPrimary: boolean }> = [];

    if (activeFindingId !== null) {
      const finding = findings.find((f) => f.id === activeFindingId);
      if (finding) {
        // Draw a line to every recommendation that addresses this finding
        // (either as primary or in finding_ids). Primary line is bolder (via
        // ConnectorLine's `isPrimary` flag) to preserve hierarchy.
        recommendations.forEach((r) => {
          const isPrimary = r.primary_finding_id === activeFindingId;
          const isLinked = r.finding_ids.includes(activeFindingId);
          if (isPrimary || isLinked) {
            out.push({
              fromId: finding.id,
              toId: r.id,
              severity: PRIORITY_TO_SEVERITY[r.priority] ?? "yellow",
              isPrimary,
            });
          }
        });
      }
    }

    if (activeRecommendationId !== null) {
      const rec = recommendations.find((r) => r.id === activeRecommendationId);
      if (rec) {
        // Draw a line to every finding this recommendation addresses.
        // Primary line is bolder to show the main target.
        rec.finding_ids.forEach((fid) => {
          const finding = findings.find((f) => f.id === fid);
          if (finding) {
            out.push({
              fromId: finding.id,
              toId: rec.id,
              severity: PRIORITY_TO_SEVERITY[rec.priority] ?? "yellow",
              isPrimary: rec.primary_finding_id === fid,
            });
          }
        });
      }
    }

    return out;
  }, [activeFindingId, activeRecommendationId, findings, recommendations]);

  const hasFindings = findings.length > 0;
  const hasRecommendations = recommendations.length > 0;

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
          Click any finding or recommendation to expand details and see connections across panels.
        </p>
      </div>

      {/* Main grid */}
      <div
        id={CONTAINER_ID}
        className="grid gap-0 relative items-start"
        style={{ gridTemplateColumns: "1fr 80px 1fr" }}
      >
        {/* Left: Findings */}
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
                  isLinked={linkedFindingIds.has(finding.id)}
                  onClick={() => handleFindingClick(finding.id)}
                />
              ))
            ) : (
              <p className="text-sm text-text-tertiary py-8 text-center">
                No findings available for this report.
              </p>
            )}
          </div>
        </div>

        {/* Center: Connector SVG */}
        <div className="relative h-full">
          <svg
            className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none"
          >
            {activeConnectors.map((conn, i) => (
              <ConnectorLine
                key={`${conn.fromId}-${conn.toId}-${i}`}
                fromId={conn.fromId}
                toId={conn.toId}
                severity={conn.severity}
                isPrimary={conn.isPrimary}
                containerId={CONTAINER_ID}
              />
            ))}
          </svg>
        </div>

        {/* Right: Recommendations */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-4 rounded bg-brand-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary font-mono">
              Strategic Recommendations
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {hasRecommendations ? (
              recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  isActive={activeRecommendationId === rec.id}
                  isLinked={linkedRecommendationIds.has(rec.id)}
                  onClick={() => handleRecommendationClick(rec.id)}
                  lineupReportId={lineupReportId}
                  linkedFindings={
                    findings
                      .filter((f) => rec.finding_ids?.includes(f.id))
                      .map((f) => f as unknown as Record<string, unknown>)
                  }
                />
              ))
            ) : (
              <p className="text-sm text-text-tertiary py-8 text-center">
                No recommendations generated.
              </p>
            )}
          </div>
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
