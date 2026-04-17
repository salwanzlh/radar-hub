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
  Calendar,
} from "lucide-react";
import { api, type MarketingPlanState, type MarketingPlanSummary } from "@/lib/api-client";
import StepIndicator from "@/components/campaign-planner/StepIndicator";
import AuditStep from "@/components/campaign-planner/AuditStep";
import ClarificationStep from "@/components/campaign-planner/ClarificationStep";
import SummaryStep from "@/components/campaign-planner/SummaryStep";
import PlanDashboard from "@/components/campaign-planner/PlanDashboard";
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
    label: "Audit",
    dot: "bg-status-info",
    text: "text-status-info",
    icon: Clock,
    gradient: "from-status-info to-blue-400",
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

function PlanList() {
  const navigate = useNavigate();
  const [activeProduct, setActiveProduct] = useState<string | null>(null);

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ["marketing-plans"],
    queryFn: () => api.marketingPlanner.list(),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl bg-surface-white p-5 space-y-3" style={{ boxShadow: "var(--th-shadow-card)" }}>
            <div className="h-3 w-full rounded bg-surface-200" />
            <div className="h-3 w-3/4 rounded bg-surface-200" />
            <div className="h-3 w-1/2 rounded bg-surface-200" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl bg-status-error-light border border-status-error/20"
      >
        <AlertTriangle className="w-10 h-10 text-status-error mb-4" />
        <p className="text-sm font-semibold text-text-primary mb-1">Failed to load marketing plans</p>
        <p className="text-xs text-text-tertiary mb-4">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-status-error text-white hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <div className="w-20 h-20 rounded-2xl bg-surface-100 flex items-center justify-center mb-6">
          <Target className="w-10 h-10 text-text-tertiary" />
        </div>
        <p className="text-base font-semibold text-text-primary mb-2">No marketing plans yet</p>
        <p className="text-sm text-text-tertiary max-w-sm text-center mb-6 leading-relaxed">
          Start by selecting a recommendation from the Discovery Feed to generate your first marketing plan.
        </p>
        <Link
          to="/analysis"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-brand-accent text-text-inverse hover:bg-brand-accent-hover transition-colors"
        >
          Go to Discovery Feed
        </Link>
      </div>
    );
  }

  // Group by product name
  const grouped = plans.reduce<Record<string, MarketingPlanSummary[]>>((acc, plan) => {
    const key = plan.product_name || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(plan);
    return acc;
  }, {});

  const productNames = Object.keys(grouped);
  const activeName = productNames.includes(activeProduct ?? "") ? activeProduct! : productNames[0];
  const activePlans = grouped[activeName] ?? [];

  return (
    <div className="space-y-0">
      {/* Product tabs */}
      <div className="border-b border-surface-100">
        <div className="flex overflow-x-auto pt-1 gap-1 scrollbar-hide">
          {productNames.map((name) => {
            const isActive = name === activeName;
            const count = grouped[name].length;
            return (
              <button
                key={name}
                onClick={() => setActiveProduct(name)}
                className={cn(
                  "relative px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 whitespace-nowrap shrink-0",
                  isActive
                    ? "bg-surface-100 text-text-primary"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-surface-50"
                )}
              >
                <span className="flex items-center gap-2">
                  {name}
                  <span className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-brand-accent/10 text-brand-accent" : "bg-surface-200 text-text-tertiary"
                  )}>{count}</span>
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-accent rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active product plan list */}
      <div className="bg-surface-white rounded-b-xl border border-t-0 border-surface-100 overflow-hidden divide-y divide-surface-100">
        {activePlans.map((plan) => {
          const statusCfg = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG.draft;
          return (
            <button
              key={plan.id}
              onClick={() => navigate(`/marketing-planner/${plan.id}`)}
              className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-surface-50 transition-colors group"
            >
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0",
                statusCfg.gradient.includes("green") ? "bg-status-success"
                  : statusCfg.gradient.includes("red") ? "bg-status-error"
                    : "bg-status-warning"
              )} />
              <p className="flex-1 text-sm text-text-primary truncate leading-snug group-hover:text-brand-accent transition-colors">
                {plan.recommendation_headline}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={plan.recommendation_priority} />
                <AreaBadge area={plan.recommendation_area ?? ""} />
                <StatusBadge status={plan.status} />
              </div>
              <span className="text-[11px] text-text-tertiary shrink-0 w-28 text-right">
                {new Date(plan.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </button>
          );
        })}
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

  const answerMutation = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: number; answer: unknown }) =>
      api.marketingPlanner.answer(id, questionId, answer),
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
                <span className="text-sm text-text-secondary">Preparing audit...</span>
              </div>
            </div>
          );
        }
        return (
          <AuditStep
            auditResult={plan.audit_result}
            onConfirm={() => confirmAuditMutation.mutate()}
            isConfirming={confirmAuditMutation.isPending}
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
            onBack={() => handleStepClick("clarification")}
            isApproving={approveSummaryMutation.isPending}
          />
        );

      case "generating":
      case "completed":
        return (
          <PlanDashboard
            plan={plan.plan ?? {}}
            onEditSection={(key, content) => editSectionMutation.mutate({ key, content })}
            onResetSection={(key) => resetSectionMutation.mutate(key)}
            status={plan.status}
            isEditing={editSectionMutation.isPending}
            keyVisual={plan.key_visual ?? undefined}
            onRegenerateKv={() => regenerateKvMutation.mutate()}
            isRegeneratingKv={regenerateKvMutation.isPending}
          />
        );

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
              Retry from audit
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
            <div className="ml-auto shrink-0">
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
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {id ? (
        <PlanWizard id={id} />
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-xl font-bold text-text-primary mb-1">Marketing Planner</h1>
            <p className="text-sm text-text-secondary">
              Marketing plans driven by strategic recommendations
            </p>
          </div>
          <PlanList />
        </>
      )}
    </div>
  );
}
