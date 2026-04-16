import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Plus, Clock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { api, type CampaignPlanState, type CampaignPlanSummary } from "@/lib/api-client";
import StepIndicator from "@/components/campaign-planner/StepIndicator";
import AuditStep from "@/components/campaign-planner/AuditStep";
import ClarificationStep from "@/components/campaign-planner/ClarificationStep";
import SummaryStep from "@/components/campaign-planner/SummaryStep";
import PlanDashboard from "@/components/campaign-planner/PlanDashboard";
import { cn } from "@/lib/utils";

// ── Status helpers ─────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  draft:       { label: "Draft",       bg: "bg-surface-100",       text: "text-text-secondary",  icon: Clock },
  audit:       { label: "Audit",       bg: "bg-blue-50",           text: "text-blue-700",        icon: Clock },
  clarifying:  { label: "Clarifying",  bg: "bg-amber-50",          text: "text-amber-700",       icon: Clock },
  summarizing: { label: "Summarizing", bg: "bg-purple-50",         text: "text-purple-700",      icon: Loader2 },
  generating:  { label: "Generating",  bg: "bg-indigo-50",         text: "text-indigo-700",      icon: Loader2 },
  completed:   { label: "Completed",   bg: "bg-status-success/10", text: "text-status-success",  icon: CheckCircle2 },
  failed:      { label: "Failed",      bg: "bg-red-50",            text: "text-red-700",         icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string }> = {
  high:   { bg: "bg-red-50",    text: "text-red-700" },
  medium: { bg: "bg-amber-50",  text: "text-amber-700" },
  low:    { bg: "bg-green-50",  text: "text-green-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  const isSpinning = status === "summarizing" || status === "generating";

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full", cfg.bg, cfg.text)}>
      <Icon className={cn("w-3.5 h-3.5", isSpinning && "animate-spin")} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority.toLowerCase()] ?? PRIORITY_CONFIG.medium;

  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full capitalize", cfg.bg, cfg.text)}>
      {priority}
    </span>
  );
}

// ── Status → step mapping for StepIndicator ────────────────

function statusToStep(status: CampaignPlanState["status"]): string {
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

// ── List mode ──────────────────────────────────────────────

function PlanList() {
  const navigate = useNavigate();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ["campaign-plans"],
    queryFn: () => api.campaignPlan.list(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <p className="text-sm text-text-secondary">Failed to load campaign plans.</p>
        <p className="text-xs text-text-tertiary">{error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center">
          <Plus className="w-8 h-8 text-text-tertiary" />
        </div>
        <p className="text-sm font-medium text-text-secondary">No campaign plans yet</p>
        <p className="text-xs text-text-tertiary max-w-sm text-center">
          Campaign plans are created from recommendations in the Discovery Feed.
          Navigate to the Discovery Feed to create your first campaign plan.
        </p>
      </div>
    );
  }

  // Group by recommendation headline
  const grouped = plans.reduce<Record<string, CampaignPlanSummary[]>>((acc, plan) => {
    const key = plan.recommendation_headline || "Untitled";
    if (!acc[key]) acc[key] = [];
    acc[key].push(plan);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([headline, groupPlans]) => (
        <div key={headline} className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">{headline}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groupPlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => navigate(`/campaign-planner/${plan.id}`)}
                className="text-left p-4 rounded-xl border border-surface-200 bg-surface-white hover:border-brand-accent/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <StatusBadge status={plan.status} />
                  <PriorityBadge priority={plan.recommendation_priority} />
                </div>
                <p className="text-xs text-text-tertiary mb-1 truncate">
                  {plan.recommendation_area}
                </p>
                <p className="text-xs text-text-tertiary">
                  {new Date(plan.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Wizard mode ────────────────────────────────────────────

function PlanWizard({ id }: { id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [revertTarget, setRevertTarget] = useState<string | null>(null);

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ["campaign-plan", id],
    queryFn: () => api.campaignPlan.get(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "summarizing" || status === "generating" ? 2000 : false;
    },
  });

  // ── Mutations ────────────────────────────────────────────

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["campaign-plan", id] });
  };

  const confirmAuditMutation = useMutation({
    mutationFn: () => api.campaignPlan.confirmAudit(id),
    onSuccess: invalidate,
  });

  const answerMutation = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: number; answer: unknown }) =>
      api.campaignPlan.answer(id, questionId, answer),
    onSuccess: invalidate,
  });

  const generateSummaryMutation = useMutation({
    mutationFn: () => api.campaignPlan.generateSummary(id),
    onSuccess: invalidate,
  });

  const approveSummaryMutation = useMutation({
    mutationFn: () => api.campaignPlan.approveSummary(id),
    onSuccess: invalidate,
  });

  const editSectionMutation = useMutation({
    mutationFn: ({ key, content }: { key: string; content: Record<string, unknown> }) =>
      api.campaignPlan.updateSection(id, key, content),
    onSuccess: invalidate,
  });

  const resetSectionMutation = useMutation({
    mutationFn: (key: string) => api.campaignPlan.resetSection(id, key),
    onSuccess: invalidate,
  });

  const revertMutation = useMutation({
    mutationFn: (step: string) => api.campaignPlan.revert(id, step),
    onSuccess: () => {
      setRevertTarget(null);
      invalidate();
    },
  });

  // ── Step click with confirmation ─────────────────────────

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

  // ── Loading state ────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand-accent animate-spin" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <p className="text-sm text-text-secondary">Failed to load campaign plan.</p>
        <p className="text-xs text-text-tertiary">{error instanceof Error ? error.message : "Plan not found"}</p>
        <Link
          to="/campaign-planner"
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-accent hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to list
        </Link>
      </div>
    );
  }

  // ── Recommendation info from plan ────────────────────────

  const rec = plan.recommendation as Record<string, string> | null;
  const headline = rec?.headline || "Campaign Plan";
  const priority = rec?.priority || "";

  // ── Render step content ──────────────────────────────────

  const renderStepContent = () => {
    switch (plan.status) {
      case "draft":
      case "audit":
        if (!plan.audit_result) {
          return (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-brand-accent animate-spin" />
              <span className="ml-2 text-sm text-text-secondary">Preparing audit...</span>
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-brand-accent animate-spin" />
              <span className="ml-2 text-sm text-text-secondary">Loading questions...</span>
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
          />
        );

      case "failed":
        return (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <XCircle className="w-10 h-10 text-red-500" />
            <p className="text-sm font-medium text-text-primary">Plan generation failed</p>
            {plan.error && (
              <p className="text-xs text-text-tertiary max-w-md text-center">{plan.error}</p>
            )}
            <button
              onClick={() => revertMutation.mutate("audit")}
              disabled={revertMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-accent text-text-inverse hover:bg-brand-accent-hover disabled:opacity-60 transition-colors"
            >
              {revertMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Retry from audit
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/campaign-planner"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-surface-200 hover:bg-surface-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-text-secondary" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-text-primary truncate">{headline}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {priority && <PriorityBadge priority={priority} />}
          <StatusBadge status={plan.status} />
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator
        currentStep={statusToStep(plan.status)}
        onStepClick={handleStepClick}
      />

      {/* Revert confirmation dialog */}
      {revertTarget && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs font-medium text-amber-800">
              This will reset downstream steps. Continue?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setRevertTarget(null)}
              disabled={revertMutation.isPending}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 disabled:opacity-60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmRevert}
              disabled={revertMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
            >
              {revertMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Step content */}
      {renderStepContent()}
    </div>
  );
}

// ── Page component ─────────────────────────────────────────

export default function CampaignPlannerPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {id ? (
        <PlanWizard id={id} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-bold text-text-primary">Campaign Planner</h1>
          </div>
          <PlanList />
        </>
      )}
    </div>
  );
}
