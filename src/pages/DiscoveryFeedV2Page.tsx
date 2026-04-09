import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Workflow,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  api,
  type DiscoveryAgentStageResult,
  type DiscoveryFeedPipelineStatus,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * The 7-stage MITRA Discovery Feed pipeline. Order matters for the progress
 * UI — Step 1+2 run in parallel on the backend but we still show them in
 * order so the user can understand the dependency graph.
 */
const STAGE_DEFINITIONS: {
  key: keyof Pick<
    DiscoveryFeedPipelineStatus,
    | "trend_synthesis"
    | "sentiment_analysis"
    | "insight_synthesis"
    | "competitive_gap"
    | "positioning"
    | "evidence_validation"
    | "content_creation"
  >;
  label: string;
  step: string;
  description: string;
}[] = [
  {
    key: "trend_synthesis",
    label: "Trend Synthesis",
    step: "1.1",
    description: "Macro & category trends from news articles",
  },
  {
    key: "sentiment_analysis",
    label: "Sentiment Analysis",
    step: "1.2",
    description: "Audience themes & emotional intensity",
  },
  {
    key: "insight_synthesis",
    label: "Insight Synthesis",
    step: "2.1",
    description: "Latent needs & Jobs-to-be-Done",
  },
  {
    key: "competitive_gap",
    label: "Competitive Gap Analysis",
    step: "2.2",
    description: "Weaknesses, parities, undeniable edges",
  },
  {
    key: "positioning",
    label: "Positioning",
    step: "3.1",
    description: "One defensible positioning territory",
  },
  {
    key: "evidence_validation",
    label: "Evidence Validation",
    step: "3.2",
    description: "Fact-check every claim with proof points",
  },
  {
    key: "content_creation",
    label: "Content Creation",
    step: "4.1",
    description: "Hero Headline, Tagline, Talking Points",
  },
];

export default function DiscoveryFeedV2Page() {
  const queryClient = useQueryClient();
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [selectedLineupId, setSelectedLineupId] = useState<string | null>(null);

  // Fetch lineups so the user can pick one to run
  const { data: lineups, isLoading: lineupsLoading } = useQuery({
    queryKey: ["lineups"],
    queryFn: api.lineupAnalysis.lineups,
  });

  // Default to first lineup
  const effectiveLineupId = selectedLineupId || lineups?.[0]?.id || null;

  // Fetch recent pipeline runs
  const { data: recentPipelines } = useQuery({
    queryKey: ["discovery-feed-v2-recent"],
    queryFn: () => api.discoveryFeedV2.listRecent({ limit: 20 }),
    refetchInterval: 5000,
  });

  // Poll the active pipeline status
  const { data: activePipeline } = useQuery({
    queryKey: ["discovery-feed-v2", activePipelineId],
    queryFn: () =>
      activePipelineId
        ? api.discoveryFeedV2.getStatus(activePipelineId)
        : Promise.resolve(null),
    enabled: !!activePipelineId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1500;
      if (data.status === "completed" || data.status === "failed") return false;
      return 1500;
    },
  });

  // Start a new pipeline
  const generateMutation = useMutation({
    mutationFn: (lineupId: string) =>
      api.discoveryFeedV2.generate({ lineup_id: lineupId }),
    onSuccess: (res) => {
      setActivePipelineId(res.pipeline_id);
      queryClient.invalidateQueries({
        queryKey: ["discovery-feed-v2-recent"],
      });
      toast.success("Discovery feed pipeline started");
    },
    onError: (err: Error) => {
      toast.error(`Failed to start pipeline: ${err.message}`);
    },
  });

  const activeLineup = lineups?.find((l) => l.id === effectiveLineupId);
  const isRunning =
    activePipeline?.status === "pending" ||
    activePipeline?.status === "running";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Workflow className="w-4 h-4 text-brand-accent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-accent">
                Discovery Feed v2 — Agentic Pipeline
              </span>
            </div>
            <h2 className="text-lg font-semibold text-text-primary tracking-tight">
              7-Agent Campaign Key Message Generator
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Run the full Discover → Analyze → Frame → Craft pipeline on Azure
              AI Foundry to generate a validated campaign message.
            </p>
          </div>
          <button
            onClick={() =>
              effectiveLineupId && generateMutation.mutate(effectiveLineupId)
            }
            disabled={
              !effectiveLineupId || generateMutation.isPending || isRunning
            }
            className="px-5 py-2.5 bg-brand-accent text-text-inverse text-sm font-semibold rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 transition-colors flex items-center gap-2 shrink-0"
          >
            {generateMutation.isPending || isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Running...
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4" /> Generate Discovery Feed
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lineup picker */}
      <div className="bg-surface-white rounded-[20px] shadow-card overflow-hidden">
        <div className="border-b border-surface-100 px-4 pt-4 pb-0">
          {lineupsLoading ? (
            <div className="flex gap-2 pb-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-28 bg-surface-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : lineups && lineups.length > 0 ? (
            <div className="flex overflow-x-auto gap-1 scrollbar-hide">
              {lineups.map((lineup) => {
                const isActive = lineup.id === effectiveLineupId;
                return (
                  <button
                    key={lineup.id}
                    onClick={() => {
                      setSelectedLineupId(lineup.id);
                      setActivePipelineId(null);
                    }}
                    className={cn(
                      "relative px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 whitespace-nowrap shrink-0",
                      isActive
                        ? "bg-surface-100 text-text-primary"
                        : "text-text-tertiary hover:text-text-secondary hover:bg-surface-50"
                    )}
                  >
                    {lineup.name}
                    {isActive && (
                      <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-accent rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-sm text-text-tertiary text-center">
              No product lineups found
            </div>
          )}
        </div>

        {/* Active lineup info */}
        {activeLineup && (
          <div className="p-7">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-base font-semibold text-text-primary">
                {activeLineup.name}
              </h3>
              {activeLineup.segment && (
                <span className="text-[11px] px-2 py-0.5 bg-surface-100 rounded-md text-text-tertiary">
                  {activeLineup.segment}
                </span>
              )}
            </div>
            {activeLineup.competitors &&
              activeLineup.competitors.length > 0 && (
                <p className="text-xs text-text-tertiary">
                  vs {activeLineup.competitors.join(", ")}
                </p>
              )}

            {/* Pipeline progress */}
            {activePipelineId && activePipeline && (
              <PipelineProgress pipeline={activePipeline} />
            )}

            {/* Empty state */}
            {!activePipelineId && (
              <div className="mt-6 text-center py-12 rounded-2xl border border-dashed border-surface-200">
                <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <BrainCircuit className="w-6 h-6 text-brand-accent" />
                </div>
                <p className="text-sm text-text-primary font-medium">
                  Ready to generate
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Click "Generate Discovery Feed" to start the 7-agent pipeline.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent runs */}
      {recentPipelines && recentPipelines.length > 0 && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-7">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Recent Pipeline Runs
          </h3>
          <div className="space-y-2">
            {recentPipelines.slice(0, 10).map((p) => (
              <button
                key={p.pipeline_id}
                onClick={() => setActivePipelineId(p.pipeline_id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between",
                  activePipelineId === p.pipeline_id
                    ? "border-brand-accent bg-brand-accent/5"
                    : "border-surface-100 hover:bg-surface-50"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusIcon status={p.status} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {p.target_product}
                    </div>
                    <div className="text-[11px] text-text-tertiary">
                      {p.started_at
                        ? new Date(p.started_at).toLocaleString("id-ID")
                        : "Not started"}
                      {p.total_duration_ms != null &&
                        ` · ${Math.round(p.total_duration_ms / 1000)}s`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-text-tertiary">
                    {p.progress_percent}%
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-tertiary" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stage progress component ────────────────────────────────

function PipelineProgress({
  pipeline,
}: {
  pipeline: DiscoveryFeedPipelineStatus;
}) {
  return (
    <div className="mt-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">
            Progress
          </span>
          {pipeline.current_stage && (
            <span className="text-[11px] text-text-tertiary">
              — {pipeline.current_stage}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-text-primary">
          {pipeline.progress_percent}% ({pipeline.completed_stages}/7)
        </span>
      </div>
      <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden mb-6">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pipeline.status === "failed"
              ? "bg-status-error"
              : "bg-brand-accent"
          )}
          style={{ width: `${pipeline.progress_percent}%` }}
        />
      </div>

      {/* Error message */}
      {pipeline.status === "failed" && pipeline.error && (
        <div className="mb-6 p-4 rounded-xl bg-status-error-light border border-status-error/20">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-status-error shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-status-error">
                Pipeline failed
              </div>
              <div className="text-xs text-text-secondary mt-1 break-words">
                {pipeline.error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage list */}
      <div className="space-y-1.5">
        {STAGE_DEFINITIONS.map((def) => {
          const stage = pipeline[def.key] as DiscoveryAgentStageResult | null;
          const isDone = stage !== null;
          const isFailed =
            pipeline.status === "failed" &&
            !isDone &&
            pipeline.current_stage?.includes(def.step);
          return (
            <StageRow
              key={def.key}
              step={def.step}
              label={def.label}
              description={def.description}
              stage={stage}
              isDone={isDone}
              isFailed={isFailed ?? false}
            />
          );
        })}
      </div>

      {/* Deliverables preview */}
      {pipeline.status === "completed" && (
        <DeliverablesPanel pipeline={pipeline} />
      )}
    </div>
  );
}

function StageRow({
  step,
  label,
  description,
  stage,
  isDone,
  isFailed,
}: {
  step: string;
  label: string;
  description: string;
  stage: DiscoveryAgentStageResult | null;
  isDone: boolean;
  isFailed: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl",
        isDone && "bg-surface-50",
        isFailed && "bg-status-error-light"
      )}
    >
      <div className="shrink-0">
        {isFailed ? (
          <XCircle className="w-4 h-4 text-status-error" />
        ) : isDone ? (
          <CheckCircle2 className="w-4 h-4 text-status-success" />
        ) : (
          <Clock className="w-4 h-4 text-text-tertiary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-text-tertiary">
            {step}
          </span>
          <span className="text-sm font-medium text-text-primary">
            {label}
          </span>
        </div>
        <div className="text-[11px] text-text-tertiary truncate">
          {description}
        </div>
      </div>
      {stage && (
        <div className="shrink-0 text-[11px] text-text-tertiary">
          {(stage.duration_ms / 1000).toFixed(1)}s
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-status-error shrink-0" />;
    case "running":
    case "pending":
      return (
        <Loader2 className="w-4 h-4 animate-spin text-brand-accent shrink-0" />
      );
    default:
      return <Clock className="w-4 h-4 text-text-tertiary shrink-0" />;
  }
}

// ── Deliverables panel (A/B/C) ──────────────────────────────

function DeliverablesPanel({
  pipeline,
}: {
  pipeline: DiscoveryFeedPipelineStatus;
}) {
  const a = pipeline.deliverable_A as Record<string, unknown> | null;
  const b = pipeline.deliverable_B as Record<string, unknown> | null;
  const c = pipeline.deliverable_C as Record<string, unknown> | null;

  if (!a && !b && !c) return null;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-brand-accent rounded-full" />
        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-primary">
          Final Deliverables
        </h4>
      </div>

      {/* Deliverable A */}
      {a && (
        <DeliverableCard
          letter="A"
          title="Campaign Key Message"
          subtitle="Hero headline, tagline, talking points, channel guide"
          data={a}
        />
      )}

      {/* Deliverable B */}
      {b && (
        <DeliverableCard
          letter="B"
          title="Key Message Interpretation"
          subtitle="Audience simplicity, value prop, tone alignment, objections"
          data={b}
        />
      )}

      {/* Deliverable C */}
      {c && (
        <DeliverableCard
          letter="C"
          title="Detailed Analysis"
          subtitle="Trend, insight, positioning, differentiation, proof map"
          data={c}
        />
      )}
    </div>
  );
}

function DeliverableCard({
  letter,
  title,
  subtitle,
  data,
}: {
  letter: string;
  title: string;
  subtitle: string;
  data: Record<string, unknown>;
}) {
  const [expanded, setExpanded] = useState(letter === "A");
  return (
    <div className="border border-surface-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-50 transition-colors"
      >
        <span className="w-8 h-8 rounded-xl bg-brand-accent/15 flex items-center justify-center text-sm font-bold text-brand-accent">
          {letter}
        </span>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold text-text-primary">{title}</div>
          <div className="text-[11px] text-text-tertiary">{subtitle}</div>
        </div>
        <ChevronRight
          className={cn(
            "w-4 h-4 text-text-tertiary transition-transform",
            expanded && "rotate-90"
          )}
        />
      </button>
      {expanded && (
        <div className="p-4 border-t border-surface-100 bg-surface-50">
          <pre className="text-[11px] text-text-secondary whitespace-pre-wrap font-mono overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
