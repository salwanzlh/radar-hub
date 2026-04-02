import { useState, useRef, type ComponentPropsWithoutRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MarkdownEditor from "@/components/MarkdownEditor";
import {
  MessageSquareText,
  Monitor,
  Megaphone,
  MapPin,
  Lock,
  Loader2,
  Pencil,
  Save,
  X,
  RotateCcw,
  Download,
  FileText,
  Check,
  ChevronDown,
  ImageIcon,
  Wand2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cn, formatRelativeDate } from "@/lib/utils";
import toast from "react-hot-toast";
import ReactMarkdown, { type Components } from "react-markdown";

const TABS = [
  { key: "product_communication", label: "Product Communication", icon: MessageSquareText, disabled: false },
  { key: "digital_activities", label: "Digital Activities", icon: Monitor, disabled: true },
  { key: "atl_marcomm", label: "ATL & Marcomm", icon: Megaphone, disabled: true },
  { key: "btl", label: "BTL", icon: MapPin, disabled: true },
] as const;

type SectionKey = (typeof TABS)[number]["key"];

/* ── Markdown Components ── */

function useReportComponents(): Components {
  const counterRef = useRef(0);

  return {
    h2({ children }: ComponentPropsWithoutRef<"h2">) {
      const text = String(children);
      const isSummary = /summary/i.test(text);
      counterRef.current = 0;
      return (
        <div className={cn("mb-4", !isSummary && "mt-10")}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-1 h-6 rounded-full shrink-0",
              isSummary ? "bg-status-info" : "bg-brand-accent"
            )} />
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-text-tertiary">
              {children}
            </h2>
          </div>
        </div>
      );
    },

    h3({ children }: ComponentPropsWithoutRef<"h3">) {
      return (
        <div>
          <h3 className="text-[42px] font-bold text-text-primary leading-snug">
            {children}
          </h3>
        </div>
      );
    },

    p({ children }: ComponentPropsWithoutRef<"p">) {
      return <p className="text-sm text-text-secondary leading-relaxed mb-3 ml-0">{children}</p>;
    },

    ul({ children }: ComponentPropsWithoutRef<"ul">) {
      return <ul className="space-y-1.5 mb-4 ml-1">{children}</ul>;
    },

    li({ children }: ComponentPropsWithoutRef<"li">) {
      return (
        <li className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent/40 shrink-0 mt-2" />
          <span>{children}</span>
        </li>
      );
    },

    strong({ children }: ComponentPropsWithoutRef<"strong">) {
      return <strong className="font-semibold text-text-primary">{children}</strong>;
    },

    blockquote({ children }: ComponentPropsWithoutRef<"blockquote">) {
      return (
        <blockquote className="border-l-2 border-brand-accent/30 pl-4 py-1 my-3 text-sm text-text-secondary italic">
          {children}
        </blockquote>
      );
    },

    hr() {
      return null;
    },
  };
}

/* ── Pillar Splitting ── */

function splitByPillars(content: string): { intro: string; pillars: { name: string; markdown: string }[] } {
  const lines = content.split("\n");
  let intro = "";
  const pillars: { name: string; markdown: string }[] = [];
  let currentName = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) {
      if (currentName) {
        pillars.push({ name: currentName, markdown: currentLines.join("\n").trim() });
      }
      currentName = h3Match[1].replace(/^\d+\.\s*/, "").trim();
      currentLines = [line];
    } else if (currentName) {
      currentLines.push(line);
    } else {
      intro += line + "\n";
    }
  }
  if (currentName) {
    pillars.push({ name: currentName, markdown: currentLines.join("\n").trim() });
  }
  return { intro: intro.trim(), pillars };
}

/* ── KV Image Panel (right side) ── */

function KVImagePanel({
  pillarName,
  imageB64,
  error,
  isLoading,
  onGenerate,
  onPreview,
}: {
  pillarName: string;
  imageB64: string | undefined;
  error: string | undefined;
  isLoading: boolean;
  onGenerate: () => void;
  onPreview: (src: string, name: string) => void;
}) {
  function downloadImage() {
    if (!imageB64) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${imageB64}`;
    a.download = `kv-${pillarName.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  if (imageB64) {
    return (
      <div className="flex flex-col items-center gap-3">
        <img
          src={`data:image/png;base64,${imageB64}`}
          alt={`KV - ${pillarName}`}
          className="w-full rounded-lg border border-surface-200 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onPreview(`data:image/png;base64,${imageB64}`, pillarName)}
        />
        <div className="flex gap-2 self-start">
          <button
            onClick={downloadImage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-white border border-surface-200 text-text-secondary hover:bg-surface-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-white border border-surface-200 text-text-secondary hover:bg-surface-100 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Regenerate
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 rounded-xl bg-surface-50 border border-dashed border-status-error/30">
        <p className="text-xs text-status-error text-center">KV generation failed</p>
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6 rounded-xl bg-surface-50 border border-dashed border-surface-300">
      <ImageIcon className="w-8 h-8 text-text-tertiary/40" />
      <p className="text-xs text-text-tertiary text-center">Key Visual belum tersedia</p>
      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors disabled:opacity-50"
      >
        {isLoading ? (
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
    </div>
  );
}

/* ── Product Communication View (2-column: content left, KV right) ── */

function ProductCommunicationView({
  content,
  citedArticles,
  kvImages,
  kvLoading,
  onGenerateKV,
  onPreview,
  components,
}: {
  content: string;
  citedArticles: Record<string, unknown>[] | null;
  kvImages: Record<string, string>;
  kvLoading: Record<string, boolean>;
  onGenerateKV: (pillarName: string, keyMessage: string) => void;
  onPreview: (src: string, name: string) => void;
  components: Components;
}) {
  const { intro, pillars } = splitByPillars(content);
  const savedKVs = (citedArticles || []) as Array<{ pillar_name?: string; image_base64?: string; error?: string }>;

  return (
    <div className="prose-sm max-w-none">
      {intro && <ReactMarkdown components={components}>{intro}</ReactMarkdown>}

      {pillars.map((pillar) => {
        const isSummary = pillar.name.toLowerCase().includes("summary");
        const savedKV = savedKVs.find((k) => k.pillar_name === pillar.name);
        const imageB64 = kvImages[pillar.name] || savedKV?.image_base64;
        const kvError = !kvImages[pillar.name] && savedKV?.error ? savedKV.error : undefined;

        if (isSummary) {
          return (
            <div key={pillar.name} className="mb-3 pb-3 border-b border-surface-100 last:border-b-0">
              <ReactMarkdown components={components}>{pillar.markdown}</ReactMarkdown>
            </div>
          );
        }

        return (
          <div key={pillar.name} className="mb-3 pb-3 border-b border-surface-100 last:border-b-0">
            <div className="grid grid-cols-5 gap-6 items-start">
              {/* Left: KV image */}
              <div className="col-span-2">
                <KVImagePanel
                  pillarName={pillar.name}
                  imageB64={imageB64}
                  error={kvError}
                  isLoading={kvLoading[pillar.name] || false}
                  onGenerate={() => onGenerateKV(pillar.name, pillar.markdown)}
                  onPreview={onPreview}
                />
              </div>
              {/* Right: content */}
              <div className="col-span-3">
                <ReactMarkdown components={components}>{pillar.markdown}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Page ── */

export default function MarketingPlanPage() {
  const queryClient = useQueryClient();
  const components = useReportComponents();

  const [selectedLineupId, setSelectedLineupId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectionKey>("product_communication");
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [versionOpen, setVersionOpen] = useState(false);
  const [kvImages, setKvImages] = useState<Record<string, string>>({});
  const [kvLoading, setKvLoading] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);
  const [showReviseInline, setShowReviseInline] = useState(false);
  const [reviseInstruction, setReviseInstruction] = useState("");

  // ── Data queries ──

  const { data: lineups = [] } = useQuery({
    queryKey: ["lineups"],
    queryFn: api.lineupAnalysis.lineups,
  });

  const effectiveLineupId = selectedLineupId || lineups[0]?.id || null;

  const { data: planVersions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ["marketing-plan-versions", effectiveLineupId],
    queryFn: () => api.marketingPlan.listByLineup(effectiveLineupId!),
    enabled: !!effectiveLineupId,
  });

  const effectivePlanId = selectedPlanId || planVersions[0]?.id || null;

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["marketing-plan", effectivePlanId],
    queryFn: () => api.marketingPlan.get(effectivePlanId!),
    enabled: !!effectivePlanId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "generating" ? 3000 : false;
    },
  });

  const isGenerating = plan?.status === "generating";

  // ── Mutations ──

  const generateMutation = useMutation({
    mutationFn: () => api.marketingPlan.generate(effectiveLineupId!),
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ["marketing-plan-versions", effectiveLineupId] });
      setSelectedPlanId(newPlan.id);
      queryClient.setQueryData(["marketing-plan", newPlan.id], newPlan);
      toast.success("Plan generation started");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateSectionMutation = useMutation({
    mutationFn: () => api.marketingPlan.updateSection(effectivePlanId!, activeTab, editContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-plan", effectivePlanId] });
      setEditMode(false);
      toast.success("Section saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reviseMutation = useMutation({
    mutationFn: (data: { instruction: string; mode: "selected" | "full"; selected_text?: string }) =>
      api.marketingPlan.revise(effectivePlanId!, { ...data, section_type: activeTab }),
    onSuccess: (data) => {
      setEditContent(data.revised_content);
      setEditMode(true);
      setShowReviseInline(false);
      setReviseInstruction("");
      toast.success("Content revised. Review and save when ready.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.marketingPlan.updateStatus(effectivePlanId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-plan", effectivePlanId] });
      queryClient.invalidateQueries({ queryKey: ["marketing-plan-versions", effectiveLineupId] });
      toast.success("Status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── KV generation ──

  async function handleGenerateKV(pillarName: string, keyMessage: string) {
    if (!effectivePlanId || !effectiveLineupId) return;
    const lineup = lineups.find((l) => l.id === effectiveLineupId);
    if (!lineup) return;

    setKvLoading((prev) => ({ ...prev, [pillarName]: true }));
    try {
      const result = await api.marketingPlan.generateKV(effectivePlanId, {
        product_name: lineup.name,
        product_slug: lineup.slug,
        pillar_name: pillarName,
        key_message: keyMessage,
      });
      setKvImages((prev) => ({ ...prev, [pillarName]: result.image }));
      queryClient.invalidateQueries({ queryKey: ["marketing-plan", effectivePlanId] });
      toast.success(`KV generated for ${pillarName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "KV generation failed");
    } finally {
      setKvLoading((prev) => ({ ...prev, [pillarName]: false }));
    }
  }

  // ── Handlers ──

  const currentSection = plan?.sections.find((s) => s.section_type === activeTab);
  const selectedVersion = planVersions.find((v) => v.id === effectivePlanId);

  function handleEdit() {
    setEditContent(currentSection?.content || "");
    setEditMode(true);
  }

  function handleReset() {
    if (currentSection?.ai_draft) setEditContent(currentSection.ai_draft);
  }

  function handleCancel() {
    setEditMode(false);
    setEditContent("");
  }


  async function handleDownloadPdf() {
    if (!effectivePlanId) return;
    try {
      const lineup = lineups.find((l) => l.id === effectiveLineupId);
      await api.marketingPlan.downloadPdf(
        effectivePlanId,
        `marketing-plan-${lineup?.slug || "plan"}-v${plan?.version || 1}.pdf`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF download failed");
    }
  }

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Marketing Plan</h1>
            <p className="text-xs text-text-tertiary mt-1">
              AI-generated marketing plans per product lineup
            </p>
          </div>
          <div className="flex items-center gap-2">
            {plan && (
              <>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={() => statusMutation.mutate(plan.status === "draft" ? "published" : "draft")}
                  disabled={statusMutation.isPending}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                    plan.status === "draft"
                      ? "bg-status-success/10 text-status-success hover:bg-status-success/20"
                      : "bg-surface-100 text-text-secondary hover:bg-surface-200"
                  )}
                >
                  <Check className="w-4 h-4" />
                  {plan.status === "draft" ? "Publish" : "Unpublish"}
                </button>
              </>
            )}
            <button
              onClick={() => generateMutation.mutate()}
              disabled={!effectiveLineupId || generateMutation.isPending || isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-accent text-text-inverse rounded-xl text-sm font-semibold hover:bg-brand-accent-hover transition-colors disabled:opacity-50"
            >
              {generateMutation.isPending || isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {isGenerating ? "Generating..." : "Generate Plan"}
            </button>
          </div>
        </div>

        {/* Product Selector + Version */}
        <div className="flex items-center gap-2 flex-wrap">
          {lineups.map((lineup) => (
            <button
              key={lineup.id}
              onClick={() => {
                setSelectedLineupId(lineup.id);
                setSelectedPlanId(null);
                setEditMode(false);
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                effectiveLineupId === lineup.id
                  ? "bg-brand-accent text-text-inverse"
                  : "bg-surface-100 text-text-secondary hover:bg-surface-200"
              )}
            >
              {lineup.name}
            </button>
          ))}

          {planVersions.length > 0 && (
            <div className="relative ml-auto">
              <button
                onClick={() => setVersionOpen(!versionOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors"
              >
                {selectedVersion ? `v${selectedVersion.version}` : "Latest"}
                {plan && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase",
                    plan.status === "published"
                      ? "bg-status-success/15 text-status-success"
                      : "bg-status-warning/15 text-status-warning"
                  )}>
                    {plan.status}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {versionOpen && (
                <div className="absolute right-0 top-full mt-1 bg-surface-white rounded-xl shadow-dropdown border border-surface-200 py-1 z-20 min-w-[160px]">
                  {planVersions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedPlanId(v.id);
                        setVersionOpen(false);
                        setEditMode(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm hover:bg-surface-100 transition-colors flex items-center justify-between",
                        v.id === effectivePlanId ? "text-brand-accent font-medium" : "text-text-secondary"
                      )}
                    >
                      <span>v{v.version}</span>
                      <span className="text-xs text-text-tertiary">{formatRelativeDate(v.created_at)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {effectivePlanId && (
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const hasContent = !!plan?.sections.find((s) => s.section_type === tab.key)?.content;
            return (
              <button
                key={tab.key}
                onClick={() => { if (!tab.disabled) { setActiveTab(tab.key); setEditMode(false); } }}
                disabled={tab.disabled}
                title={tab.disabled ? "Coming soon" : undefined}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-medium whitespace-nowrap transition-colors relative",
                  tab.disabled
                    ? "text-text-tertiary/40 cursor-not-allowed"
                    : isActive
                      ? "bg-surface-white text-text-primary shadow-card"
                      : "text-text-tertiary hover:text-text-secondary hover:bg-surface-white/50"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.disabled && <Lock className="w-3 h-3" />}
                {!tab.disabled && hasContent && <span className="w-2 h-2 rounded-full bg-status-success" />}
                {!tab.disabled && isActive && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-accent rounded-full" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {(versionsLoading || (planLoading && effectivePlanId)) && !isGenerating && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
        </div>
      )}

      {/* Generating state */}
      {isGenerating && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 flex items-center justify-center mb-4">
              <Loader2 className="w-7 h-7 animate-spin text-brand-accent" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Generating Marketing Plan</h3>
            <p className="text-xs text-text-tertiary max-w-sm">
              AI is analyzing market data, building positioning pillars, and generating key visuals. This page will update automatically when ready.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!effectivePlanId && !planLoading && !versionsLoading && effectiveLineupId && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-text-tertiary" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary mb-1">No marketing plan yet</h3>
          <p className="text-xs text-text-tertiary mb-4">
            Generate an AI-powered marketing plan for this product
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || isGenerating}
            className="px-5 py-2.5 bg-brand-accent text-text-inverse rounded-xl text-sm font-semibold hover:bg-brand-accent-hover transition-colors disabled:opacity-50"
          >
            {generateMutation.isPending || isGenerating ? "Generating..." : "Generate Plan"}
          </button>
        </div>
      )}

      {/* Section content */}
      {plan && currentSection && !planLoading && !isGenerating && (
        <div className="bg-surface-white rounded-[20px] shadow-card p-7">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-text-tertiary">
              {TABS.find((t) => t.key === activeTab)?.label}
            </h3>
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 text-text-tertiary hover:text-text-secondary transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to AI Draft
                  </button>
                  <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors">
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={() => updateSectionMutation.mutate()}
                    disabled={updateSectionMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-accent text-text-inverse hover:bg-brand-accent-hover transition-colors disabled:opacity-50"
                  >
                    {updateSectionMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setReviseInstruction(""); setShowReviseInline(true); }}
                    disabled={!currentSection?.content}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Revise with AI
                  </button>
                  <button onClick={handleEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Revise with AI — inline panel */}
          {showReviseInline && (
            <div className="relative mb-5">
              {reviseMutation.isPending && (
                <div className="absolute inset-0 bg-surface-50/80 backdrop-blur-[1px] rounded-xl z-10 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-accent" />
                  <span className="text-xs font-medium text-text-secondary">AI is revising your content...</span>
                </div>
              )}
              <form
                className="p-4 bg-surface-50 border border-surface-200 rounded-xl"
                onSubmit={(e) => { e.preventDefault(); if (reviseInstruction.trim()) reviseMutation.mutate({ instruction: reviseInstruction, mode: "full" }); }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="w-4 h-4 text-brand-accent" />
                  <span className="text-xs font-semibold text-text-primary">Revise with AI</span>
                </div>
                <textarea
                  value={reviseInstruction}
                  onChange={(e) => setReviseInstruction(e.target.value)}
                  placeholder="Describe what changes you want, e.g., Buat lebih singkat, fokus pada data kompetitor, ubah tone lebih formal..."
                  autoFocus
                  disabled={reviseMutation.isPending}
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-white border border-surface-200 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/25 disabled:opacity-60 transition-colors resize-none mb-3"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowReviseInline(false); setReviseInstruction(""); }}
                    disabled={reviseMutation.isPending}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!reviseInstruction.trim() || reviseMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-accent text-text-inverse hover:bg-brand-accent-hover disabled:opacity-60 transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Revise
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Content */}
          {editMode ? (
            <MarkdownEditor
              value={editContent}
              onChange={setEditContent}
              placeholder="Start writing your marketing plan content..."
              onReviseSelection={async (selectedText, instruction) => {
                const result = await api.marketingPlan.revise(effectivePlanId!, {
                  instruction,
                  mode: "selected",
                  selected_text: selectedText,
                  section_type: activeTab,
                });
                toast.success("Selection revised.");
                return result.revised_content;
              }}
              isRevising={reviseMutation.isPending}
            />
          ) : activeTab === "product_communication" && currentSection?.content ? (
            <ProductCommunicationView
              content={currentSection.content}
              citedArticles={currentSection.cited_articles}
              kvImages={kvImages}
              kvLoading={kvLoading}
              onGenerateKV={handleGenerateKV}
              onPreview={(src, name) => setPreviewImage({ src, name })}
              components={components}
            />
          ) : (
            <div className="prose-sm max-w-none">
              <ReactMarkdown components={components}>
                {currentSection.content || "_No content generated yet_"}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
            >
              <X className="w-4 h-4" />
              Close
            </button>
            <img
              src={previewImage.src}
              alt={previewImage.name}
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
            />
            <p className="text-center text-white/60 text-xs mt-3">{previewImage.name}</p>
          </div>
        </div>
      )}

      {/* Generation overlay */}
    </div>
  );
}
