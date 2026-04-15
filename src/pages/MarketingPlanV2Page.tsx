import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ImageIcon,
  Loader2,
  Pencil,
  RotateCcw,
  Save,
  Workflow,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  api,
  type MarketingPlanV2AgentStageResult,
  type MarketingPlanV2PipelineStatus,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * The 7-stage MITRA Marketing Plan v2 pipeline. Order matters for the
 * progress UI — Step 1+2 run in parallel on the backend but we still show
 * them in order so the user can understand the dependency graph.
 */
const STAGE_DEFINITIONS: {
  key: keyof Pick<
    MarketingPlanV2PipelineStatus,
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

export default function MarketingPlanV2Page() {
  const queryClient = useQueryClient();
  // `runningPipelineId` is set ONLY while a freshly-triggered pipeline is in
  // pending/running state. It is cleared as soon as the pipeline reaches a
  // terminal state, so the UI flips back to showing the deliverables of the
  // last completed run.
  const [runningPipelineId, setRunningPipelineId] = useState<string | null>(
    null
  );
  const [selectedLineupId, setSelectedLineupId] = useState<string | null>(null);
  // When the user picks an older version from the dropdown, store its
  // pipeline_id here. While set, the deliverables panel renders that specific
  // version instead of the latest one. Reset when the lineup changes or after
  // a fresh generation completes.
  const [selectedVersionPipelineId, setSelectedVersionPipelineId] = useState<
    string | null
  >(null);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  // Track which pipeline-completion we've already toasted/handled, so the
  // terminal-state useEffect does not fire repeatedly during polling churn.
  const handledPipelineRef = useRef<string | null>(null);

  // Fetch lineups so the user can pick one to run
  const { data: lineups, isLoading: lineupsLoading } = useQuery({
    queryKey: ["lineups"],
    queryFn: api.lineupAnalysis.lineups,
  });

  // Default to first lineup
  const effectiveLineupId = selectedLineupId || lineups?.[0]?.id || null;

  // The "always-visible" deliverables source: the most recent COMPLETED
  // pipeline for the currently selected lineup. Auto-loaded on mount and
  // whenever the lineup tab changes. Refetch is triggered manually after a
  // new generation completes.
  const { data: latestCompletedPipeline } = useQuery({
    queryKey: ["marketing-plan-v2-latest", effectiveLineupId],
    queryFn: () =>
      effectiveLineupId
        ? api.marketingPlanV2.getLatestForLineup(effectiveLineupId)
        : Promise.resolve(null),
    enabled: !!effectiveLineupId,
  });

  // Full version history for the dropdown. Only completed versions are
  // selectable, but we list everything so users can see failed attempts too.
  const { data: versions = [] } = useQuery({
    queryKey: ["marketing-plan-v2-versions", effectiveLineupId],
    queryFn: () =>
      effectiveLineupId
        ? api.marketingPlanV2.listVersionsForLineup(effectiveLineupId)
        : Promise.resolve([]),
    enabled: !!effectiveLineupId,
  });

  // Specific version override: when the user picks an older version from the
  // dropdown, fetch its full pipeline state. We could read it directly from
  // the `versions` list since it already returns full pipeline rows, but
  // reading from the list keeps things simple and consistent.
  const selectedVersionPipeline = useMemo(() => {
    if (!selectedVersionPipelineId) return null;
    return (
      versions.find((v) => v.pipeline_id === selectedVersionPipelineId) ?? null
    );
  }, [versions, selectedVersionPipelineId]);

  // The pipeline that actually drives the DeliverablesPanel: explicit version
  // override beats latest-completed.
  const completedPipeline =
    selectedVersionPipeline ?? latestCompletedPipeline ?? null;

  // Poll the running pipeline status (if any). Stops polling on terminal.
  const { data: runningPipeline } = useQuery({
    queryKey: ["marketing-plan-v2-running", runningPipelineId],
    queryFn: () =>
      runningPipelineId
        ? api.marketingPlanV2.getStatus(runningPipelineId)
        : Promise.resolve(null),
    enabled: !!runningPipelineId,
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
      api.marketingPlanV2.generate({ lineup_id: lineupId }),
    onSuccess: (res) => {
      setRunningPipelineId(res.pipeline_id);
      handledPipelineRef.current = null;
      toast.success("Marketing plan generation started");
    },
    onError: (err: Error) => {
      toast.error(`Failed to start generation: ${err.message}`);
    },
  });

  // Handle terminal state transitions for the running pipeline.
  // - completed → invalidate the latest-completed query so deliverables refresh,
  //   then clear runningPipelineId so the UI flips to deliverables view
  // - failed → toast.error with the backend error message; KEEP completed
  //   deliverables visible (do NOT replace) by clearing runningPipelineId
  useEffect(() => {
    if (!runningPipeline || !runningPipelineId) return;
    if (handledPipelineRef.current === runningPipelineId) return;
    if (runningPipeline.status === "completed") {
      handledPipelineRef.current = runningPipelineId;
      toast.success("Marketing plan ready");
      queryClient.invalidateQueries({
        queryKey: ["marketing-plan-v2-latest", effectiveLineupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["marketing-plan-v2-versions", effectiveLineupId],
      });
      // Snap back to the freshly-generated (latest) version
      setSelectedVersionPipelineId(null);
      setRunningPipelineId(null);
    } else if (runningPipeline.status === "failed") {
      handledPipelineRef.current = runningPipelineId;
      const errorMsg = runningPipeline.error || "Unknown pipeline error";
      // Keep the toast readable — error JSON can be very long
      const preview = errorMsg.length > 200 ? errorMsg.slice(0, 200) + "…" : errorMsg;
      toast.error(`Generation failed: ${preview}`, { duration: 8000 });
      // Failed runs still create a row, so refresh the versions list so the
      // user can see/choose it from the dropdown if desired.
      queryClient.invalidateQueries({
        queryKey: ["marketing-plan-v2-versions", effectiveLineupId],
      });
      setRunningPipelineId(null);
    }
  }, [runningPipeline, runningPipelineId, effectiveLineupId, queryClient]);

  const activeLineup = lineups?.find((l) => l.id === effectiveLineupId);
  const isRunning =
    runningPipeline?.status === "pending" ||
    runningPipeline?.status === "running";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-surface-white rounded-[20px] shadow-card px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Workflow className="w-3.5 h-3.5 text-brand-accent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-accent">
                Marketing Plan
              </span>
            </div>
            <h2 className="text-base font-semibold text-text-primary tracking-tight">
              Marketing Plan Generator
            </h2>
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
                <BrainCircuit className="w-4 h-4" />{" "}
                {completedPipeline ? "Regenerate Marketing Plan" : "Generate Marketing Plan"}
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
                      // Switching tabs cancels in-UI tracking of any
                      // running pipeline. The backend job continues
                      // independently; the user can return to that lineup
                      // later and the latest-completed query will pick up
                      // the result.
                      setRunningPipelineId(null);
                      setSelectedVersionPipelineId(null);
                      setVersionDropdownOpen(false);
                      handledPipelineRef.current = null;
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

        {/* Active lineup info + content area */}
        {activeLineup && (
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4 mb-1">
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-semibold text-text-primary">
                    {activeLineup.name}
                  </h3>
                  {activeLineup.segment && (
                    <span className="text-[11px] px-2 py-0.5 bg-surface-100 rounded-md text-text-tertiary">
                      {activeLineup.segment}
                    </span>
                  )}
                  {completedPipeline?.completed_at && !isRunning && (
                    <span className="text-[11px] text-text-tertiary">
                      · generated{" "}
                      {new Date(completedPipeline.completed_at).toLocaleString(
                        "id-ID"
                      )}
                    </span>
                  )}
                </div>
                {activeLineup.competitors &&
                  activeLineup.competitors.length > 0 && (
                    <p className="text-xs text-text-tertiary mt-1">
                      vs {activeLineup.competitors.join(", ")}
                    </p>
                  )}
              </div>

              {/* Version dropdown — only visible when at least one pipeline
                  exists for this lineup. Picking an older version overrides
                  the latest-completed view. */}
              {versions.length > 0 && !isRunning && (
                <VersionDropdown
                  versions={versions}
                  selectedPipelineId={completedPipeline?.pipeline_id ?? null}
                  open={versionDropdownOpen}
                  onToggle={() => setVersionDropdownOpen((v) => !v)}
                  onPick={(pid) => {
                    // If user picks the version that is already the latest,
                    // clear the override so the page tracks "latest" again.
                    const isLatest =
                      pid === latestCompletedPipeline?.pipeline_id;
                    setSelectedVersionPipelineId(isLatest ? null : pid);
                    setVersionDropdownOpen(false);
                  }}
                />
              )}
            </div>


            {/* Render decision tree:
                1. If a fresh pipeline is running → show progress only
                2. Else if the latest completed pipeline has deliverables → show deliverables
                3. Else → empty state */}
            {isRunning && runningPipeline ? (
              <PipelineProgress pipeline={runningPipeline} />
            ) : completedPipeline ? (
              <DeliverablesPanel pipeline={completedPipeline} />
            ) : (
              <EmptyState />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VersionDropdown({
  versions,
  selectedPipelineId,
  open,
  onToggle,
  onPick,
}: {
  versions: MarketingPlanV2PipelineStatus[];
  selectedPipelineId: string | null;
  open: boolean;
  onToggle: () => void;
  onPick: (pipelineId: string) => void;
}) {
  const selected = versions.find((v) => v.pipeline_id === selectedPipelineId);
  const label = selected ? `v${selected.version}` : "Latest";
  return (
    <div className="relative shrink-0">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors"
      >
        <span>{label}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          {/* Click-outside backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={onToggle}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-1 bg-surface-white rounded-xl shadow-dropdown border border-surface-200 py-1 z-20 min-w-[220px] max-h-[320px] overflow-y-auto">
            {versions.map((v) => {
              const isActive = v.pipeline_id === selectedPipelineId;
              const isCompleted = v.status === "completed";
              const isFailed = v.status === "failed";
              return (
                <button
                  key={v.pipeline_id}
                  onClick={() => isCompleted && onPick(v.pipeline_id)}
                  disabled={!isCompleted}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between gap-3",
                    isCompleted
                      ? "hover:bg-surface-100 cursor-pointer"
                      : "cursor-not-allowed opacity-60",
                    isActive
                      ? "text-brand-accent font-medium"
                      : "text-text-secondary"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span>v{v.version}</span>
                    {isFailed && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-status-error/15 text-status-error font-semibold uppercase">
                        failed
                      </span>
                    )}
                    {!isCompleted && !isFailed && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-status-warning/15 text-status-warning font-semibold uppercase">
                        {v.status}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-text-tertiary">
                    {v.completed_at
                      ? new Date(v.completed_at).toLocaleDateString("id-ID")
                      : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 text-center py-12 rounded-2xl border border-dashed border-surface-200">
      <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <BrainCircuit className="w-6 h-6 text-brand-accent" />
      </div>
      <p className="text-sm text-text-primary font-medium">
        Belum ada marketing plan
      </p>
      <p className="text-xs text-text-tertiary mt-1">
        Klik "Generate Marketing Plan" untuk menjalankan pipeline 7 agent.
      </p>
    </div>
  );
}

// ── Stage progress component ────────────────────────────────

function PipelineProgress({
  pipeline,
}: {
  pipeline: MarketingPlanV2PipelineStatus;
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
          const stage = pipeline[def.key] as MarketingPlanV2AgentStageResult | null;
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
  stage: MarketingPlanV2AgentStageResult | null;
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

// ── Key Visual inline (lives inside Deliverable A's 2-column grid) ───
//
// Compact panel for the Gemini-generated campaign image. Sits in the left
// column (2/5) of the expanded Deliverable A card. Has three visual states:
//   1. Image present → render image + Download + Regenerate buttons
//   2. Error → red icon + error text + retry button
//   3. Empty → placeholder icon + Generate button

function KeyVisualInline({
  pipelineId,
  keyVisual,
  hasLineup,
}: {
  pipelineId: string;
  keyVisual: MarketingPlanV2PipelineStatus["key_visual"];
  hasLineup: boolean;
}) {
  const queryClient = useQueryClient();
  const regenMutation = useMutation({
    mutationFn: () => api.marketingPlanV2.regenerateKeyVisual(pipelineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-plan-v2-latest"] });
      queryClient.invalidateQueries({
        queryKey: ["marketing-plan-v2-versions"],
      });
      toast.success("Key visual regenerated");
    },
    onError: (err: Error) => {
      toast.error(`Failed to regenerate key visual: ${err.message}`);
    },
  });

  const imageB64 = keyVisual?.image_base64 || null;
  const error = keyVisual?.error || null;
  const hasImage = !!imageB64;
  const isRegenerating = regenMutation.isPending;

  const downloadImage = () => {
    if (!imageB64) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${imageB64}`;
    a.download = `marketing-plan-key-visual-${pipelineId.slice(0, 8)}.png`;
    a.click();
  };

  if (hasImage) {
    return (
      <div className="flex flex-col items-center gap-3">
        <img
          src={`data:image/png;base64,${imageB64}`}
          alt="Campaign Key Visual"
          className="w-full rounded-xl border border-surface-200"
        />
        <div className="flex gap-2 self-start">
          <button
            onClick={downloadImage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-white border border-surface-200 text-text-secondary hover:bg-surface-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          {hasLineup && (
            <button
              onClick={() => regenMutation.mutate()}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-white border border-surface-200 text-text-secondary hover:bg-surface-100 transition-colors disabled:opacity-50"
            >
              {isRegenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              Regenerate
            </button>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 rounded-xl bg-surface-white border border-dashed border-status-error/30">
        <XCircle className="w-8 h-8 text-status-error/60" />
        <p className="text-xs text-status-error text-center max-w-[200px]">
          KV generation failed
        </p>
        {hasLineup && (
          <button
            onClick={() => regenMutation.mutate()}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors disabled:opacity-50"
          >
            {isRegenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6 rounded-xl bg-surface-white border border-dashed border-surface-300">
      <ImageIcon className="w-8 h-8 text-text-tertiary/40" />
      <p className="text-xs text-text-tertiary text-center">
        Key Visual belum tersedia
      </p>
      {hasLineup && (
        <button
          onClick={() => regenMutation.mutate()}
          disabled={isRegenerating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors disabled:opacity-50"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon className="w-3.5 h-3.5" />
              Generate KV
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ── Deliverables panel (A/B/C) ──────────────────────────────

function DeliverablesPanel({
  pipeline,
}: {
  pipeline: MarketingPlanV2PipelineStatus;
}) {
  const a = pipeline.deliverable_A as Record<string, unknown> | null;
  const b = pipeline.deliverable_B as Record<string, unknown> | null;
  const c = pipeline.deliverable_C as Record<string, unknown> | null;

  if (!a && !b && !c) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-brand-accent rounded-full" />
        <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
          Deliverables
        </h4>
      </div>

      {/* Deliverable A — Campaign Key Message + Key Message Interpretation */}
      {a && (
        <DeliverableCard
          pipelineId={pipeline.pipeline_id}
          letter="A"
          title="Campaign Key Message"
          subtitle="Hero headline, tagline, talking points, key message interpretation"
          data={a}
          keyVisual={pipeline.key_visual}
          hasLineup={!!pipeline.lineup_id}
          interpretationData={b}
        />
      )}

      {/* Deliverable C */}
      {c && (
        <DeliverableCard
          pipelineId={pipeline.pipeline_id}
          letter="C"
          title="Detailed Analysis"
          subtitle="Trend, insight, positioning, differentiation, proof map"
          data={c}
        />
      )}
    </div>
  );
}

// ── Helpers for typed deliverable field access ───────────────

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function DeliverableCard({
  pipelineId,
  letter,
  title,
  subtitle,
  data,
  keyVisual,
  hasLineup,
  interpretationData,
}: {
  pipelineId: string;
  letter: "A" | "B" | "C";
  title: string;
  subtitle: string;
  data: Record<string, unknown>;
  keyVisual?: MarketingPlanV2PipelineStatus["key_visual"];
  hasLineup?: boolean;
  interpretationData?: Record<string, unknown> | null;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(letter === "A");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>(data);
  const [showRevise, setShowRevise] = useState(false);
  const [reviseInstruction, setReviseInstruction] = useState("");

  // Reset local draft whenever the server data changes (e.g., after a save
  // or after a fresh pipeline run completes).
  useEffect(() => {
    setDraft(data);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.marketingPlanV2.updateDeliverable(
        pipelineId,
        letter.toLowerCase() as "a" | "b" | "c",
        draft
      ),
    onSuccess: () => {
      toast.success(`Deliverable ${letter} saved`);
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["marketing-plan-v2-latest"] });
    },
    onError: (err: Error) => {
      toast.error(`Save failed: ${err.message}`);
    },
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      api.marketingPlanV2.resetDeliverable(
        pipelineId,
        letter.toLowerCase() as "a" | "b" | "c"
      ),
    onSuccess: () => {
      toast.success(`Deliverable ${letter} reset to AI draft`);
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["marketing-plan-v2-latest"] });
    },
    onError: (err: Error) => {
      toast.error(`Reset failed: ${err.message}`);
    },
  });

  const reviseMutation = useMutation({
    mutationFn: (instruction: string) =>
      api.marketingPlanV2.reviseDeliverable(
        pipelineId,
        letter.toLowerCase() as "a" | "b" | "c",
        instruction
      ),
    onSuccess: (res) => {
      setDraft(res.revised);
      setEditing(true);
      setShowRevise(false);
      setReviseInstruction("");
      toast.success("Content revised — review and save when ready.");
    },
    onError: (err: Error) => {
      toast.error(`Revise failed: ${err.message}`);
    },
  });

  const handleCancel = () => {
    setDraft(data);
    setEditing(false);
  };

  const isMutating = updateMutation.isPending || resetMutation.isPending;

  return (
    <div className="border border-surface-100 rounded-2xl overflow-hidden">
      {/* Header row: expand toggle + action buttons */}
      <div className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-50 transition-colors">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <span className="w-9 h-9 rounded-xl bg-brand-accent/15 flex items-center justify-center text-base font-bold text-brand-accent shrink-0">
            {letter}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text-primary">{title}</div>
            <div className="text-[11px] text-text-tertiary">{subtitle}</div>
          </div>
        </button>

        {expanded && (
          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => updateMutation.mutate()}
                  disabled={isMutating}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-accent text-text-inverse hover:bg-brand-accent-hover disabled:opacity-60 transition-colors flex items-center gap-1.5"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3" /> Save
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isMutating}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 disabled:opacity-60 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 transition-colors flex items-center gap-1.5"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviseInstruction("");
                    setShowRevise(true);
                  }}
                  disabled={reviseMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  <BrainCircuit className="w-3 h-3" /> Revise with AI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        `Reset Deliverable ${letter} to the original AI draft? Your edits will be lost.`
                      )
                    ) {
                      resetMutation.mutate();
                    }
                  }}
                  disabled={isMutating}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-text-tertiary hover:bg-surface-50 hover:text-text-secondary disabled:opacity-60 transition-colors flex items-center gap-1.5"
                  title="Reset to AI Draft"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="p-1 rounded-lg hover:bg-surface-100 transition-colors"
            >
              <ChevronRight
                className={cn(
                  "w-4 h-4 text-text-tertiary transition-transform",
                  expanded && "rotate-90"
                )}
              />
            </button>
          </div>
        )}
        {!expanded && (
          <ChevronRight
            className={cn(
              "w-4 h-4 text-text-tertiary transition-transform",
              expanded && "rotate-90"
            )}
          />
        )}
      </div>

      {/* Revise with AI — inline panel */}
      {showRevise && (
        <div className="px-5 py-3 border-t border-surface-100 bg-brand-accent/5">
          {reviseMutation.isPending && (
            <div className="flex items-center gap-2 mb-2 text-xs text-brand-accent">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              AI is revising Deliverable {letter}...
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reviseInstruction.trim())
                reviseMutation.mutate(reviseInstruction);
            }}
            className="flex items-start gap-2"
          >
            <div className="flex-1">
              <span className="text-xs font-semibold text-text-primary">
                Revise with AI
              </span>
              <input
                type="text"
                value={reviseInstruction}
                onChange={(e) => setReviseInstruction(e.target.value)}
                placeholder="e.g. Make the tagline shorter and punchier..."
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-surface-200 bg-surface-white text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-accent"
                disabled={reviseMutation.isPending}
                autoFocus
              />
            </div>
            <div className="flex items-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowRevise(false);
                  setReviseInstruction("");
                }}
                disabled={reviseMutation.isPending}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !reviseInstruction.trim() || reviseMutation.isPending
                }
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-accent text-text-inverse hover:bg-brand-accent-hover disabled:opacity-60 transition-colors flex items-center gap-1.5"
              >
                {reviseMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <BrainCircuit className="w-3 h-3" />
                )}
                Revise
              </button>
            </div>
          </form>
        </div>
      )}

      {expanded && (
        <div className="p-6 border-t border-surface-100 bg-surface-50">
          {editing ? (
            <DeliverableEditor letter={letter} draft={draft} setDraft={setDraft} />
          ) : letter === "A" ? (
            <div className="space-y-6">
              {/* KV image left + Headline/Tagline/Interpretation right */}
              <div className="grid grid-cols-5 gap-5 items-start">
                <div className="col-span-2">
                  <KeyVisualInline
                    pipelineId={pipelineId}
                    keyVisual={keyVisual ?? null}
                    hasLineup={!!hasLineup}
                  />
                </div>
                <div className="col-span-3 space-y-5">
                  <DeliverableAHeadline data={data} />
                  {/* Key Message Interpretation — beside KV */}
                  {interpretationData && (
                    <div className="border-t border-surface-200 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                          Key Message Interpretation
                        </span>
                      </div>
                      <InterpretationCompact data={interpretationData} />
                    </div>
                  )}
                </div>
              </div>
              {/* Talking Points + Objections hidden per request */}
            </div>
          ) : (
            <>
              {letter === "C" && <DeliverableCRenderer data={data} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Deliverable Editor (text-field forms for A/B/C) ──────────

function DeliverableEditor({
  letter,
  draft,
  setDraft,
}: {
  letter: "A" | "B" | "C";
  draft: Record<string, unknown>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  const update = (path: string[], value: unknown) => {
    setDraft((prev) => {
      const next: Record<string, unknown> = { ...prev };
      // Walk path, cloning along the way
      let cur: Record<string, unknown> = next;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        const child = cur[key];
        cur[key] =
          child && typeof child === "object" && !Array.isArray(child)
            ? { ...(child as Record<string, unknown>) }
            : {};
        cur = cur[key] as Record<string, unknown>;
      }
      cur[path[path.length - 1]] = value;
      return next;
    });
  };

  if (letter === "A") return <DeliverableAEditor draft={draft} update={update} />;
  if (letter === "B") return <DeliverableBEditor draft={draft} update={update} />;
  return <DeliverableCEditor draft={draft} update={update} />;
}

type UpdateFn = (path: string[], value: unknown) => void;

function DeliverableAEditor({
  draft,
  update,
}: {
  draft: Record<string, unknown>;
  update: UpdateFn;
}) {
  const hero = (draft.hero_headline as string) ?? "";
  const tagline = (draft.slogan_tagline as string) ?? "";

  return (
    <div className="space-y-6">
      <FormField label="Hero Headline">
        <input
          type="text"
          value={hero}
          onChange={(e) => update(["hero_headline"], e.target.value)}
          className="w-full px-3 py-2 text-base font-bold text-text-primary bg-surface-white border border-surface-100 rounded-xl focus:outline-none focus:border-brand-accent"
        />
      </FormField>
      <FormField label="Tagline">
        <input
          type="text"
          value={tagline}
          onChange={(e) => update(["slogan_tagline"], e.target.value)}
          className="w-full px-3 py-2 text-base font-semibold italic text-text-primary bg-surface-white border border-surface-100 rounded-xl focus:outline-none focus:border-brand-accent"
        />
      </FormField>

      {/* Evidence-Based Talking Points editor hidden per request */}

    </div>
  );
}

function DeliverableBEditor({
  draft,
  update,
}: {
  draft: Record<string, unknown>;
  update: UpdateFn;
}) {
  const simplicity = (draft.audience_facing_simplicity_draft as string) ?? "";
  const valueProp = (draft.core_value_proposition as string) ?? "";
  const toneAlignment = (draft.brand_tone_of_voice_alignment as string) ?? "";

  return (
    <div className="space-y-6">
      <FormField label="Audience-Facing Simplicity (10-second comprehension)">
        <textarea
          value={simplicity}
          onChange={(e) =>
            update(["audience_facing_simplicity_draft"], e.target.value)
          }
          rows={2}
          className="w-full px-3 py-2 text-base text-text-primary bg-surface-white border border-surface-100 rounded-xl focus:outline-none focus:border-brand-accent resize-y"
        />
      </FormField>
      <FormField label="Core Value Proposition">
        <textarea
          value={valueProp}
          onChange={(e) => update(["core_value_proposition"], e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm text-text-primary bg-surface-white border border-surface-100 rounded-xl focus:outline-none focus:border-brand-accent resize-y"
        />
      </FormField>
      <FormField label="Brand Tone of Voice Alignment">
        <textarea
          value={toneAlignment}
          onChange={(e) =>
            update(["brand_tone_of_voice_alignment"], e.target.value)
          }
          rows={3}
          className="w-full px-3 py-2 text-sm text-text-secondary bg-surface-white border border-surface-100 rounded-xl focus:outline-none focus:border-brand-accent resize-y"
        />
      </FormField>
      {/* Key Objections to Address editor hidden per request */}
    </div>
  );
}

function DeliverableCEditor({
  draft,
  update,
}: {
  draft: Record<string, unknown>;
  update: UpdateFn;
}) {
  const trendAlign = (draft.market_trend_alignment as string) ?? "";
  const insightInt = (draft.customer_insight_integration as string) ?? "";
  const positionMap = (draft.competitive_positioning_map as string) ?? "";

  return (
    <div className="space-y-6">
      <FormField label="Market Trend Alignment">
        <textarea
          value={trendAlign}
          onChange={(e) => update(["market_trend_alignment"], e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm text-text-secondary bg-surface-white border border-surface-100 rounded-xl focus:outline-none focus:border-brand-accent resize-y"
        />
      </FormField>
      <FormField label="Customer Insight Integration">
        <textarea
          value={insightInt}
          onChange={(e) =>
            update(["customer_insight_integration"], e.target.value)
          }
          rows={4}
          className="w-full px-3 py-2 text-sm text-text-secondary bg-surface-white border border-surface-100 rounded-xl focus:outline-none focus:border-brand-accent resize-y"
        />
      </FormField>
      <FormField label="Competitive Positioning Map">
        <textarea
          value={positionMap}
          onChange={(e) =>
            update(["competitive_positioning_map"], e.target.value)
          }
          rows={4}
          className="w-full px-3 py-2 text-sm text-text-secondary bg-surface-white border border-surface-100 rounded-xl focus:outline-none focus:border-brand-accent resize-y"
        />
      </FormField>
      <p className="text-[11px] text-text-tertiary italic">
        Differentiation points and proof-point validation map are read-only
        traceability data — they cannot be edited.
      </p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

// ── Deliverable A: Campaign Key Message ──────────────────────

function DeliverableAHeadline({ data }: { data: Record<string, unknown> }) {
  const hero = asString(data.hero_headline);
  const tagline = asString(data.slogan_tagline);

  return (
    <div className="space-y-4">
      {hero && (
        <div>
          <FieldLabel>Hero Headline</FieldLabel>
          <p className="text-xl font-bold text-text-primary leading-snug">
            {hero}
          </p>
        </div>
      )}
      {tagline && (
        <div>
          <FieldLabel>Tagline</FieldLabel>
          <p className="text-base font-semibold text-brand-accent italic">
            "{tagline}"
          </p>
        </div>
      )}
    </div>
  );
}

// TalkingPointsList component removed — feature hidden per request

// ── Compact interpretation (beside KV — no objections) ───────

function InterpretationCompact({ data }: { data: Record<string, unknown> }) {
  const simplicity = asString(data.audience_facing_simplicity_draft);
  const valueProp = asString(data.core_value_proposition);
  const toneAlignment = asString(data.brand_tone_of_voice_alignment);

  return (
    <div className="space-y-3">
      {simplicity && (
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            Audience Simplicity
          </span>
          <p className="text-sm text-text-primary leading-relaxed mt-0.5">
            {simplicity}
          </p>
        </div>
      )}
      {valueProp && (
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            Value Proposition
          </span>
          <p className="text-sm text-text-primary leading-relaxed mt-0.5">
            {valueProp}
          </p>
        </div>
      )}
      {toneAlignment && (
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            Tone Alignment
          </span>
          <p className="text-xs text-text-secondary leading-relaxed mt-0.5">
            {toneAlignment}
          </p>
        </div>
      )}
    </div>
  );
}

// ObjectionsList component removed — feature hidden per request

// ── Deliverable C: Detailed Analysis ─────────────────────────

/**
 * Extract the text body of a Deliverable C section that may be either the
 * current `{ text, sources[] }` object form or the legacy plain-string form.
 * The sources array is intentionally ignored — sources are hidden in the UI.
 */
function extractText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  const rec = asRecord(value);
  return asString(rec.text) ?? asString(rec.content) ?? asString(rec.value);
}

function DeliverableCRenderer({ data }: { data: Record<string, unknown> }) {
  const trendText = extractText(data.market_trend_alignment);
  const insightText = extractText(data.customer_insight_integration);
  const positionText = extractText(data.competitive_positioning_map);
  const diffPoints = asArray(data.product_differentiation_points).filter((p) => {
    const rec = asRecord(p);
    return asString(rec.point) || asString(rec.feature) || asString(rec.our_advantage);
  });
  const proofMap = asArray(data.proof_point_validation_map).filter((p) => {
    const rec = asRecord(p);
    return asString(rec.claim);
  });

  return (
    <div className="space-y-8">
      {(trendText || insightText || positionText) && (
        <div className="space-y-4">
          {trendText && (
            <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
              <FieldLabel>Market Trend Alignment</FieldLabel>
              <p className="text-sm text-text-secondary leading-relaxed">{trendText}</p>
            </div>
          )}
          {insightText && (
            <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
              <FieldLabel>Customer Insight Integration</FieldLabel>
              <p className="text-sm text-text-secondary leading-relaxed">{insightText}</p>
            </div>
          )}
          {positionText && (
            <div className="bg-surface-white rounded-xl p-5 border border-surface-100">
              <FieldLabel>Competitive Positioning Map</FieldLabel>
              <p className="text-sm text-text-secondary leading-relaxed">{positionText}</p>
            </div>
          )}
        </div>
      )}

      {diffPoints.length > 0 && (
        <div>
          <FieldLabel>Product Differentiation Points</FieldLabel>
          <div className="space-y-3">
            {diffPoints.map((p, idx) => {
              const rec = asRecord(p);
              const feature = asString(rec.point) || asString(rec.feature);
              const vsCompetitor = asString(rec.versus) || asString(rec.vs_competitor);
              const ourAdvantage = asString(rec.evidence) || asString(rec.our_advantage);
              return (
                <div
                  key={idx}
                  className="bg-surface-white rounded-xl p-4 border border-surface-100"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-brand-accent/15 text-brand-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      {feature && (
                        <p className="text-sm font-semibold text-text-primary leading-snug">
                          {feature}
                        </p>
                      )}
                      {vsCompetitor && (
                        <p className="text-[11px] text-text-tertiary mt-1">
                          vs {vsCompetitor}
                        </p>
                      )}
                      {ourAdvantage && (
                        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                          {ourAdvantage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {proofMap.length > 0 && (
        <div>
          <FieldLabel>Proof Point Validation Map</FieldLabel>
          <div className="space-y-2">
            {proofMap.map((p, idx) => {
              const rec = asRecord(p);
              const claim = asString(rec.claim);
              const status = asString(rec.status);
              const proofRef = asString(rec.proof_ref) || asString(rec.source_ref);
              const tool = asString(rec.tool_used);
              const isApproved = status === "approved";
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-surface-white rounded-lg px-4 py-3 border border-surface-100"
                >
                  <CheckCircle2
                    className={cn(
                      "w-4 h-4 shrink-0 mt-0.5",
                      isApproved ? "text-status-success" : "text-brand-accent"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium leading-snug">{claim}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {status && (
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md font-medium",
                            isApproved
                              ? "bg-status-success/10 text-status-success"
                              : "bg-brand-accent/10 text-brand-accent"
                          )}
                        >
                          {status}
                        </span>
                      )}
                      {proofRef && (
                        <span className="text-[10px] font-mono text-text-tertiary px-2 py-0.5 bg-surface-100 rounded-md truncate max-w-[300px]">
                          {proofRef}
                        </span>
                      )}
                      {tool && (
                        <span className="text-[10px] text-text-tertiary px-2 py-0.5 bg-surface-100 rounded-md">
                          via {tool}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helpers for section labels & cards ─────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-0.5 h-4 bg-brand-accent rounded-full" />
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">
        {children}
      </span>
    </div>
  );
}

