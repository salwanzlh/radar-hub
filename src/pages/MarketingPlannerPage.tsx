import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Target,
  Search,
  ArrowUpDown,
  RotateCw,
  Trash2,
} from "lucide-react";
import { api, type MarketingPlanState, type MarketingPlanSummary } from "@/lib/api-client";
import StepIndicator from "@/components/campaign-planner/StepIndicator";
import AuditStep from "@/components/campaign-planner/AuditStep";
import StrategicRecommendationStep from "@/components/campaign-planner/StrategicRecommendationStep";
import ClarificationStep from "@/components/campaign-planner/ClarificationStep";
import SummaryStep from "@/components/campaign-planner/SummaryStep";
import PlanDashboard from "@/components/campaign-planner/PlanDashboard";
import PlanDashboardV2 from "@/components/campaign-planner/PlanDashboardV2";
import { cn } from "@/lib/utils";

// -- Status helpers ----------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; text: string; icon: React.ElementType; gradient: string }
> = {
  draft: {
    label: "Draft",
    dot: "bg-surface-300",
    text: "text-text-secondary",
    icon: Clock,
    gradient: "from-surface-300 to-surface-200",
  },
  audit: {
    label: "Situation",
    dot: "bg-status-info",
    text: "text-status-info",
    icon: Clock,
    gradient: "from-status-info to-blue-400",
  },
  recommending: {
    label: "Strategic Recommendation",
    dot: "bg-amber-500",
    text: "text-amber-500",
    icon: Clock,
    gradient: "from-amber-500 to-amber-400",
  },
  clarifying: {
    label: "Clarifying",
    dot: "bg-amber-500",
    text: "text-amber-500",
    icon: Clock,
    gradient: "from-amber-500 to-amber-400",
  },
  summarizing: {
    label: "Generating...",
    dot: "bg-amber-400 animate-pulse",
    text: "text-amber-400",
    icon: Loader2,
    gradient: "from-amber-500 to-amber-400",
  },
  generating: {
    label: "Generating...",
    dot: "bg-amber-400 animate-pulse",
    text: "text-amber-400",
    icon: Loader2,
    gradient: "from-amber-500 to-amber-400",
  },
  completed: {
    label: "Complete",
    dot: "bg-status-success",
    text: "text-status-success",
    icon: CheckCircle2,
    gradient: "from-status-success to-green-400",
  },
  failed: {
    label: "Failed",
    dot: "bg-status-error",
    text: "text-status-error",
    icon: XCircle,
    gradient: "from-status-error to-red-400",
  },
};

const PRIORITY_CONFIG: Record<string, { gradient: string; text: string; ring: string }> = {
  high: {
    gradient: "bg-gradient-to-r from-red-600 to-red-500",
    text: "text-white",
    ring: "ring-red-500/30",
  },
  medium: {
    gradient: "bg-gradient-to-r from-amber-600 to-amber-500",
    text: "text-white",
    ring: "ring-amber-500/30",
  },
  low: {
    gradient: "bg-gradient-to-r from-green-600 to-green-500",
    text: "text-white",
    ring: "ring-green-500/30",
  },
};

function StatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "lg" }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const isLarge = size === "lg";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-medium",
        isLarge ? "text-sm" : "text-xs"
      )}
    >
      <span className={cn("rounded-full shrink-0", cfg.dot, isLarge ? "w-2.5 h-2.5" : "w-2 h-2")} />
      <span className={cfg.text}>{cfg.label}</span>
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority.toLowerCase()] ?? PRIORITY_CONFIG.medium;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ring-1",
        cfg.gradient,
        cfg.text,
        cfg.ring
      )}
    >
      {priority}
    </span>
  );
}

function AreaBadge({ area }: { area: string }) {
  if (!area) return null;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-surface-100 text-text-secondary">
      {area}
    </span>
  );
}

// -- Skeleton loader ---------------------------------------------------------

function SkeletonPulse() {
  return (
    <div className="space-y-6 animate-pulse py-8">
      <div className="h-6 w-72 rounded-lg bg-surface-200" />
      <div className="h-4 w-48 rounded bg-surface-200" />
      <div className="space-y-4 mt-8">
        <div className="h-24 w-full rounded-xl bg-surface-200" />
        <div className="h-20 w-5/6 rounded-xl bg-surface-200" />
        <div className="h-16 w-3/4 rounded-xl bg-surface-200" />
      </div>
    </div>
  );
}

// -- Status to step mapping --------------------------------------------------

function statusToStep(status: MarketingPlanState["status"]): string {
  switch (status) {
    case "draft":
    case "audit":
      return "audit";
    case "recommending":
      return "recommending";
    case "clarifying":
      return "clarifying";
    case "summarizing":
      return "summarizing";
    case "generating":
    case "completed":
      return "generating";
    case "failed":
      return "audit";
    default:
      return "audit";
  }
}

// -- List mode ---------------------------------------------------------------

type SortKey = "created_desc" | "created_asc" | "priority" | "status";

function PlanList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeProduct, setActiveProduct] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_desc");

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ["marketing-plans"],
    queryFn: () => api.marketingPlanner.list(),
  });

  const { data: lineups } = useQuery({
    queryKey: ["lineups"],
    queryFn: api.lineupAnalysis.lineups,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.marketingPlanner.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-plans"] });
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : "Failed to delete plan");
    },
  });

  const handleDelete = (e: React.MouseEvent, plan: MarketingPlanSummary) => {
    e.stopPropagation();
    if (confirm(`Delete plan "${plan.recommendation_headline}"? This cannot be undone.`)) {
      deleteMutation.mutate(plan.id);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl bg-status-error-light border border-status-error/20">
        <AlertTriangle className="w-10 h-10 text-status-error mb-4" />
        <p className="text-sm font-semibold text-text-primary mb-1">Failed to load marketing plans</p>
        <p className="text-xs text-text-tertiary mb-4">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 text-xs font-semibold rounded-lg bg-status-error text-white hover:opacity-90 transition-opacity">Retry</button>
      </div>
    );
  }

  // Group plans by product name
  const grouped = (plans ?? []).reduce<Record<string, MarketingPlanSummary[]>>((acc, plan) => {
    const key = plan.product_name || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(plan);
    return acc;
  }, {});

  // Tab list = ALL lineups (even with zero plans)
  const productNames = lineups && lineups.length > 0
    ? lineups.map((l) => l.name)
    : Object.keys(grouped);
  const activeName = productNames.includes(activeProduct ?? "") ? activeProduct! : productNames[0] ?? "";
  const rawActivePlans = grouped[activeName] ?? [];

  // Apply filters
  let activePlans = rawActivePlans.filter((p) => {
    if (search && !p.recommendation_headline.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter !== "all" && p.recommendation_priority.toLowerCase() !== priorityFilter) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "completed" && p.status !== "completed") return false;
      if (statusFilter === "in_progress" && !["summarizing", "generating", "clarifying", "audit", "draft"].includes(p.status)) return false;
      if (statusFilter === "failed" && p.status !== "failed") return false;
    }
    return true;
  });

  // Apply sort
  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const STATUS_ORDER: Record<string, number> = { completed: 0, generating: 1, summarizing: 1, clarifying: 2, audit: 3, draft: 4, failed: 5 };
  activePlans = [...activePlans].sort((a, b) => {
    switch (sortKey) {
      case "created_asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "priority":
        return (PRIORITY_ORDER[a.recommendation_priority.toLowerCase()] ?? 9) - (PRIORITY_ORDER[b.recommendation_priority.toLowerCase()] ?? 9);
      case "status":
        return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      case "created_desc":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="space-y-4">
      {/* Main panel with tabs + list */}
      <div className="bg-surface-white rounded-xl border border-surface-100 overflow-hidden">
        {/* Product tabs */}
        <div className="flex items-stretch border-b border-surface-100 bg-gradient-to-r from-surface-50/50 to-transparent">
          <div className="flex overflow-x-auto gap-0.5 px-2 pt-2 scrollbar-hide flex-1">
            {productNames.map((name) => {
              const isActive = name === activeName;
              const count = grouped[name]?.length ?? 0;
              return (
                <button
                  key={name}
                  onClick={() => setActiveProduct(name)}
                  className={cn(
                    "relative px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all duration-200 whitespace-nowrap shrink-0 flex items-center gap-1.5",
                    isActive
                      ? "bg-surface-white text-text-primary shadow-sm"
                      : "text-text-tertiary hover:text-text-secondary hover:bg-surface-100/50",
                  )}
                >
                  {name}
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                    count === 0
                      ? "bg-surface-200 text-text-tertiary"
                      : isActive
                        ? "bg-brand-accent text-white"
                        : "bg-surface-200 text-text-secondary",
                  )}>{count}</span>
                  {isActive && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-accent rounded-full" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center px-3 border-l border-surface-100 shrink-0">
            <Link
              to="/analysis"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg text-brand-accent hover:bg-brand-accent/5 transition-colors whitespace-nowrap"
            >
              <Target className="w-3 h-3" />
              New Plan
            </Link>
          </div>
        </div>

        {/* Toolbar: search + filters + sort */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-surface-100 bg-surface-50/30">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recommendation..."
              className="w-full pl-8 pr-3 py-1.5 text-xs text-text-primary bg-surface-white border border-surface-200 rounded-lg placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent/50"
            />
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-surface-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 cursor-pointer"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-surface-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="failed">Failed</option>
          </select>

          {/* Sort */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-surface-white border border-surface-200 rounded-lg">
            <ArrowUpDown className="w-3 h-3 text-text-tertiary" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="bg-transparent cursor-pointer focus:outline-none"
            >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div className="ml-auto text-[11px] text-text-tertiary font-medium">
            {activePlans.length} of {rawActivePlans.length}
          </div>
        </div>

        {/* Table header */}
        {activePlans.length > 0 && (
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary bg-surface-50/50 border-b border-surface-100">
            <div className="w-2" />
            <div>Recommendation</div>
            <div className="text-right w-[340px]">Priority · Area · Status</div>
            <div className="text-right w-24">Created</div>
            <div className="w-6" />
          </div>
        )}

        {/* Rows */}
        <div className="divide-y divide-surface-50">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-surface-200" />
                <div className="flex-1 h-3 rounded bg-surface-100" />
                <div className="w-48 h-4 rounded bg-surface-100" />
                <div className="w-20 h-3 rounded bg-surface-100" />
              </div>
            ))
          ) : activePlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent/10 to-brand-accent/5 flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-brand-accent/60" />
              </div>
              {rawActivePlans.length === 0 ? (
                <>
                  <p className="text-sm font-semibold text-text-primary mb-1">No plans for {activeName}</p>
                  <p className="text-xs text-text-tertiary text-center mb-4">
                    Generate one from a strategic recommendation
                  </p>
                  <Link
                    to="/analysis"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-accent text-text-inverse hover:bg-brand-accent-hover transition-colors"
                  >
                    <Target className="w-3 h-3" />
                    Go to Discovery Feed
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-text-primary mb-1">No matching plans</p>
                  <p className="text-xs text-text-tertiary text-center">
                    Try clearing the search or filters above
                  </p>
                </>
              )}
            </div>
          ) : activePlans.map((plan) => {
            const statusCfg = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG.draft;
            const dotColor =
              statusCfg.gradient.includes("green") ? "bg-status-success"
                : statusCfg.gradient.includes("red") ? "bg-status-error"
                  : statusCfg.gradient.includes("amber") ? "bg-status-warning"
                    : "bg-surface-300";
            const isDeleting = deleteMutation.isPending && deleteMutation.variables === plan.id;
            return (
              <div
                key={plan.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/marketing-planner/${plan.id}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/marketing-planner/${plan.id}`)}
                className={cn(
                  "w-full grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-50/80 transition-colors group cursor-pointer",
                  isDeleting && "opacity-50 pointer-events-none"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                <p className="text-[13px] text-text-primary truncate leading-snug group-hover:text-brand-accent transition-colors">
                  {plan.recommendation_headline}
                </p>
                <div className="flex items-center gap-1.5 shrink-0 w-[340px] justify-end">
                  <PriorityBadge priority={plan.recommendation_priority} />
                  <AreaBadge area={plan.recommendation_area ?? ""} />
                  <StatusBadge status={plan.status} />
                </div>
                <span className="text-[11px] text-text-tertiary shrink-0 w-24 text-right font-medium">
                  {new Date(plan.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <button
                  onClick={(e) => handleDelete(e, plan)}
                  disabled={isDeleting}
                  className="shrink-0 p-1.5 rounded-lg text-text-tertiary hover:text-status-error hover:bg-status-error-light transition-colors disabled:opacity-50"
                  title="Delete plan"
                  aria-label="Delete plan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -- Wizard mode -------------------------------------------------------------

function PlanWizard({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [revertTarget, setRevertTarget] = useState<string | null>(null);

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ["marketing-plan", id],
    queryFn: () => api.marketingPlanner.get(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return false;
      // Poll while async steps are running
      if (d.status === "summarizing" || d.status === "generating") return 2000;
      // Poll while KV is still generating (plan completed but no KV yet)
      if (d.status === "completed" && d.plan && !d.key_visual) return 3000;
      return false;
    },
  });

  // -- Mutations -------------------------------------------------------------

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["marketing-plan", id] });
  };

  const confirmAuditMutation = useMutation({
    mutationFn: () => api.marketingPlanner.confirmAudit(id),
    onSuccess: invalidate,
  });

  const submitRecommendationMutation = useMutation({
    mutationFn: (body: {
      selected_primary_option: number;
      selected_secondary_options: number[];
      confidence_flag_responses: { option_index: number; response: "will_verify" | "accept_risk" }[];
      user_note?: string;
    }) => api.marketingPlanner.submitRecommendation(id, body),
    onSuccess: invalidate,
  });

  const regenerateRecommendationMutation = useMutation({
    mutationFn: (note: string) => api.marketingPlanner.regenerateRecommendation(id, note),
    onSuccess: invalidate,
  });

  const answerMutation = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: number; answer: unknown }) =>
      api.marketingPlanner.answer(id, questionId, answer),
    onSuccess: invalidate,
  });

  const generateQuickFillMutation = useMutation({
    mutationFn: (category: string) => api.marketingPlanner.generateQuickFill(id, category),
    onSuccess: invalidate,
  });

  const saveQuickFillMutation = useMutation({
    mutationFn: ({ category, answers }: { category: string; answers: Record<string, unknown> }) =>
      api.marketingPlanner.saveQuickFillAnswers(id, category, answers),
    onSuccess: invalidate,
  });

  const generateSummaryMutation = useMutation({
    mutationFn: () => api.marketingPlanner.generateSummary(id),
    onSuccess: invalidate,
  });

  const approveSummaryMutation = useMutation({
    mutationFn: () => api.marketingPlanner.approveSummary(id),
    onSuccess: invalidate,
  });

  const editSectionMutation = useMutation({
    mutationFn: ({ key, content }: { key: string; content: Record<string, unknown> }) =>
      api.marketingPlanner.updateSection(id, key, content),
    onSuccess: invalidate,
  });

  const resetSectionMutation = useMutation({
    mutationFn: (key: string) => api.marketingPlanner.resetSection(id, key),
    onSuccess: invalidate,
  });

  const regenerateKvMutation = useMutation({
    mutationFn: () => api.marketingPlanner.regenerateKv(id),
    onSuccess: invalidate,
  });

  const regeneratePlanMutation = useMutation({
    mutationFn: () => api.marketingPlanner.regeneratePlan(id),
    onSuccess: () => {
      invalidate();
      // Poll more aggressively after regen triggers so the "generating" state
      // is reflected in the UI as soon as the backend picks it up.
      setTimeout(invalidate, 500);
      setTimeout(invalidate, 1500);
    },
  });

  const revertMutation = useMutation({
    mutationFn: (step: string) => api.marketingPlanner.revert(id, step),
    onSuccess: () => {
      setRevertTarget(null);
      invalidate();
    },
  });

  // -- Step click with confirmation ------------------------------------------

  const handleStepClick = (step: string) => {
    if (!plan) return;
    const currentStep = statusToStep(plan.status);
    if (step === currentStep) return;
    setRevertTarget(step);
  };

  const confirmRevert = () => {
    if (!revertTarget) return;
    revertMutation.mutate(revertTarget);
  };

  // -- Loading state ---------------------------------------------------------

  if (isLoading) {
    return <SkeletonPulse />;
  }

  if (error || !plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl bg-status-error-light border border-status-error/20">
        <XCircle className="w-12 h-12 text-status-error mb-4" />
        <p className="text-sm font-semibold text-text-primary mb-1">Failed to load marketing plan</p>
        <p className="text-xs text-text-tertiary mb-6">
          {error instanceof Error ? error.message : "Plan not found"}
        </p>
        <Link
          to="/marketing-planner"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-accent text-text-inverse hover:bg-brand-accent-hover transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to list
        </Link>
      </div>
    );
  }

  // -- Recommendation info from plan -----------------------------------------

  const rec = plan.recommendation as Record<string, string> | null;
  const headline = rec?.headline || "Marketing Plan";
  const priority = rec?.priority || "";
  const area = rec?.area || "";

  // -- Render step content ---------------------------------------------------

  const renderStepContent = () => {
    switch (plan.status) {
      case "draft":
      case "audit":
        if (!plan.audit_result) {
          return (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-7 h-7 text-brand-accent animate-spin" />
                <span className="text-sm text-text-secondary">Preparing situation analysis...</span>
              </div>
            </div>
          );
        }
        return (
          <AuditStep
            auditResult={plan.audit_result}
            onConfirm={() => confirmAuditMutation.mutate()}
            isConfirming={confirmAuditMutation.isPending}
            onGenerateQuickFill={(category) => generateQuickFillMutation.mutate(category)}
            isGeneratingQuickFill={(category) =>
              generateQuickFillMutation.isPending && generateQuickFillMutation.variables === category
            }
            hasQuickFillGenerateError={(category) =>
              generateQuickFillMutation.isError && generateQuickFillMutation.variables === category
            }
            onSaveQuickFillAnswers={(category, answers) =>
              saveQuickFillMutation.mutate({ category, answers })
            }
            isSavingQuickFill={(category) =>
              saveQuickFillMutation.isPending && saveQuickFillMutation.variables?.category === category
            }
          />
        );

      case "recommending":
        if (!plan.strategic_recommendation) {
          return (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-7 h-7 text-brand-accent animate-spin" />
                <span className="text-sm text-text-secondary">Generating strategic directions...</span>
              </div>
            </div>
          );
        }
        return (
          <StrategicRecommendationStep
            key={plan.updated_at}
            strategicRecommendation={plan.strategic_recommendation}
            onSubmit={(payload) => submitRecommendationMutation.mutate(payload)}
            onRegenerate={(note) => regenerateRecommendationMutation.mutate(note)}
            isSubmitting={submitRecommendationMutation.isPending}
            isRegenerating={regenerateRecommendationMutation.isPending}
          />
        );

      case "clarifying":
        if (!plan.clarification) {
          return (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-7 h-7 text-brand-accent animate-spin" />
                <span className="text-sm text-text-secondary">Loading questions...</span>
              </div>
            </div>
          );
        }
        return (
          <ClarificationStep
            clarification={plan.clarification}
            onAnswer={(questionId, answer) => answerMutation.mutate({ questionId, answer })}
            onGenerateSummary={() => generateSummaryMutation.mutate()}
            isSubmitting={answerMutation.isPending}
            isGeneratingSummary={generateSummaryMutation.isPending}
          />
        );

      case "summarizing":
        return (
          <SummaryStep
            summaryBrief={plan.summary_brief}
            status={plan.status}
            onApprove={() => approveSummaryMutation.mutate()}
            onBack={() => handleStepClick("strategic_recommendation")}
            isApproving={approveSummaryMutation.isPending}
          />
        );

      case "generating":
      case "completed": {
        // Optimistic: while regenerate mutation is pending or plan just triggered,
        // show generating state even if backend hasn't updated status yet.
        const isRegenerating = regeneratePlanMutation.isPending;
        const effectiveStatus = isRegenerating ? "generating" : plan.status;
        const dashboardProps = {
          plan: isRegenerating ? {} : (plan.plan ?? {}),
          onEditSection: (key: string, content: Record<string, unknown>) =>
            editSectionMutation.mutate({ key, content }),
          onResetSection: (key: string) => resetSectionMutation.mutate(key),
          status: effectiveStatus,
          isEditing: editSectionMutation.isPending,
          keyVisual: plan.key_visual ?? undefined,
          onRegenerateKv: () => regenerateKvMutation.mutate(),
          isRegeneratingKv: regenerateKvMutation.isPending,
        };
        return plan.plan_version === "v2"
          ? <PlanDashboardV2 {...dashboardProps} />
          : <PlanDashboard {...dashboardProps} />;
      }

      case "failed":
        return (
          <div className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl bg-status-error-light border border-status-error/20">
            <XCircle className="w-14 h-14 text-status-error mb-5" />
            <p className="text-base font-semibold text-text-primary mb-2">Plan generation failed</p>
            {plan.error && (
              <p className="text-sm text-text-tertiary max-w-md text-center mb-6 leading-relaxed">
                {plan.error}
              </p>
            )}
            <button
              onClick={() => revertMutation.mutate("audit")}
              disabled={revertMutation.isPending}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl",
                "bg-brand-accent text-text-inverse hover:bg-brand-accent-hover",
                "disabled:opacity-60 transition-colors"
              )}
            >
              {revertMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Retry from situation
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-start gap-4 mb-2">
        <Link
          to="/marketing-planner"
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface-100 transition-colors mt-0.5 shrink-0"
          aria-label="Back to marketing plans"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-text-primary truncate">Marketing Plan</h1>
            <div className="ml-auto shrink-0 flex items-center gap-2">
              {(plan.status === "completed" || plan.status === "failed") && (
                <button
                  onClick={() => {
                    if (confirm("Regenerate the entire plan? Current plan and Key Visual will be replaced.")) {
                      regeneratePlanMutation.mutate();
                    }
                  }}
                  disabled={regeneratePlanMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 hover:border-brand-accent/30 hover:text-brand-accent transition-colors disabled:opacity-60"
                  title="Regenerate plan with the same clarification answers"
                >
                  {regeneratePlanMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCw className="w-3.5 h-3.5" />
                  )}
                  Regenerate
                </button>
              )}
              <StatusBadge status={plan.status} size="lg" />
            </div>
          </div>
          <p className="text-sm text-text-secondary truncate mb-2">{headline}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {priority && <PriorityBadge priority={priority} />}
            <AreaBadge area={area} />
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="border-b border-surface-200 py-6">
        <StepIndicator
          currentStep={statusToStep(plan.status)}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Revert confirmation dialog */}
      {revertTarget && (
        <div className="rounded-xl border border-amber-500/30 bg-status-warning-light p-4 flex items-center justify-between gap-4 mt-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs font-medium text-text-primary">
              This will reset downstream steps. Continue?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setRevertTarget(null)}
              disabled={revertMutation.isPending}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-100 disabled:opacity-60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmRevert}
              disabled={revertMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
            >
              {revertMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="max-w-5xl mx-auto pt-8 pb-4">
        {renderStepContent()}
      </div>
    </div>
  );
}

// -- Page component ----------------------------------------------------------

export default function MarketingPlannerPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      {id ? (
        <div className="max-w-6xl mx-auto">
          <PlanWizard id={id} />
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-text-primary tracking-tight">Marketing Plan</h1>
              <p className="text-xs text-text-tertiary">
                Marketing plans driven by strategic recommendations
              </p>
            </div>
          </div>
          <PlanList />
        </>
      )}
    </div>
  );
}
