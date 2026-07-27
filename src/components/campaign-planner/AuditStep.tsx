import { useMemo, useRef, useState, type SyntheticEvent } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditResult, QuickFillField } from "@/lib/api-client";

interface Props {
  auditResult: AuditResult;
  onConfirm: () => void;
  isConfirming: boolean;
  onGenerateQuickFill: (category: string) => void;
  isGeneratingQuickFill: (category: string) => boolean;
  hasQuickFillGenerateError: (category: string) => boolean;
  onSaveQuickFillAnswers: (category: string, answers: QuickFillAnswers) => void;
  isSavingQuickFill: (category: string) => boolean;
}

type ContentMapItem = AuditResult["content_map"][number];

const STATUS_CONFIG: Record<
  string,
  {
    bg: string;
    text: string;
    ring: string;
    dot: string;
    icon: typeof CheckCircle2;
    label: string;
  }
> = {
  provided: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    ring: "ring-emerald-500/20",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
    label: "Lengkap",
  },
  partial: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500",
    icon: AlertTriangle,
    label: "Sebagian",
  },
  missing: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    ring: "ring-red-500/20",
    dot: "bg-red-500",
    icon: XCircle,
    label: "Kosong",
  },
};

// Missing surfaces first — the user needs to see what the system doesn't
// know before being reassured by what it already has.
const STATUS_ORDER: Record<string, number> = { missing: 0, partial: 1, provided: 2 };

// Fixed 10-category taxonomy from audit_agent.py's SYSTEM_PROMPT, grouped by
// how a marketer actually reads context: who/why, then market situation,
// then what's realistically executable.
const BLOCKS: { title: string; subtitle: string; categories: string[] }[] = [
  {
    title: "Kenapa Ini Penting",
    subtitle: "tujuan & target",
    categories: ["Business Objectives", "Target Audience"],
  },
  {
    title: "Situasi Pasar",
    subtitle: "produk, sentimen, kompetitor, urgensi",
    categories: [
      "Competitive Context",
      "Product Strengths/Weaknesses",
      "Consumer Sentiment",
      "Timeline/Urgency",
    ],
  },
  {
    title: "Apa yang Bisa Dilakukan",
    subtitle: "budget, channel, aset, tone",
    categories: ["Budget", "Existing Assets", "Brand Tone", "Channel Preference"],
  },
];

type QuickFillAnswers = Record<string, string | string[]>;

function QuickFillInput({
  field,
  value,
  onChange,
}: {
  field: QuickFillField;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  const wideClass = field.wide ? "flex-[2] min-w-[220px]" : "flex-1 min-w-[150px]";

  if (field.type === "chips") {
    // Options are mutually exclusive (e.g. a yes/no-style question) unless
    // the field opts into multi-select — exclusive fields store a single
    // string, not an array, so picking one clears any other selection.
    const isMultiple = field.multiple ?? true;
    const selected = isMultiple ? (Array.isArray(value) ? value : []) : typeof value === "string" && value ? [value] : [];
    const options = field.options ?? [];
    return (
      <div className={wideClass}>
        <label className="block text-[11px] font-semibold text-text-secondary mb-1.5 leading-tight">
          {field.label}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                type="button"
                key={option}
                onClick={() => {
                  if (!isMultiple) {
                    onChange(isSelected ? "" : option);
                    return;
                  }
                  onChange(isSelected ? selected.filter((o) => o !== option) : [...selected, option]);
                }}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap",
                  isSelected
                    ? "bg-text-primary text-surface-white border-text-primary"
                    : "bg-surface-white text-text-secondary border-surface-200 hover:border-surface-300"
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const unit = field.type === "number" ? field.unit : null;
  const unitPosition = field.type === "number" ? field.unit_position ?? "prefix" : null;

  return (
    <div className={wideClass}>
      <label className="block text-[11px] font-semibold text-text-secondary mb-1.5 leading-tight">
        {field.label}
      </label>
      <div className="flex items-center border border-surface-200 rounded-lg bg-surface-white overflow-hidden focus-within:ring-2 focus-within:ring-brand-accent/20 focus-within:border-brand-accent/50">
        {unit && unitPosition === "prefix" && (
          <span className="text-xs text-text-tertiary px-2.5 bg-surface-50 border-r border-surface-200 self-stretch flex items-center whitespace-nowrap">
            {unit}
          </span>
        )}
        <input
          type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? undefined}
          className="w-full px-2.5 py-1.5 text-xs text-text-primary bg-transparent outline-none placeholder:text-text-tertiary"
        />
        {unit && unitPosition === "suffix" && (
          <span className="text-xs text-text-tertiary px-2.5 bg-surface-50 border-l border-surface-200 self-stretch flex items-center whitespace-nowrap">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AuditStep({
  auditResult,
  onConfirm,
  isConfirming,
  onGenerateQuickFill,
  isGeneratingQuickFill,
  hasQuickFillGenerateError,
  onSaveQuickFillAnswers,
  isSavingQuickFill,
}: Props) {
  // Draft edits before "Simpan" — seeded from the server's persisted answers
  // (auditResult.quick_fill[category].answers) the first time a category is
  // touched, so reopening an already-answered category shows its real values.
  const [draftAnswers, setDraftAnswers] = useState<Record<string, QuickFillAnswers>>({});
  const [dirtyCategories, setDirtyCategories] = useState<Set<string>>(new Set());
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const detailsRefs = useRef<Record<string, HTMLDetailsElement | null>>({});

  const byCategory = useMemo(() => {
    const map = new Map<string, ContentMapItem>();
    for (const item of auditResult.content_map) map.set(item.category, item);
    return map;
  }, [auditResult.content_map]);

  const missingItems = auditResult.content_map.filter((i) => i.status === "missing");

  const firstIncompleteCategory = useMemo(() => {
    for (const block of BLOCKS) {
      const items = block.categories
        .map((c) => byCategory.get(c))
        .filter((i): i is ContentMapItem => !!i)
        .sort((a, b) => (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1));
      const incomplete = items.find((i) => i.status !== "provided");
      if (incomplete) return incomplete.category;
    }
    return null;
  }, [byCategory]);

  const answersFor = (category: string): QuickFillAnswers =>
    draftAnswers[category] ?? (auditResult.quick_fill?.[category]?.answers as QuickFillAnswers | undefined) ?? {};

  const updateField = (category: string, key: string, value: string | string[]) => {
    setDirtyCategories((prev) => new Set(prev).add(category));
    setDraftAnswers((prev) => ({
      ...prev,
      [category]: { ...answersFor(category), [key]: value },
    }));
  };

  // Generate fields the first time a category's quick-fill panel is opened;
  // no-op if already generated (backend also caches, this just avoids the
  // extra round-trip) or currently failed-and-not-yet-retried by the user.
  const handleQuickFillToggle = (category: string) => (e: SyntheticEvent<HTMLDetailsElement>) => {
    if (!e.currentTarget.open) return;
    const state = auditResult.quick_fill?.[category];
    if (!state || (state.fields.length === 0 && !state.generated_at)) {
      onGenerateQuickFill(category);
    }
  };

  const scrollToFirstIncomplete = () => {
    if (!firstIncompleteCategory) return;
    const details = detailsRefs.current[firstIncompleteCategory];
    if (details) details.open = true;
    rowRefs.current[firstIncompleteCategory]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // The audit LLM call can fail silently server-side (caught exception ->
  // empty content_map persisted as-is). An empty array is not the same as
  // "all categories complete" — surface it as a failure, not green pills.
  if (auditResult.content_map.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl bg-red-500/5 border border-red-500/10">
        <XCircle className="w-10 h-10 text-red-500 mb-4" />
        <p className="text-sm font-semibold text-text-primary mb-1">Audit gagal dijalankan</p>
        <p className="text-xs text-text-tertiary text-center max-w-md">
          Sistem tidak berhasil menganalisis data untuk plan ini, jadi tidak ada kategori yang bisa
          ditampilkan. Buat ulang Marketing Plan dari rekomendasi yang sama untuk mencoba lagi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Readiness strip */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {BLOCKS.map((block) => {
          const items = block.categories
            .map((c) => byCategory.get(c))
            .filter((i): i is ContentMapItem => !!i);
          const missingCount = items.filter((i) => i.status === "missing").length;
          const partialCount = items.filter((i) => i.status === "partial").length;
          const worst = missingCount > 0 ? "missing" : partialCount > 0 ? "partial" : "provided";
          const summary =
            missingCount === 0 && partialCount === 0
              ? "Lengkap"
              : [missingCount > 0 && `${missingCount} kosong`, partialCount > 0 && `${partialCount} sebagian`]
                  .filter(Boolean)
                  .join(", ");
          return (
            <div
              key={block.title}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-surface-200 bg-surface-white text-xs font-semibold"
            >
              <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_CONFIG[worst].dot)} />
              <span className="text-text-primary">{block.title}</span>
              <span className="text-text-tertiary font-normal">— {summary}</span>
            </div>
          );
        })}
      </div>

      {/* Blocks */}
      {BLOCKS.map((block) => {
        const items = block.categories
          .map((c) => byCategory.get(c))
          .filter((i): i is ContentMapItem => !!i)
          .sort((a, b) => (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1));

        if (items.length === 0) return null;

        const missingCount = items.filter((i) => i.status === "missing").length;
        const partialCount = items.filter((i) => i.status === "partial").length;

        return (
          <div
            key={block.title}
            className="bg-surface-white rounded-xl border border-surface-100 overflow-hidden shadow-card"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-100 flex-wrap">
              <div className="flex items-baseline gap-2.5">
                <h3 className="text-sm font-bold text-text-primary">{block.title}</h3>
                <span className="text-xs text-text-tertiary">{block.subtitle}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {missingCount === 0 && partialCount === 0 ? (
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-full",
                      STATUS_CONFIG.provided.bg,
                      STATUS_CONFIG.provided.text
                    )}
                  >
                    {items.length} lengkap
                  </span>
                ) : (
                  <>
                    {missingCount > 0 && (
                      <span
                        className={cn(
                          "text-[11px] font-bold px-2.5 py-1 rounded-full",
                          STATUS_CONFIG.missing.bg,
                          STATUS_CONFIG.missing.text
                        )}
                      >
                        {missingCount} kosong
                      </span>
                    )}
                    {partialCount > 0 && (
                      <span
                        className={cn(
                          "text-[11px] font-bold px-2.5 py-1 rounded-full",
                          STATUS_CONFIG.partial.bg,
                          STATUS_CONFIG.partial.text
                        )}
                      >
                        {partialCount} sebagian
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="divide-y divide-surface-50">
              {items.map((item) => {
                const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.missing;
                const Icon = config.icon;
                const quickFillState = auditResult.quick_fill?.[item.category];
                const fields = quickFillState?.fields ?? [];
                const answers = answersFor(item.category);
                const hasAnswers = Object.values(answers).some(
                  (v) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
                );
                const isGenerating = isGeneratingQuickFill(item.category);
                const isSaving = isSavingQuickFill(item.category);
                // Two distinct failure modes collapse into the same retry UI:
                // the agent call completing but returning no fields (server
                // still sets generated_at), and the request itself failing
                // (network/404/500 — never reaches the server at all).
                const hasFailed =
                  !isGenerating &&
                  ((!!quickFillState?.generated_at && fields.length === 0) ||
                    hasQuickFillGenerateError(item.category));
                const saved = !!quickFillState?.saved_at && !dirtyCategories.has(item.category);

                return (
                  <div
                    key={item.category}
                    ref={(el) => {
                      rowRefs.current[item.category] = el;
                    }}
                    className={cn(
                      "grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3 sm:gap-4 px-5 py-4",
                      item.status === "missing" && "bg-red-500/[0.03]",
                      item.status === "partial" && "bg-amber-500/[0.03]"
                    )}
                  >
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold text-text-primary">{item.category}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide",
                          config.bg,
                          config.text
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-text-secondary leading-relaxed">{item.detail}</p>

                      {item.status !== "provided" && (
                        <details
                          className="group mt-2.5"
                          ref={(el) => {
                            detailsRefs.current[item.category] = el;
                          }}
                          onToggle={handleQuickFillToggle(item.category)}
                        >
                          <summary
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-bold text-brand-accent cursor-pointer select-none",
                              "list-none [&::-webkit-details-marker]:hidden"
                            )}
                          >
                            <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180" />
                            Isi cepat
                          </summary>
                          <div className="mt-2.5 bg-surface-50/60 border border-surface-100 rounded-lg p-3.5 space-y-3">
                            {isGenerating ? (
                              <div className="flex items-center gap-2 text-xs text-text-tertiary py-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Menyusun pertanyaan berdasarkan temuan ini...
                              </div>
                            ) : hasFailed ? (
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[11px] text-red-500">Gagal memuat pertanyaan.</span>
                                <button
                                  type="button"
                                  onClick={() => onGenerateQuickFill(item.category)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-white transition-colors"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Coba lagi
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-wrap gap-3">
                                  {fields.map((field) => (
                                    <QuickFillInput
                                      key={field.key}
                                      field={field}
                                      value={answers[field.key]}
                                      onChange={(v) => updateField(item.category, field.key, v)}
                                    />
                                  ))}
                                </div>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-[11px] text-text-tertiary">
                                    {saved ? "Tersimpan." : "Belum tersimpan."}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={!hasAnswers || isSaving}
                                    onClick={() => {
                                      onSaveQuickFillAnswers(item.category, answers);
                                      setDirtyCategories((prev) => {
                                        const next = new Set(prev);
                                        next.delete(item.category);
                                        return next;
                                      });
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-text-primary text-surface-white hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
                                  >
                                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Simpan
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Confirm / footer

          Deliberately NOT gated on auditResult.confirmed_at: that field can
          be set by the backend before the follow-up step (generate first
          clarification question + advance plan.status) finishes. If that
          follow-up fails, confirmed_at stays true forever while status stays
          "audit" -- this component keeps rendering (parent switches away
          only once status actually advances), so the button must stay
          clickable or the user is stuck with no way to retry. */}
      {missingItems.length > 0 ? (
        <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-white border border-surface-100 rounded-xl px-5 py-4 shadow-card">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-red-500">
                {missingItems.length} kategori kritis belum lengkap: {missingItems.map((i) => i.category).join(", ")}
              </p>
              <p className="text-[11.5px] text-text-tertiary mt-0.5">
                Melanjutkan sekarang akan menghasilkan Recommendation yang generik di area ini.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onConfirm}
              disabled={isConfirming}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg border border-surface-200 text-text-secondary hover:bg-surface-50 disabled:opacity-60 transition-colors"
            >
              {isConfirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Lanjut tetap
            </button>
            <button
              onClick={scrollToFirstIncomplete}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg bg-gradient-to-r from-brand-accent to-red-600 text-white hover:shadow-lg transition-shadow"
            >
              Lengkapi dulu
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end pt-2">
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-200",
              "bg-gradient-to-r from-brand-accent to-red-600",
              "hover:shadow-xl hover:-translate-y-0.5",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            )}
          >
            {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isConfirming ? "Confirming..." : "Confirm & Proceed"}
          </button>
        </div>
      )}
    </div>
  );
}
