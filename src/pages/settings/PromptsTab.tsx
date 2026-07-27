import { useState, useMemo, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Save, X, Pencil, Wand2 } from "lucide-react";
import { api, type PromptTemplate } from "@/lib/api-client";
import toast from "react-hot-toast";

const CATEGORY_LABELS: Record<string, string> = {
  chat: "Chat / Discovery",
  marketing_plan: "Marketing Plan (V2)",
  marketing_planner: "Marketing Plan",
  kv_generation: "KV Image Generation",
  lineup_analysis: "Lineup Analysis (Discovery Feed)",
};

const CATEGORY_ORDER = ["chat", "marketing_planner", "marketing_plan", "kv_generation", "lineup_analysis"];

const PROMPT_DESCRIPTIONS: Record<string, string> = {
  // Marketing Planner
  mkp_audit_system: "Runs when user clicks 'Start Planning'. Scans recommendation + findings, classifies 10 categories as provided/partial/missing. Output: Content Map table + Gaps list in Situation step.",
  mkp_clarification_system: "Generates interactive questions one-by-one after the Situation step is confirmed. Picks input type (select/checkbox/text/budget). Always asks brand tone, channels, budget. Output: question cards in Clarification step.",
  mkp_summary_system: "Generates strategic brief after all clarification questions are answered. Output: Situation Snapshot, SWOT, Core Tension, Strategic Play, Positioning, Audience, Messaging Territory, Budget Reality Check in Summary step.",
  mkp_plan_call_a: "Parallel call A — generates Executive Summary (SMART objectives), Target Audience (2 personas), Strategic Framework (positioning, messaging layers, RTBs). Shown in first 3 tabs of Plan dashboard.",
  mkp_plan_call_b: "Parallel call B — generates Campaign Architecture (big idea, 5 hero content, tactical rules), Channel & Content Plan (pillars, calendar), Budget Allocation. Shown in tabs 4-6 of Plan dashboard.",
  mkp_plan_call_c: "Parallel call C — generates KPIs & Measurement (dashboard, triggers), Timeline & Roadmap (phases, RACI), Risks & Counter-messages (risk register, dealer talking points). Shown in tabs 7-9.",
  // Chat
  chat_quick: "System prompt for Quick Q&A chat mode. Handles user questions about news, data, and market intelligence.",
  chat_advisor: "System prompt for Advisor chat mode. Provides strategic advisory responses with deeper analysis.",
  // Lineup Analysis
  lineup_news_system: "Fetches and analyzes news articles for competitive developments impacting the product lineup.",
  lineup_impact_assessment_system: "Cross-references all data sources (news, sentiment, ATOA, pricing) into categorized findings with severity (red/yellow/green).",
  lineup_strategic_recommendation_system: "Produces 3-7 actionable strategic recommendations from impact findings. Each rec links to specific findings.",
};

function highlightVariables(text: string): ReactNode[] {
  const parts = text.split(/(\{[^}]+\})/g);
  return parts.map((part, i) =>
    /^\{[^}]+\}$/.test(part) ? (
      <span key={i} className="text-status-info font-semibold bg-status-info/10 px-0.5 rounded">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function PromptsTab() {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["prompt-templates"],
    queryFn: api.promptTemplates.list,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, content }: { key: string; content: string }) =>
      api.promptTemplates.update(key, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      setEditingKey(null);
      setEditContent("");
      toast.success("Prompt updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetMutation = useMutation({
    mutationFn: (key: string) => api.promptTemplates.reset(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      setEditingKey(null);
      setEditContent("");
      toast.success("Prompt reset to default");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleEdit(template: PromptTemplate) {
    setEditingKey(template.key);
    setEditContent(template.content);
  }

  function handleCancel() {
    setEditingKey(null);
    setEditContent("");
  }

  const availableCategories = useMemo(() => {
    if (!templates) return [];
    return CATEGORY_ORDER
      .map((cat) => ({
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
        count: templates.filter((t) => t.category === cat).length,
      }))
      .filter((g) => g.count > 0);
  }, [templates]);

  const currentCategory = useMemo(() => {
    const stillValid = availableCategories.some((c) => c.category === activeCategory);
    return stillValid ? activeCategory : availableCategories[0]?.category ?? null;
  }, [activeCategory, availableCategories]);

  const visibleTemplates = useMemo(() => {
    if (!templates || !currentCategory) return [];
    return templates.filter((t) => t.category === currentCategory);
  }, [templates, currentCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-text-secondary">
          Customize AI prompts used across the system. Changes take effect immediately.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 border-b border-surface-200 overflow-x-auto">
        {availableCategories.map((cat) => {
          const isActive = cat.category === currentCategory;
          return (
            <button
              key={cat.category}
              onClick={() => setActiveCategory(cat.category)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                isActive
                  ? "border-brand-accent text-brand-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <Wand2 className="w-4 h-4" />
              {cat.label}
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-surface-100 text-text-tertiary">
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Templates for active category */}
      <div className="space-y-3">
        {visibleTemplates.length === 0 && currentCategory && (
          <div className="flex items-center justify-center py-12 text-sm text-text-tertiary">
            No prompts in this category yet.
          </div>
        )}
        {visibleTemplates.map((template) => {
          const isEditing = editingKey === template.key;
          const isBusy = (updateMutation.isPending || resetMutation.isPending) && editingKey === template.key;

          return (
            <div
              key={template.key}
              className="border border-surface-200 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 bg-surface-50">
                <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-text-primary">
                    {template.label}
                  </span>
                  {!template.is_default && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-brand-accent/10 text-brand-accent">
                      Customized
                    </span>
                  )}
                </div>
                {PROMPT_DESCRIPTIONS[template.key] && (
                  <p className="text-[11px] text-text-tertiary leading-relaxed mt-1">
                    {PROMPT_DESCRIPTIONS[template.key]}
                  </p>
                )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isEditing ? (
                    <>
                      {!template.is_default && (
                        <button
                          onClick={() => resetMutation.mutate(template.key)}
                          disabled={isBusy}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-status-error hover:bg-status-error-light transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset Default
                        </button>
                      )}
                      <button
                        onClick={handleCancel}
                        disabled={isBusy}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                      <button
                        onClick={() => updateMutation.mutate({ key: template.key, content: editContent })}
                        disabled={isBusy || editContent === template.content}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-accent text-text-inverse hover:bg-brand-accent-hover transition-colors disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEdit(template)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    disabled={isBusy}
                    rows={Math.min(20, Math.max(6, editContent.split("\n").length + 2))}
                    className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm text-text-primary font-mono leading-relaxed resize-y focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/25 disabled:opacity-60 transition-colors"
                  />
                ) : (
                  <pre className="text-xs text-text-secondary font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {highlightVariables(template.content)}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
